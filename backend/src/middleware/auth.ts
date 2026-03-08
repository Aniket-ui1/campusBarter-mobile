// backend/src/middleware/auth.ts
// ─────────────────────────────────────────────────────────────
// Azure AD JWT token verification middleware.
// Every API request must include: Authorization: Bearer <token>
// Token is issued by Azure AD after Microsoft login.
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Azure AD JWKS endpoint — fetches public keys to verify tokens
const client = jwksClient({
    jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/discovery/v2.0/keys`,
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
    // In non-production, allow x-dev-user-id header to skip JWT.
    // Also allow "Bearer dev-<userId>" format for mock tokens.
    if (process.env.NODE_ENV !== 'production') {
        const devUserId = req.headers['x-dev-user-id'] as string | undefined;
        if (devUserId) {
            req.user = {
                id: devUserId,
                email: (req.headers['x-dev-email'] as string) || `${devUserId}@edu.sait.ca`,
                displayName: (req.headers['x-dev-name'] as string) || 'Dev User',
                role: ((req.headers['x-dev-role'] as string) || 'Student') as 'Student' | 'Moderator' | 'Admin',
            };
            return next();
        }

        // Allow "Bearer dev-<id>" mock tokens
        if (authHeader?.startsWith('Bearer dev-')) {
            const mockId = authHeader.slice(11); // after "Bearer dev-"
            req.user = {
                id: mockId,
                email: `${mockId}@edu.sait.ca`,
                displayName: 'Dev User',
                role: 'Student',
            };
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
            issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
        },
        (err, decoded) => {
            if (err) {
                res.status(401).json({ error: 'Invalid or expired token' });
                return;
            }

            const payload = decoded as Record<string, string>;

            // Enforce SAIT email domain
            const email = payload.preferred_username || payload.email || '';
            if (!email.endsWith('@sait.ca') && !email.endsWith('@edu.sait.ca')) {
                res.status(403).json({ error: 'Access restricted to SAIT students' });
                return;
            }

            req.user = {
                id: payload.oid,          // Azure AD Object ID
                email: email,
                displayName: payload.name,
                role: (payload['campusbarter_role'] as 'Student' | 'Moderator' | 'Admin') ?? 'Student',
            };

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
