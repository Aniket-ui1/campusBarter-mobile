// backend/src/middleware/auth.ts
// ─────────────────────────────────────────────────────────────
// Azure AD JWT token verification middleware.
// Every API request must include: Authorization: Bearer <token>
// Token is issued by Azure AD after Microsoft login.
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { ensureUserExists } from '../db';

// CIAM JWKS endpoint — Entra External ID (CIAM) uses a separate tenant for identity.
//
// Two-tenant setup (by design):
//   Default tenant   → infrastructure (App Service, SQL, Key Vault)
//   CIAM tenant      → identity (App Registration, users, auth flows)
//
// Token issuer always uses tenant-ID form:
//   ✅ https://{tenantId}.ciamlogin.com/{tenantId}/v2.0
//   ❌ https://campusbarter.ciamlogin.com/{tenantId}/v2.0  (friendly name — wrong for issuer)
const TENANT_ID = process.env.AZURE_AD_TENANT_ID ?? '';
const CIAM_AUTHORITY = process.env.AZURE_AD_CIAM_AUTHORITY ?? `${TENANT_ID}.ciamlogin.com`;
const client = jwksClient({
    jwksUri: `https://${CIAM_AUTHORITY}/${TENANT_ID}/discovery/v2.0/keys`,
    cache: true,
    rateLimit: true,
});

function getSigningKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
    client.getSigningKey(header.kid!, (err, key) => {
        if (err) return callback(err);
        callback(null, key!.getPublicKey());
    });
}

// Extend Express Request type to include user info
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                displayName: string;
                role: 'Student' | 'Moderator' | 'Admin';
            };
        }
    }
}

/**
 * Helper: upsert user row or return 500. Returns true on success.
 * Also overrides req.user.id with the actual DB id — this is critical because
 * mock login generates a different id than Azure AD for the same person.
 * The DB matches on email (UNIQUE) and returns the real id.
 */
async function upsertOrFail(req: Request, res: Response): Promise<boolean> {
    try {
        const dbId = await ensureUserExists(req.user!);
        // Override with the DB's id — may differ from token id (mock vs Azure AD)
        req.user!.id = dbId;
        return true;
    } catch (err: any) {
        console.error('[Auth] ensureUserExists failed — cannot proceed:', err.message);
        res.status(500).json({ error: 'Failed to provision user record. Please try again.' });
        return false;
    }
}

/**
 * Middleware: Verify Azure AD JWT token on every request.
 * Sets req.user if valid. Returns 401 if missing/invalid.
 */
export async function verifyAzureAdToken(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const authHeader = req.headers.authorization;

    // ── Development bypass ────────────────────────────────────
    // When ALLOW_DEV_AUTH=true, allow x-dev-user-id header and mock tokens.
    // Set this in Azure App Service → Configuration → Application Settings for testing.
    // NEVER enable this in actual production!
    if (process.env.ALLOW_DEV_AUTH === 'true' || process.env.NODE_ENV === 'development') {
        const devUserId = req.headers['x-dev-user-id'] as string | undefined;
        if (devUserId) {
            req.user = {
                id: devUserId,
                email: (req.headers['x-dev-email'] as string) || `${devUserId}@edu.sait.ca`,
                displayName: (req.headers['x-dev-name'] as string) || 'Dev User',
                role: ((req.headers['x-dev-role'] as string) || 'Student') as 'Student' | 'Moderator' | 'Admin',
            };
            if (!await upsertOrFail(req, res)) return;
            return next();
        }

        // Allow "Bearer dev-<id>" mock tokens
        if (authHeader?.startsWith('Bearer dev-')) {
            const mockId = authHeader.slice(11);
            req.user = {
                id: mockId,
                email: `${mockId}@edu.sait.ca`,
                displayName: 'Dev User',
                role: 'Student',
            };
            if (!await upsertOrFail(req, res)) return;
            return next();
        }

        // Allow "Bearer mock-<...>" tokens from mock login
        if (authHeader?.startsWith('Bearer mock-')) {
            const mockId = authHeader.slice(12);
            req.user = {
                id: mockId || 'mock-user-001',
                email: 'dev@edu.sait.ca',
                displayName: 'Mock User',
                role: 'Student',
            };
            if (!await upsertOrFail(req, res)) return;
            return next();
        }
    }

    // ── Production: strict Azure AD JWT verification ──────────
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid Authorization header' });
        return;
    }

    const token = authHeader.slice(7);

    jwt.verify(
        token,
        getSigningKey,
        {
            audience: process.env.AZURE_AD_CLIENT_ID,
            // CIAM issuer uses campusbarter.ciamlogin.com, not login.microsoftonline.com
            issuer: `https://${CIAM_AUTHORITY}/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
        },
        async (err, decoded) => {
            if (err) {
                console.error('[Auth] JWT verification failed:', err.message);

                // ── Dev-mode expired-token recovery ───────────────
                if (
                    (process.env.ALLOW_DEV_AUTH === 'true' || process.env.NODE_ENV === 'development') &&
                    err.name === 'TokenExpiredError'
                ) {
                    console.warn('[Auth] ⚠️  Token expired — allowing anyway because ALLOW_DEV_AUTH is enabled');
                    try {
                        const payload = jwt.decode(token) as Record<string, string> | null;
                        if (payload) {
                            const email = payload.preferred_username || payload.email || (payload as any).emails?.[0] || '';
                            req.user = {
                                id: payload.oid || payload.sub,
                                email,
                                displayName: payload.name || payload.given_name || email.split('@')[0] || 'User',
                                role: (payload['campusbarter_role'] as 'Student' | 'Moderator' | 'Admin') ?? 'Student',
                            };
                            if (!await upsertOrFail(req, res)) return;
                            return next();
                        }
                    } catch (decodeErr) {
                        console.error('[Auth] Failed to decode expired token:', decodeErr);
                    }
                }

                res.status(401).json({ error: 'Invalid or expired token', detail: err.message });
                return;
            }

            const payload = decoded as Record<string, string>;

            // Trust any user authenticated through our CIAM tenant.
            // CIAM controls who can sign up/in — no extra domain restriction needed.
            const email = payload.preferred_username || payload.email || payload.emails?.[0] || '';

            req.user = {
                id: payload.oid || payload.sub,   // Azure AD Object ID
                email,
                displayName: payload.name || payload.given_name || email.split('@')[0],
                role: (payload['campusbarter_role'] as 'Student' | 'Moderator' | 'Admin') ?? 'Student',
            };

            // Ensure user row exists in SQL before any FK-constrained insert
            if (!await upsertOrFail(req, res)) return;
            next();
        }
    );
}

/**
 * Middleware: Require a specific role (RBAC enforcement).
 * Must be used AFTER verifyAzureAdToken.
 *
 * Usage: router.delete('/user/:id', verifyAzureAdToken, requireRole('Admin'), handler)
 */
export function requireRole(...roles: Array<'Student' | 'Moderator' | 'Admin'>) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                error: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
            });
            return;
        }
        next();
    };
}
