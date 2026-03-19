// backend/src/socket.ts
// ─────────────────────────────────────────────────────────────
// CampusBarter — Socket.io WebSocket server
// Attaches to the same HTTP server as Express (same port).
// Auth: every connection must pass a valid Azure AD JWT.
// Rooms: each chat room = chatId string.
// ─────────────────────────────────────────────────────────────

import http from 'http';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import sql from 'mssql';
import { Socket, Server as SocketServer } from 'socket.io';
import { canAccessChat, getPool } from './db';

// ── In-memory map of connected users for online status ─────────
const connectedUsers = new Map<string, boolean>();

/** Check if a user is currently online (has an active socket connection). */
export function isUserOnline(userId: string): boolean {
    return connectedUsers.has(userId);
}

// ── JWKS client — must match auth.ts (CIAM tenant, NOT login.microsoftonline.com) ──
const TENANT_ID = process.env.AZURE_AD_TENANT_ID ?? '';
const CIAM_AUTHORITY = process.env.AZURE_AD_CIAM_AUTHORITY ?? `${TENANT_ID}.ciamlogin.com`;
const TOKEN_ISSUER = `https://${TENANT_ID}.ciamlogin.com/${TENANT_ID}/v2.0`;

const client = jwksClient({
    jwksUri: `https://${CIAM_AUTHORITY}/${TENANT_ID}/discovery/v2.0/keys`,
    cache: true,
    rateLimit: true,
});

const DEV_AUTH_ENABLED = process.env.ALLOW_DEV_AUTH === 'true';

function getSigningKey(header: jwt.JwtHeader): Promise<string> {
    return new Promise((resolve, reject) => {
        client.getSigningKey(header.kid!, (err, key) => {
            if (err) return reject(err);
            resolve(key!.getPublicKey());
        });
    });
}

// ── Extended socket type with user info ───────────────────────
interface AuthenticatedSocket extends Socket {
    userId?: string;
    displayName?: string;
}

