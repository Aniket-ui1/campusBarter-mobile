// backend/src/socket.ts
// ─────────────────────────────────────────────────────────────
// CampusBarter — Socket.io WebSocket server
// Attaches to the same HTTP server as Express (same port).
// Auth: every connection must pass a valid Azure AD JWT.
// Rooms: each chat room = chatId string.
// ─────────────────────────────────────────────────────────────

import { Server as SocketServer, Socket } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// ── JWKS client (same config as auth middleware) ──────────────
const client = jwksClient({
    jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/discovery/v2.0/keys`,
    cache: true,
    rateLimit: true,
});

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
    const io = new SocketServer(httpServer, {
        cors: {
            origin: [
                'https://campusbarter.azurestaticapps.net',
                'exp://*',
            ],
            methods: ['GET', 'POST'],
        },
        // Allow 1MB payloads (same limit as REST API)
        maxHttpBufferSize: 1e6,
    });

    // ── Authentication middleware (runs on every connect) ─────
    // Rejects any connection that doesn't send a valid Bearer token
    io.use(async (socket: AuthenticatedSocket, next) => {
        try {
            const token = (socket.handshake.auth as Record<string, string>)?.token
                ?? socket.handshake.headers?.authorization?.replace('Bearer ', '');

            if (!token) {
                return next(new Error('Authentication required'));
            }

            // Decode header to get kid (key ID) for JWKS lookup
            const decoded = jwt.decode(token, { complete: true });
            if (!decoded || typeof decoded === 'string') {
                return next(new Error('Invalid token format'));
            }

            const signingKey = await getSigningKey(decoded.header);
            const payload = jwt.verify(token, signingKey, {
                audience: process.env.AZURE_AD_CLIENT_ID,
                issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
            }) as Record<string, string>;

            // Enforce SAIT email
            const email = payload.preferred_username || payload.email || '';
            if (!email.endsWith('@sait.ca') && !email.endsWith('@edu.sait.ca')) {
                return next(new Error('Access restricted to SAIT users'));
            }

            // Attach user info to socket for use in event handlers
            socket.userId = payload.oid;
            socket.displayName = payload.name;
            next();
        } catch {
            next(new Error('Invalid or expired token'));
        }
    });

    // ── Connection handler ─────────────────────────────────────
    io.on('connection', (socket: AuthenticatedSocket) => {
        console.log(`[Socket] Connected: ${socket.userId} (${socket.displayName})`);

        // Join a chat room — client sends { chatId }
        socket.on('joinChat', (chatId: string) => {
            if (!chatId?.trim()) return;
            socket.join(chatId);
            console.log(`[Socket] ${socket.userId} joined chat ${chatId}`);
        });

        // Leave a chat room — client sends { chatId }
        socket.on('leaveChat', (chatId: string) => {
            if (!chatId?.trim()) return;
            socket.leave(chatId);
        });

        // Typing indicator — broadcast to everyone else in the room
        socket.on('typing', (chatId: string) => {
            socket.to(chatId).emit('typing', {
                userId: socket.userId,
                displayName: socket.displayName,
            });
        });

        // Stop typing — broadcast to everyone else in the room
        socket.on('stop_typing', (chatId: string) => {
            socket.to(chatId).emit('stop_typing', { userId: socket.userId });
        });

        socket.on('disconnect', () => {
            console.log(`[Socket] Disconnected: ${socket.userId}`);
        });
    });

    return io;
}
