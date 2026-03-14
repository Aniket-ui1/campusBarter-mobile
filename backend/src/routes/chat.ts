// backend/src/routes/chat.ts
// ─────────────────────────────────────────────────────────────
// CampusBarter — Chat System v2
// Clean conversation-per-user-pair model, no Listings FK constraint.
// All endpoints require a valid CIAM JWT via verifyAzureAdToken.
// ─────────────────────────────────────────────────────────────

import crypto from 'crypto';
import { Application, Request, Response, Router } from 'express';
import { body, param, query } from 'express-validator';
import sql from 'mssql';
import { getPool } from '../db';
import { verifyAzureAdToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { notifyOtherParticipant } from '../services/pushService';
import { isUserOnline } from '../socket';
import { getIO } from '../socketInstance';

const router = Router();
router.use(verifyAzureAdToken);

// ── Helper: deterministic conversationId from two CIAM OIDs ──
function buildConvId(oid1: string, oid2: string): string {
    return [oid1, oid2].sort().join('_');
}

// ── POST /api/chat/conversations ─────────────────────────────
// Find-or-create a conversation between two users.
// Frontend never sends currentUserId — always comes from JWT.
router.post('/conversations',
    validate([
        body('otherUserId')
            .trim().notEmpty().withMessage('otherUserId is required')
            .isLength({ max: 200 }).withMessage('otherUserId too long'),
    ]),
    async (req: Request, res: Response) => {
        const currentUserId = req.user!.id;
        const otherUserId = String(req.body.otherUserId).trim();

        if (otherUserId === currentUserId) {
            res.status(400).json({ error: 'Cannot start a conversation with yourself' });
            return;
        }

        const convId = buildConvId(currentUserId, otherUserId);

        try {
            const db = await getPool();

            const existing = await db.request()
                .input('id', sql.NVarChar(300), convId)
                .query('SELECT * FROM Conversations WHERE conversationId = @id');

            if (existing.recordset.length > 0) {
                res.json({ conversation: existing.recordset[0], isNew: false });
                return;
            }

            const [p1, p2] = [currentUserId, otherUserId].sort();
            await db.request()
                .input('id', sql.NVarChar(300), convId)
                .input('p1', sql.NVarChar(128), p1)
                .input('p2', sql.NVarChar(128), p2)
                .query(`
                    INSERT INTO Conversations (conversationId, participant1Id, participant2Id)
                    VALUES (@id, @p1, @p2)
                `);

            const created = await db.request()
                .input('id', sql.NVarChar(300), convId)
                .query('SELECT * FROM Conversations WHERE conversationId = @id');

            res.status(201).json({ conversation: created.recordset[0], isNew: true });
        } catch (e: any) {
            console.error('[Chat] POST /conversations:', e.message);
            res.status(500).json({ error: e.message });
        }
    }
);

// ── GET /api/chat/conversations ───────────────────────────────
// All conversations for the logged-in user, with unread counts.
router.get('/conversations', async (req: Request, res: Response) => {
    const userId = req.user!.id;
    try {
        const db = await getPool();
        const result = await db.request()
            .input('uid', sql.NVarChar(128), userId)
            .query(`
                SELECT
                    c.conversationId,
                    c.participant1Id,
                    c.participant2Id,
                    c.lastMessage,
                    c.lastMessageTime,
                    c.lastSenderId,
                    c.createdAt,
                    u1.displayName AS participant1Name,
                    u1.avatarUrl   AS participant1Avatar,
                    u2.displayName AS participant2Name,
                    u2.avatarUrl   AS participant2Avatar,
                    (
                        SELECT COUNT(*)
                        FROM ConversationMessages m
                        WHERE m.conversationId = c.conversationId
                          AND m.isRead = 0
                          AND m.senderId != @uid
                          AND m.isDeleted = 0
                    ) AS unreadCount
                FROM Conversations c
                JOIN Users u1 ON u1.id = c.participant1Id
                JOIN Users u2 ON u2.id = c.participant2Id
                WHERE (c.participant1Id = @uid OR c.participant2Id = @uid)
                  AND (c.deletedFor NOT LIKE '%' + @uid + '%' OR c.deletedFor = '')
                ORDER BY c.lastMessageTime DESC, c.createdAt DESC
            `);

        const conversations = result.recordset.map((c: Record<string, any>) => {
            const isP1 = c.participant1Id === userId;
            return {
                ...c,
                otherUser: {
                    id:        isP1 ? c.participant2Id     : c.participant1Id,
                    name:      isP1 ? c.participant2Name   : c.participant1Name,
                    avatarUrl: isP1 ? c.participant2Avatar : c.participant1Avatar,
                },
            };
        });

        res.json({ conversations });
    } catch (e: any) {
        console.error('[Chat] GET /conversations:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// ── GET /api/chat/search ──────────────────────────────────────
// Full-text search within user's conversations.
router.get('/search',
    validate([
        query('q')
            .trim().notEmpty().withMessage('q is required')
            .isLength({ max: 200 }).withMessage('q too long'),
    ]),
    async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const q = String(req.query.q).trim();
        try {
            const db = await getPool();
            const result = await db.request()
                .input('uid', sql.NVarChar(128), userId)
                .input('q',   sql.NVarChar(128), `%${q}%`)
                .query(`
                    SELECT TOP 20 m.messageId, m.conversationId, m.senderId,
                                  m.textContent, m.createdAt,
                                  c.participant1Id, c.participant2Id
                    FROM ConversationMessages m
                    JOIN Conversations c ON m.conversationId = c.conversationId
                    WHERE (c.participant1Id = @uid OR c.participant2Id = @uid)
                      AND m.textContent LIKE @q
                      AND m.isDeleted = 0
                    ORDER BY m.createdAt DESC
                `);
            res.json({ results: result.recordset });
        } catch (e: any) {
            console.error('[Chat] GET /search:', e.message);
            res.status(500).json({ error: e.message });
        }
    }
);

// ── GET /api/chat/:convId/search ──────────────────────────────
// Search within a specific conversation.
router.get('/:convId/search',
    validate([
        param('convId').trim().notEmpty(),
        query('q')
            .trim().notEmpty().withMessage('q is required')
            .isLength({ max: 200 }).withMessage('q too long'),
    ]),
    async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const convId = req.params.convId;
        const q = String(req.query.q).trim();

        try {
            const db = await getPool();

            // Verify user is a participant
            const check = await db.request()
                .input('cid', sql.NVarChar(300), convId)
                .input('uid', sql.NVarChar(128), userId)
                .query(`
                    SELECT 1 FROM Conversations
                    WHERE conversationId = @cid
                      AND (participant1Id = @uid OR participant2Id = @uid)
                `);

            if (check.recordset.length === 0) {
                res.status(403).json({ error: 'Forbidden' });
                return;
            }

            // Search within this conversation
            const result = await db.request()
                .input('cid', sql.NVarChar(300), convId)
                .input('q',   sql.NVarChar(128), `%${q}%`)
                .query(`
                    SELECT m.messageId, m.conversationId, m.senderId,
                           m.textContent, m.createdAt,
                           COALESCE(u.displayName, m.senderId) AS senderName
                    FROM ConversationMessages m
                    LEFT JOIN Users u ON u.id = m.senderId
                    WHERE m.conversationId = @cid
                      AND m.textContent LIKE @q
                      AND m.isDeleted = 0
                    ORDER BY m.createdAt DESC
                `);

            res.json({ results: result.recordset });
        } catch (e: any) {
            console.error('[Chat] GET /:convId/search:', e.message);
            res.status(500).json({ error: e.message });
        }
    }
);

// ── POST /api/chat/push-token ─────────────────────────────────
// Register an Expo push token for the current user.
router.post('/push-token',
    validate([
        body('pushToken').trim().notEmpty().withMessage('pushToken is required'),
        body('platform').optional().trim().isIn(['ios','android','web']),
    ]),
    async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { pushToken, platform } = req.body;
        try {
            const db = await getPool();
            await db.request()
                .input('uid',   sql.NVarChar(128), userId)
                .input('token', sql.NVarChar(400), String(pushToken).trim())
                .input('plat',  sql.NVarChar(20),  platform ?? null)
                .query(`
                    IF NOT EXISTS (
                        SELECT 1 FROM UserPushTokens WHERE userId = @uid AND pushToken = @token
                    )
                    INSERT INTO UserPushTokens (userId, pushToken, platform)
                    VALUES (@uid, @token, @plat)
                `);
            res.json({ success: true });
        } catch (e: any) {
            console.error('[Chat] POST /push-token:', e.message);
            res.status(500).json({ error: e.message });
        }
    }
);

// ── GET /api/chat/:convId/messages ────────────────────────────
// Paginated messages — 30 per page, newest first, reversed to oldest-first.
router.get('/:convId/messages',
    validate([
        param('convId').trim().notEmpty(),
        query('page').optional().isInt({ min: 1 }),
    ]),
    async (req: Request, res: Response) => {
        const userId  = req.user!.id;
        const convId  = req.params.convId;
        const page    = Math.max(1, parseInt(String(req.query.page ?? '1')));
        const limit   = 30;
        const offset  = (page - 1) * limit;

        try {
            const db = await getPool();

            // Security: verify requester is a participant
            const check = await db.request()
                .input('cid', sql.NVarChar(300), convId)
                .input('uid', sql.NVarChar(128), userId)
                .query(`
                    SELECT 1 FROM Conversations
                    WHERE conversationId = @cid
                      AND (participant1Id = @uid OR participant2Id = @uid)
                `);
            if (check.recordset.length === 0) {
                res.status(403).json({ error: 'Forbidden' });
                return;
            }

            const result = await db.request()
                .input('cid',    sql.NVarChar(300), convId)
                .input('offset', sql.Int, offset)
                .input('limit',  sql.Int, limit)
                .query(`
                    SELECT m.messageId, m.conversationId, m.senderId,
                           m.messageType, m.textContent, m.mediaUrl, m.mediaName,
                           m.isRead, m.readAt, m.isDeleted, m.createdAt,
                           COALESCE(u.displayName, m.senderId) AS senderName
                    FROM ConversationMessages m
                    LEFT JOIN Users u ON u.id = m.senderId
                    WHERE m.conversationId = @cid AND m.isDeleted = 0
                    ORDER BY m.createdAt DESC
                    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
                `);

            // Return oldest-first for the UI
            res.json({ messages: result.recordset.reverse() });
        } catch (e: any) {
            console.error('[Chat] GET /:convId/messages:', e.message);
            res.status(500).json({ error: e.message });
        }
    }
);

// ── POST /api/chat/:convId/messages ───────────────────────────
router.post('/:convId/messages',
    validate([
        param('convId').trim().notEmpty(),
        body('textContent').if(body('messageType').not().equals('text').not().exists())
            .optional().isLength({ max: 2000 }),
        body('messageType').optional().isIn(['text','image','file']),
        body('mediaUrl').optional().isURL(),
        body('mediaName').optional().isLength({ max: 200 }),
    ]),
    async (req: Request, res: Response) => {
        const senderId  = req.user!.id;
        const convId    = req.params.convId;
        const {
            textContent,
            messageType = 'text',
            mediaUrl,
            mediaName,
        } = req.body;

        if (messageType === 'text' && !textContent?.trim()) {
            res.status(400).json({ error: 'textContent is required for text messages' });
            return;
        }

        try {
            const db = await getPool();

            // Security: verify sender is a participant
            const check = await db.request()
                .input('cid', sql.NVarChar(300), convId)
                .input('uid', sql.NVarChar(128), senderId)
                .query(`
                    SELECT 1 FROM Conversations
                    WHERE conversationId = @cid
                      AND (participant1Id = @uid OR participant2Id = @uid)
                `);
            if (check.recordset.length === 0) {
                res.status(403).json({ error: 'Forbidden' });
                return;
            }

            const messageId = crypto.randomUUID();
            const safeText  = messageType === 'text' ? String(textContent).trim() : null;
            const preview   = messageType === 'text' ? safeText! : '[Image]';

            await db.request()
                .input('mid',   sql.NVarChar(128), messageId)
                .input('cid',   sql.NVarChar(300), convId)
                .input('sid',   sql.NVarChar(128), senderId)
                .input('type',  sql.NVarChar(20),  messageType)
                .input('text',  sql.NVarChar(2000), safeText)
                .input('murl',  sql.NVarChar(500),  mediaUrl  ?? null)
                .input('mname', sql.NVarChar(128),  mediaName ?? null)
                .query(`
                    INSERT INTO ConversationMessages
                        (messageId, conversationId, senderId, messageType, textContent, mediaUrl, mediaName)
                    VALUES (@mid, @cid, @sid, @type, @text, @murl, @mname)
                `);

            // Update conversation preview
            await db.request()
                .input('cid', sql.NVarChar(300), convId)
                .input('msg', sql.NVarChar(500),  preview)
                .input('sid', sql.NVarChar(128),  senderId)
                .query(`
                    UPDATE Conversations
                    SET lastMessage = @msg, lastMessageTime = GETUTCDATE(), lastSenderId = @sid
                    WHERE conversationId = @cid
                `);

            const message = {
                messageId,
                conversationId: convId,
                senderId,
                messageType,
                textContent: safeText,
                mediaUrl:    mediaUrl  ?? null,
                mediaName:   mediaName ?? null,
                isRead:   false,
                createdAt: new Date().toISOString(),
            };

            // Broadcast to all participants in the socket room
            const io = getIO();
            if (io) {
                io.to(convId).emit('receive_message', message);
                io.to(convId).emit('conversation_updated', {
                    conversationId: convId,
                    lastMessage:     preview,
                    lastMessageTime: message.createdAt,
                    lastSenderId:    senderId,
                });
            }

            // Fire-and-forget push notification to offline recipient
            notifyOtherParticipant(convId, senderId, preview, db).catch(console.error);

            res.status(201).json({ message });
        } catch (e: any) {
            console.error('[Chat] POST /:convId/messages:', e.message);
            res.status(500).json({ error: e.message });
        }
    }
);

// ── PUT /api/chat/:convId/read ────────────────────────────────
// Mark all unread messages in a conversation as read.
router.put('/:convId/read',
    validate([param('convId').trim().notEmpty()]),
    async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const convId = req.params.convId;
        try {
            const db = await getPool();
            await db.request()
                .input('cid', sql.NVarChar(300), convId)
                .input('uid', sql.NVarChar(128), userId)
                .query(`
                    UPDATE ConversationMessages
                    SET isRead = 1, readAt = GETUTCDATE()
                    WHERE conversationId = @cid
                      AND senderId != @uid
                      AND isRead = 0
                `);

            // Notify sender their messages were read (via socket)
            const io = getIO();
            if (io) {
                io.to(convId).emit('messages_seen', { conversationId: convId, readByUserId: userId });
            }

            res.json({ success: true });
        } catch (e: any) {
            console.error('[Chat] PUT /:convId/read:', e.message);
            res.status(500).json({ error: e.message });
        }
    }
);

// ── DELETE /api/chat/:convId ──────────────────────────────────
// Soft delete — hides the conversation for the requesting user only.
router.delete('/:convId',
    validate([param('convId').trim().notEmpty()]),
    async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const convId = req.params.convId;
        try {
            const db = await getPool();

            // Verify participant before allowing delete
            const existing = await db.request()
                .input('cid', sql.NVarChar(300), convId)
                .input('uid', sql.NVarChar(128), userId)
                .query(`
                    SELECT deletedFor FROM Conversations
                    WHERE conversationId = @cid
                      AND (participant1Id = @uid OR participant2Id = @uid)
                `);

            if (existing.recordset.length === 0) {
                res.status(403).json({ error: 'Forbidden' });
                return;
            }

            let deletedFor: string = existing.recordset[0]?.deletedFor ?? '';
            if (!deletedFor.split('|').includes(userId)) {
                deletedFor = deletedFor ? `${deletedFor}|${userId}` : userId;
            }

            await db.request()
                .input('cid', sql.NVarChar(300), convId)
                .input('df',  sql.NVarChar(500),  deletedFor)
                .query(`
                    UPDATE Conversations SET deletedFor = @df WHERE conversationId = @cid
                `);

            res.json({ success: true });
        } catch (e: any) {
            console.error('[Chat] DELETE /:convId:', e.message);
            res.status(500).json({ error: e.message });
        }
    }
);