// ── Initialise Socket.io ──────────────────────────────────────
export function initSocketServer(httpServer: http.Server): SocketServer {
    const allowedOrigins: Array<string | RegExp> = [
        'https://campusbarter.azurestaticapps.net',
    ];

    // Allow localhost in development
    if (process.env.NODE_ENV === 'development' || process.env.ALLOW_LOCALHOST === 'true') {
        allowedOrigins.push('http://localhost:8081');
        allowedOrigins.push('http://localhost:8082');
        allowedOrigins.push('http://localhost:8083');
        allowedOrigins.push('http://localhost:3000');
        allowedOrigins.push(/^http:\/\/localhost:\d+$/);  // Any localhost port
        allowedOrigins.push(/^http:\/\/192\.168\.\d+\.\d+:\d+$/);  // Local network
        allowedOrigins.push(/^exp:\/\/.*/);  // Expo Go
    } else {
        // Production still allows Expo Go
        allowedOrigins.push(/^exp:\/\/.*/);
    }
    
    const io = new SocketServer(httpServer, {
        cors: {
            origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
                // Allow requests with no origin (mobile apps, Postman)
                if (!origin) return callback(null, true);

                // Check against allowed origins
                const allowed = allowedOrigins.some((pattern: string | RegExp) => {
                    if (typeof pattern === 'string') {
                        if (pattern.includes('*')) {
                            // Convert wildcard to regex
                            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                            return regex.test(origin);
                        }
                        return pattern === origin;
                    }
                    // pattern is RegExp
                    return (pattern as RegExp).test(origin);
                });

                callback(null, allowed);
            },
            methods: ['GET', 'POST'],
            credentials: true,
        },
        // Force WebSocket transport (no polling fallback)
        transports: ['websocket', 'polling'],
        // Try WebSocket upgrade immediately
        allowUpgrades: true,
        // Allow 1MB payloads (same limit as REST API)
        maxHttpBufferSize: 1e6,
    });

    // ── Authentication middleware (runs on every connect) ─────
    io.use(async (socket: AuthenticatedSocket, next) => {
        try {
            const token = (socket.handshake.auth as Record<string, string>)?.token
                ?? socket.handshake.headers?.authorization?.replace('Bearer ', '');

            if (!token) {
                return next(new Error('Authentication required'));
            }

            // ── Dev bypass — matches REST middleware in auth.ts ────
            if (DEV_AUTH_ENABLED) {
                if (token.startsWith('dev-') || token.startsWith('mock-')) {
                    const mockId = token.replace(/^(dev-|mock-)/, '');
                    socket.userId = mockId || 'mock-user-001';
                    socket.displayName = 'Dev User';
                    return next();
                }
            }

            // ── Production: strict CIAM JWT verification ──────────
            const decoded = jwt.decode(token, { complete: true });
            if (!decoded || typeof decoded === 'string') {
                return next(new Error('Invalid token format'));
            }

            const signingKey = await getSigningKey(decoded.header);
            const payload = jwt.verify(token, signingKey, {
                audience: process.env.AZURE_AD_CLIENT_ID,
                issuer: TOKEN_ISSUER,
            }) as Record<string, string>;

            // CIAM controls who can authenticate — no additional email check needed.
            socket.userId = payload.oid || payload.sub;
            socket.displayName = payload.name || 'User';
            next();
        } catch {
            next(new Error('Invalid or expired token'));
        }
    });

    // ── Connection handler ─────────────────────────────────────
    io.on('connection', async (socket: AuthenticatedSocket) => {
        console.log(`[Socket] Connected: ${socket.userId} (${socket.displayName})`);
        if (socket.userId) {
            socket.join(`user:${socket.userId}`);
            
            // ── Track online status and update lastSeenAt ────────
            connectedUsers.set(socket.userId, true);
            try {
                const db = await getPool();
                await db.request()
                    .input('uid', sql.NVarChar(128), socket.userId)
                    .query(`
                        UPDATE Users
                        SET lastSeenAt = GETUTCDATE()
                        WHERE id = @uid
                    `);
            } catch (e) {
                console.error('[Socket] Failed to update lastSeenAt on connect:', (e as Error).message);
            }
        }

        const joinConversationRoom = async (conversationId: string) => {
            try {
                if (!conversationId?.trim()) return;
                const allowed = await canAccessChat(conversationId, socket.userId!);
                if (!allowed) {
                    socket.emit('socket_error', { message: 'Access denied for this conversation' });
                    return;
                }
                socket.join(conversationId);
                console.log(`[Socket] ${socket.userId} joined conversation ${conversationId}`);
            } catch {
                socket.emit('socket_error', { message: 'Failed to join conversation' });
            }
        };

        socket.on('joinChat', joinConversationRoom);
        socket.on('join_conversation', joinConversationRoom);

        const leaveConversationRoom = (conversationId: string) => {
            if (!conversationId?.trim()) return;
            socket.leave(conversationId);
        };

        socket.on('leaveChat', leaveConversationRoom);
        socket.on('leave_conversation', leaveConversationRoom);

        // Typing indicator — broadcast to everyone else in the room
        socket.on('typing', async (conversationId: string) => {
            try {
                if (!conversationId?.trim()) return;
                const allowed = await canAccessChat(conversationId, socket.userId!);
                if (!allowed) return;
                const payload = {
                    conversationId,
                    userId: socket.userId,
                    displayName: socket.displayName,
                };
                socket.to(conversationId).emit('typing', payload);
                socket.to(conversationId).emit('user_typing', payload);
            } catch {
                // Ignore transient DB errors for typing events.
            }
        });

        socket.on('send_message', async (data: { conversationId?: string; text?: string }) => {
            const conversationId = data?.conversationId?.trim();
            if (!conversationId) return;
            try {
                const allowed = await canAccessChat(conversationId, socket.userId!);
                if (!allowed) return;
                socket.to(conversationId).emit('receive_message', {
                    ...data,
                    conversationId,
                    senderId: socket.userId,
                    senderName: socket.displayName,
                });
            } catch {
                // Ignore transient DB errors for socket-only message fanout.
            }
        });

        // Stop typing — broadcast to everyone else in the room
        socket.on('stop_typing', async (conversationId: string) => {
            try {
                if (!conversationId?.trim()) return;
                const allowed = await canAccessChat(conversationId, socket.userId!);
                if (!allowed) return;
                socket.to(conversationId).emit('stop_typing', { conversationId, userId: socket.userId });
            } catch {
                // Ignore transient DB errors for typing events.
            }
        });

        socket.on('disconnect', async () => {
            console.log(`[Socket] Disconnected: ${socket.userId}`);
            if (socket.userId) {
                connectedUsers.delete(socket.userId);
                try {
                    const db = await getPool();
                    await db.request()
                        .input('uid', sql.NVarChar(128), socket.userId)
                        .query(`
                            UPDATE Users
                            SET lastSeenAt = GETUTCDATE()
                            WHERE id = @uid
                        `);
                } catch (e) {
                    console.error('[Socket] Failed to update lastSeenAt on disconnect:', (e as Error).message);
                }
            }
        });
    });

    return io;
}
