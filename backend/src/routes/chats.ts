// backend/src/routes/chats.ts
// GET  /api/chats              — list my chats
// POST /api/chats              — start a new chat on a listing
// GET  /api/chats/:id/messages — get messages in a chat
// POST /api/chats/:id/messages — send a message

import { Router, Request, Response } from 'express';
import { getMessages, sendMessage, getChats, createChat } from '../db';

export const chatsRouter = Router();

// GET /api/chats — get all chats the current user is part of
chatsRouter.get('/', async (req: Request, res: Response) => {
    try {
        const chats = await getChats(req.user!.id);
        res.json(chats);
    } catch {
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});

// POST /api/chats — start a new chat on a listing
chatsRouter.post('/', async (req: Request, res: Response) => {
    try {
        const { listingId, listingTitle } = req.body;

        if (!listingId?.trim()) {
            res.status(400).json({ error: 'listingId is required' });
            return;
        }
        if (!listingTitle?.trim() || listingTitle.length > 200) {
            res.status(400).json({ error: 'listingTitle is required (max 200 chars)' });
            return;
        }

        const chatId = await createChat(
            listingId.trim(),
            listingTitle.trim(),
            req.user!.id
        );
        res.status(201).json({ id: chatId, message: 'Chat created' });
    } catch {
        res.status(500).json({ error: 'Failed to create chat' });
    }
});

// GET /api/chats/:chatId/messages — get messages in a specific chat
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
        if (!text?.trim()) {
            res.status(400).json({ error: 'Message cannot be empty' });
            return;
        }
        if (text.length > 4000) {
            res.status(400).json({ error: 'Message too long (max 4000 chars)' });
            return;
        }

        await sendMessage(req.params.chatId, req.user!.id, text);
        res.status(201).json({ message: 'Sent' });
    } catch {
        res.status(500).json({ error: 'Failed to send message' });
    }
});
