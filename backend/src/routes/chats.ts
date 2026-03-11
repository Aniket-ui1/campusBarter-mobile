import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { getMessages, sendMessage, getChats, createChat } from '../db';
import { getIO } from '../socketInstance';
import { notifySkillRequest, notifyMessage } from '../notifyEvent';

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
        const { listingId, listingTitle, listingOwnerId } = req.body;
        const chatId = await createChat(
            listingId.trim(),
            listingTitle.trim(),
            req.user!.id
        );

        // Notify listing owner that someone requested their skill
        if (listingOwnerId && listingOwnerId !== req.user!.id) {
            notifySkillRequest(
                listingOwnerId,
                req.user!.displayName,
                listingTitle.trim(),
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
            const messages = await getMessages(req.params.chatId);
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
            getIO().to(chatId).emit('new_message', messagePayload);
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