// ── GET /api/chat/status/:userId ──────────────────────────────
// Check if a user is online and when they were last seen.
router.get('/status/:userId',
    validate([param('userId').trim().notEmpty()]),
    async (req: Request, res: Response) => {
        const targetUserId = req.params.userId;
        try {
            const isOnline = isUserOnline(targetUserId);
            
            let lastSeenAt: Date | null = null;
            if (!isOnline) {
                // Fetch lastSeenAt from database
                const db = await getPool();
                const result = await db.request()
                    .input('uid', sql.NVarChar(128), targetUserId)
                    .query(`SELECT lastSeenAt FROM Users WHERE id = @uid`);
                
                if (result.recordset.length > 0) {
                    lastSeenAt = result.recordset[0].lastSeenAt;
                }
            }
            
            res.json({
                isOnline,
                lastSeenAt
            });
        } catch (e: any) {
            console.error('[Chat] GET /status/:userId:', e.message);
            res.status(500).json({ error: e.message });
        }
    }
);

// ── DELETE /api/chat/message/:messageId ───────────────────────
// Delete a message for current user or for everyone.
router.delete('/message/:messageId',
    validate([
        param('messageId').trim().notEmpty(),
        body('deleteForEveryone').optional().isBoolean(),
    ]),
    async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const messageId = req.params.messageId;
        const deleteForEveryone = req.body.deleteForEveryone === true;

        try {
            const db = await getPool();

            // Security: verify the sender is the current user
            const message = await db.request()
                .input('mid', sql.NVarChar(128), messageId)
                .query(`
                    SELECT messageId, conversationId, senderId
                    FROM ConversationMessages
                    WHERE messageId = @mid
                `);

            if (message.recordset.length === 0) {
                res.status(404).json({ error: 'Message not found' });
                return;
            }

            const { conversationId, senderId } = message.recordset[0];
            if (senderId !== userId) {
                res.status(403).json({ error: 'Can only delete your own messages' });
                return;
            }

            // Mark message as deleted
            await db.request()
                .input('mid', sql.NVarChar(128), messageId)
                .query(`
                    UPDATE ConversationMessages
                    SET isDeleted = 1
                    WHERE messageId = @mid
                `);

            // If deleteForEveryone, emit socket event to all participants
            if (deleteForEveryone) {
                const io = getIO();
                if (io) {
                    io.to(conversationId).emit('message_deleted', { messageId, conversationId });
                }
            }

            res.json({ success: true, messageId });
        } catch (e: any) {
            console.error('[Chat] DELETE /message/:messageId:', e.message);
            res.status(500).json({ error: e.message });
        }
    }
);

// ── Register routes on the app ────────────────────────────────
export function registerChatRoutes(app: Application): void {
    app.use('/api/v1/chat', router);
    app.use('/api/chat', router);  // Backward-compatible unversioned path
}
