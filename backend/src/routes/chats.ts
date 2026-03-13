import { Request, Response, Router } from 'express';
import { body, param } from 'express-validator';
import {
    canAccessChat,
    createChat,
    findExistingChatBetweenUsers,
    getChatParticipantIds,
    getChats,
    hideChatForUser,
    getListingById,
    getMessages,
    markChatAsRead,
    sendMessage,
} from '../db';
import { validate } from '../middleware/validate';
import { notifyMessage, notifySkillRequest } from '../notifyEvent';
import { getIO } from '../socketInstance';

export const chatsRouter = Router();

// GET /api/chats — list all chats for the current user
chatsRouter.get('/', async (req: Request, res: Response) => {
    try {
        const chats = await getChats(req.user!.id);
        res.json(chats);
    } catch {
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});

// POST /api/chats — start a new chat on a listing
const createChatRules = [
    body('listingId').trim().notEmpty().withMessage('listingId is required'),
    body('listingTitle').trim().notEmpty().withMessage('listingTitle is required')
        .isLength({ max: 200 }).withMessage('listingTitle max 200 characters'),
    body('listingOwnerId').optional().trim(),
];

chatsRouter.post('/', validate(createChatRules), async (req: Request, res: Response) => {
    try {
        const { listingId, listingTitle } = req.body;
        const normalizedListingId = listingId.trim();
        const normalizedTitle = listingTitle.trim();

        const listing = await getListingById(normalizedListingId);
        if (!listing) {
            res.status(404).json({ error: 'Listing not found' });
            return;
        }

        const listingOwnerId = String((listing as { userId?: string }).userId ?? '');
        if (!listingOwnerId) {
            res.status(400).json({ error: 'Listing owner is missing' });
            return;
        }

        const existingChatId = await findExistingChatBetweenUsers(
            req.user!.id,
            listingOwnerId
        );

        if (existingChatId) {
            await markChatAsRead(existingChatId, req.user!.id);
            res.status(200).json({ id: existingChatId, existing: true });
            return;
        }

        const chatId = await createChat(
            normalizedListingId,
            normalizedTitle,
            req.user!.id,
            listingOwnerId
        );

        // Notify listing owner that someone requested their skill
        if (listingOwnerId !== req.user!.id) {
            notifySkillRequest(
                listingOwnerId,
                req.user!.displayName,
                normalizedTitle,
                chatId
            );
        }

        res.status(201).json({ id: chatId, message: 'Chat created' });
    } catch {
        res.status(500).json({ error: 'Failed to create chat' });
    }
});

// GET /api/chats/:chatId/messages
chatsRouter.get('/:chatId/messages',
    validate([param('chatId').trim().notEmpty().withMessage('chatId is required')]),
    async (req: Request, res: Response) => {
        try {
            const chatId = req.params.chatId;
            const canAccess = await canAccessChat(chatId, req.user!.id);
            if (!canAccess) {
                res.status(403).json({ error: 'Access denied for this chat' });
                return;
            }

            const messages = await getMessages(chatId);
            res.json(messages);
        } catch {
            res.status(500).json({ error: 'Failed to fetch messages' });
        }
    }
);

// POST /api/chats/:chatId/messages — send a message
const sendMessageRules = [
    param('chatId').trim().notEmpty().withMessage('chatId is required'),
    body('text').trim().notEmpty().withMessage('Message cannot be empty')
        .isLength({ max: 4000 }).withMessage('Message max 4000 characters'),
    body('recipientId').optional().trim(),
];

chatsRouter.post('/:chatId/messages', validate(sendMessageRules), async (req: Request, res: Response) => {
    try {
        const { text, recipientId } = req.body;
        const chatId = req.params.chatId;

        const canAccess = await canAccessChat(chatId, req.user!.id);
        if (!canAccess) {
            res.status(403).json({ error: 'Access denied for this chat' });
            return;
        }

        // 1. Save to database
        await sendMessage(chatId, req.user!.id, text);

        // 2. Broadcast to socket room in real time
        const messagePayload = {
            chatId,
            senderId: req.user!.id,
            senderName: req.user!.displayName,
            text,
            sentAt: new Date().toISOString(),
        };
        try {
            const participantIds = await getChatParticipantIds(chatId);
            const io = getIO();
            participantIds
                .filter((participantId) => participantId !== req.user!.id)
                .forEach((participantId) => {
                    io.to(`user:${participantId}`).emit('new_message', messagePayload);
                });
            io.to(chatId).emit('new_message', messagePayload);
        } catch {
            // Socket not yet initialised (e.g. in tests) — safe to skip
        }

        // 3. Notify recipient via DB + push (fire-and-forget)
        if (recipientId && recipientId !== req.user!.id) {
            notifyMessage(recipientId, req.user!.displayName, chatId, text);
        }

        res.status(201).json({ message: 'Sent' });
    } catch {
        res.status(500).json({ error: 'Failed to send message' });
    }
});

chatsRouter.put('/:chatId/read',
    validate([param('chatId').trim().notEmpty().withMessage('chatId is required')]),
    async (req: Request, res: Response) => {
        try {
            const chatId = req.params.chatId;
            const canAccess = await canAccessChat(chatId, req.user!.id);
            if (!canAccess) {
                res.status(403).json({ error: 'Access denied for this chat' });
                return;
            }

            await markChatAsRead(chatId, req.user!.id);
            res.json({ message: 'Conversation marked as read' });
        } catch {
            res.status(500).json({ error: 'Failed to mark conversation as read' });
        }
    }
);

chatsRouter.delete('/:chatId',
    validate([param('chatId').trim().notEmpty().withMessage('chatId is required')]),
    async (req: Request, res: Response) => {
        try {
            const chatId = req.params.chatId;
            const canAccess = await canAccessChat(chatId, req.user!.id);
            if (!canAccess) {
                res.status(403).json({ error: 'Access denied for this chat' });
                return;
            }

            await hideChatForUser(chatId, req.user!.id);
            res.status(204).send();
        } catch {
            res.status(500).json({ error: 'Failed to delete conversation' });
        }
    }
);
