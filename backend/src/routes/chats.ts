// backend/src/routes/chats.ts
import { Router, Request, Response } from 'express';
import { getMessages, sendMessage } from '../db';

export const chatsRouter = Router();

// GET /api/chats/:chatId/messages
chatsRouter.get('/:chatId/messages', async (req: Request, res: Response) => {
    try {
        const messages = await getMessages(req.params.chatId);
        res.json(messages);
    } catch {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// POST /api/chats/:chatId/messages — send a message
chatsRouter.post('/:chatId/messages', async (req: Request, res: Response) => {
    try {
        const { text } = req.body;
        if (!text?.trim()) { res.status(400).json({ error: 'Message cannot be empty' }); return; }
        if (text.length > 4000) { res.status(400).json({ error: 'Message too long (max 4000 chars)' }); return; }

        await sendMessage(req.params.chatId, req.user!.id, text);
        res.status(201).json({ message: 'Sent' });
    } catch {
        res.status(500).json({ error: 'Failed to send message' });
    }
});
