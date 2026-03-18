import { Request, Response, Router } from 'express';
import { body, param, query } from 'express-validator';
import {
    canAccessConversation,
    createChat,
    findExistingChatBetweenUsers,
    getChatParticipantIds,
    getChats,
    getListingById,
    getMessagesPage,
    hideChatForUser,
    markChatAsRead,
    markConversationMessagesAsRead,
    sendMessage
} from '../db';
import { validate } from '../middleware/validate';
import { notifySkillRequest } from '../notifyEvent';
import { getIO } from '../socketInstance';

export const conversationsRouter = Router();

conversationsRouter.post('/', validate([
    body('otherUserId').trim().notEmpty().withMessage('otherUserId is required'),
    body('listingId').optional().trim(),
    body('listingTitle').optional().trim().isLength({ max: 200 }).withMessage('listingTitle max 200 characters'),
]), async (req: Request, res: Response) => {
    try {
        const currentUserId = req.user!.id;
        const otherUserId = String(req.body.otherUserId).trim();
        const listingId = typeof req.body.listingId === 'string' ? req.body.listingId.trim() : '';
        const listingTitle = typeof req.body.listingTitle === 'string' ? req.body.listingTitle.trim() : '';

        if (otherUserId === currentUserId) {
            res.status(400).json({ error: 'Cannot create a conversation with yourself' });
            return;
        }

        const existingConversationId = await findExistingChatBetweenUsers(currentUserId, otherUserId);
        if (existingConversationId) {
            await markChatAsRead(existingConversationId, currentUserId);
            res.status(200).json({ conversationId: existingConversationId, existing: true });
            return;
        }

        let normalizedListingId = listingId;
        let normalizedListingTitle = listingTitle;

        if (listingId) {
            const listing = await getListingById(listingId);
            if (listing) {
                normalizedListingId = listingId;
                normalizedListingTitle = listingTitle || String((listing as { title?: string }).title ?? 'Conversation');
            } else {
                normalizedListingId = '';
                normalizedListingTitle = listingTitle || 'Direct conversation';
            }
        } else {
            normalizedListingId = `direct-${currentUserId}-${otherUserId}`;
            normalizedListingTitle = listingTitle || 'Direct conversation';
        }

        const conversationId = await createChat(
            normalizedListingId,
            normalizedListingTitle,
            currentUserId,
            otherUserId
        );

        notifySkillRequest(
            otherUserId,
            req.user!.displayName,
            normalizedListingTitle,
            conversationId
        );

        res.status(201).json({ conversationId, existing: false });
    } catch {
        res.status(500).json({ error: 'Failed to create conversation' });
    }
});

conversationsRouter.get('/:userId', validate([
    param('userId').trim().notEmpty().withMessage('userId is required'),
]), async (req: Request, res: Response) => {
    try {
        if (req.params.userId !== req.user!.id) {
            res.status(403).json({ error: 'Access denied for this user' });
            return;
        }

        const conversations = await getChats(req.user!.id);
        res.json(conversations.map((conversation) => ({
            ...conversation,
            conversationId: conversation.id,
        })));
    } catch {
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

conversationsRouter.get('/:conversationId/messages', validate([
    param('conversationId').trim().notEmpty().withMessage('conversationId is required'),
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
]), async (req: Request, res: Response) => {
    try {
        const conversationId = req.params.conversationId;
        const allowed = await canAccessConversation(conversationId, req.user!.id);
        if (!allowed) {
            res.status(403).json({ error: 'Access denied for this conversation' });
            return;
        }

        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 30);
        const messages = await getMessagesPage(conversationId, page, limit);
        res.json(messages);
    } catch {
        res.status(500).json({ error: 'Failed to fetch conversation messages' });
    }
});

conversationsRouter.post('/:conversationId/messages', validate([
    param('conversationId').trim().notEmpty().withMessage('conversationId is required'),
    body('text').trim().notEmpty().withMessage('Message cannot be empty').isLength({ max: 4000 }).withMessage('Message max 4000 characters'),
]), async (req: Request, res: Response) => {
    try {
        const conversationId = req.params.conversationId;
        const allowed = await canAccessConversation(conversationId, req.user!.id);
        if (!allowed) {
            res.status(403).json({ error: 'Access denied for this conversation' });
            return;
        }

        const text = String(req.body.text).trim();
        await sendMessage(conversationId, req.user!.id, text);

        const payload = {
            conversationId,
            chatId: conversationId,
            senderId: req.user!.id,
            senderName: req.user!.displayName,
            text,
            sentAt: new Date().toISOString(),
        };

        try {
            const participantIds = await getChatParticipantIds(conversationId);
            const io = getIO();
            participantIds
                .filter((participantId) => participantId !== req.user!.id)
                .forEach((participantId) => {
                    io.to(`user:${participantId}`).emit('new_message', payload);
                });
        } catch {
            // ignore socket failures
        }

        res.status(201).json(payload);
    } catch {
        res.status(500).json({ error: 'Failed to send message' });
    }
});

conversationsRouter.put('/:conversationId/read/:userId', validate([
    param('conversationId').trim().notEmpty().withMessage('conversationId is required'),
    param('userId').trim().notEmpty().withMessage('userId is required'),
]), async (req: Request, res: Response) => {
    try {
        const { conversationId, userId } = req.params;
        if (userId !== req.user!.id) {
            res.status(403).json({ error: 'Access denied for this user' });
            return;
        }
        const allowed = await canAccessConversation(conversationId, req.user!.id);
        if (!allowed) {
            res.status(403).json({ error: 'Access denied for this conversation' });
            return;
        }

        // Mark V2 ConversationMessages as read
        await markConversationMessagesAsRead(conversationId, userId);
        
        // Also mark legacy ChatUserState for backward compatibility
        await markChatAsRead(conversationId, userId);
        
        res.json({ message: 'Conversation marked as read' });
    } catch {
        res.status(500).json({ error: 'Failed to mark conversation as read' });
    }
});

conversationsRouter.delete('/:conversationId/:userId', validate([
    param('conversationId').trim().notEmpty().withMessage('conversationId is required'),
    param('userId').trim().notEmpty().withMessage('userId is required'),
]), async (req: Request, res: Response) => {
    try {
        const { conversationId, userId } = req.params;
        if (userId !== req.user!.id) {
            res.status(403).json({ error: 'Access denied for this user' });
            return;
        }
        const allowed = await canAccessConversation(conversationId, req.user!.id);
        if (!allowed) {
            res.status(403).json({ error: 'Access denied for this conversation' });
            return;
        }

        await hideChatForUser(conversationId, userId);
        res.status(204).send();
    } catch {
        res.status(500).json({ error: 'Failed to delete conversation' });
    }
});
