// backend/src/routes/chats.ts

import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { getMessages, sendMessage, getChats, createChat, getUserProfile } from '../db';
import { notifyNewMessage } from '../push';
import { io } from '../server';

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
];

chatsRouter.post('/', validate(createChatRules), async (req: Request, res: Response) => {
    try {
        const chatId = await createChat(
            req.body.listingId.trim(),
            req.body.listingTitle.trim(),
            req.user!.id
        );
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
    // Optional: recipientId so we know who to notify
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
        io.to(chatId).emit('new_message', messagePayload);

        // 3. Send push notification to recipient (if offline / not in room)
        if (recipientId) {
            await notifyNewMessage(
                recipientId,
                req.user!.displayName,
                chatId,
                text
            );
        }

        res.status(201).json({ message: 'Sent' });
    } catch {
        res.status(500).json({ error: 'Failed to send message' });
    }
});
