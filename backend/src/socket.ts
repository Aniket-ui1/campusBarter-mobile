// backend/src/socket.ts
// ─────────────────────────────────────────────────────────────
// CampusBarter — Socket.io WebSocket server
// Attaches to the same HTTP server as Express (same port).
// Auth: every connection must pass a valid Azure AD JWT.
// Rooms: each chat room = chatId string.
// ─────────────────────────────────────────────────────────────

import crypto from 'crypto';
import http from 'http';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import sql from 'mssql';
import { Socket, Server as SocketServer } from 'socket.io';
import { canAccessChat, canAccessConversation, getPool } from './db';

// ── In-memory map of connected users for online status ─────────
const connectedUsers = new Map<string, boolean>();

/** Check access for both v2 Conversations table and legacy Chats table. */
async function canAccess(conversationId: string, userId: string): Promise<boolean> {
    // Try v2 first (Conversations table)
    try {
        const allowed = await canAccessConversation(conversationId, userId);
        if (allowed) return true;
    } catch {
        // v2 table may not exist — fall through to legacy
    }
    // Fall back to legacy (Chats table)
    try {
        return await canAccessChat(conversationId, userId);
    } catch {
        return false;
    }
}

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
    const io = new SocketServer(httpServer, {
        cors: {
            origin: [
                'https://campusbarter.azurestaticapps.net',
                'exp://*',
                /^http:\/\/(localhost|127\.0\.0\.1):\d+$/,  // localhost development
            ],
            methods: ['GET', 'POST'],
            credentials: true,
        },
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
        const userId = socket.userId;
        console.log(`[Socket] Connected: ${userId} (${socket.displayName})`);
        
        if (!userId) {
            console.warn('[Socket] Connection rejected: no userId');
            socket.disconnect();
            return;
        }

        try {
            socket.join(`user:${userId}`);
            
            // ── Track online status and update lastSeenAt ────────
            connectedUsers.set(userId, true);
            console.log(`[Socket] Marked ${userId} as online. Total online: ${connectedUsers.size}`);
            
            try {
                const db = await getPool();
                await db.request()
                    .input('uid', sql.NVarChar(128), userId)
                    .query(`
                        UPDATE Users
                        SET lastSeenAt = GETUTCDATE()
                        WHERE id = @uid
                    `);
                console.log(`[Socket] Updated lastSeenAt for user ${userId}`);
            } catch (e) {
                console.error('[Socket] Failed to update lastSeenAt on connect for', userId, ':', (e as Error).message);
            }
        } catch (e) {
            console.error('[Socket] Connection setup failed:', (e as Error).message);
            socket.disconnect();
            return;
        }

        const joinConversationRoom = async (conversationId: string) => {
            try {
                if (!conversationId?.trim()) return;
                const allowed = await canAccess(conversationId, socket.userId!);
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
                console.log(`[Socket] Typing event from ${socket.userId} in conversation ${conversationId}`);
                const allowed = await canAccess(conversationId, socket.userId!);
                if (!allowed) {
                    console.log(`[Socket] Typing access denied for ${socket.userId} in ${conversationId}`);
                    return;
                }
                const payload = {
                    conversationId,
                    userId: socket.userId,
                    displayName: socket.displayName,
                };
                console.log(`[Socket] Broadcasting typing from ${socket.displayName} to room ${conversationId}`);
                socket.to(conversationId).emit('typing', payload);
                socket.to(conversationId).emit('user_typing', payload);
            } catch (e) {
                console.error('[Socket] Typing event error:', (e as Error).message);
            }
        });

        // Send a message over socket AND save it to the DB (saving API POST call)
        socket.on('send_message', async (data: { conversationId?: string; text?: string; tempId?: string }, callback?: (response: any) => void) => {
            const conversationId = data?.conversationId?.trim();
            const textContent = data?.text?.trim();

            if (!conversationId || !textContent) {
                if (callback) callback({ error: 'Missing conversationId or text' });
                socket.emit('message_send_error', { error: 'Missing conversationId or text', tempId: data?.tempId });
                return;
            }

            try {
                const allowed = await canAccess(conversationId, socket.userId!);
                if (!allowed) {
                    if (callback) callback({ error: 'Forbidden' });
                    socket.emit('message_send_error', { error: 'Forbidden', tempId: data?.tempId });
                    return;
                }

                const db = await getPool();
                const messageId = crypto.randomUUID();
                const safeText = textContent;

                await db.request()
                    .input('mid', sql.NVarChar(128), messageId)
                    .input('cid', sql.NVarChar(300), conversationId)
                    .input('sid', sql.NVarChar(128), socket.userId!)
                    .input('type', sql.NVarChar(20), 'text')
                    .input('text', sql.NVarChar(2000), safeText)
                    .query(`
                        INSERT INTO ConversationMessages
                            (messageId, conversationId, senderId, messageType, textContent)
                        VALUES (@mid, @cid, @sid, @type, @text)
                    `);

                await db.request()
                    .input('cid', sql.NVarChar(300), conversationId)
                    .input('msg', sql.NVarChar(500), safeText)
                    .input('sid', sql.NVarChar(128), socket.userId!)
                    .query(`
                        UPDATE Conversations
                        SET lastMessage = @msg, lastMessageTime = GETUTCDATE(), lastSenderId = @sid
                        WHERE conversationId = @cid
                    `);

                const message = {
                    messageId,
                    conversationId,
                    senderId: socket.userId!,
                    senderName: socket.displayName,
                    messageType: 'text',
                    textContent: safeText,
                    mediaUrl: null,
                    mediaName: null,
                    replyToMessageId: null,
                    isRead: false,
                    createdAt: new Date().toISOString(),
                };

                // Acknowledge the sender via callback (if supported)
                if (callback) callback({ message, tempId: data.tempId });

                // Also emit directly to sender (reliable — doesn't depend on ack callbacks)
                socket.emit('message_sent', { message, tempId: data.tempId });

                // Broadcast to others
                socket.to(conversationId).emit('receive_message', message);
                socket.to(conversationId).emit('conversation_updated', {
                    conversationId,
                    lastMessage: safeText,
                    lastMessageTime: message.createdAt,
                    lastSenderId: socket.userId!,
                });

            } catch (e: any) {
                console.error('[Socket] send_message error:', e.message);
                if (callback) callback({ error: e.message });
                socket.emit('message_send_error', { error: e.message, tempId: data.tempId });
            }
        });

        // Mark messages as read entirely via Socket to save API PUT calls
        socket.on('mark_read', async (data: { conversationId?: string }) => {
            const conversationId = data?.conversationId?.trim();
            if (!conversationId) return;

            try {
                const allowed = await canAccess(conversationId, socket.userId!);
                if (!allowed) return;

                const db = await getPool();
                await db.request()
                    .input('cid', sql.NVarChar(300), conversationId)
                    .input('uid', sql.NVarChar(128), socket.userId!)
                    .query(`
                        UPDATE ConversationMessages
                        SET isRead = 1, readAt = GETUTCDATE()
                        WHERE conversationId = @cid
                          AND senderId != @uid
                          AND isRead = 0
                    `);

                // Notify sender their messages were read
                io.to(conversationId).emit('messages_seen', { conversationId, readByUserId: socket.userId! });
            } catch (e: any) {
                console.error('[Socket] mark_read error:', e.message);
            }
        });

        // Stop typing — broadcast to everyone else in the room
        socket.on('stop_typing', async (conversationId: string) => {
            try {
                if (!conversationId?.trim()) return;
                console.log(`[Socket] Stop typing from ${socket.userId} in conversation ${conversationId}`);
                const allowed = await canAccess(conversationId, socket.userId!);
                if (!allowed) return;
                socket.to(conversationId).emit('stop_typing', { conversationId, userId: socket.userId });
            } catch (e) {
                console.error('[Socket] Stop typing error:', (e as Error).message);
            }
        });

        socket.on('disconnect', async () => {
            const userId = socket.userId;
            console.log(`[Socket] Disconnected: ${userId}`);
            if (userId) {
                connectedUsers.delete(userId);
                console.log(`[Socket] Marked ${userId} as offline. Total online: ${connectedUsers.size}`);
                try {
                    const db = await getPool();
                    await db.request()
                        .input('uid', sql.NVarChar(128), userId)
                        .query(`
                            UPDATE Users
                            SET lastSeenAt = GETUTCDATE()
                            WHERE id = @uid
                        `);
                    console.log(`[Socket] Updated lastSeenAt on disconnect for user ${userId}`);
                } catch (e) {
                    console.error('[Socket] Failed to update lastSeenAt on disconnect for', userId, ':', (e as Error).message);
                }
            }
        });
    });

    return io;
}
