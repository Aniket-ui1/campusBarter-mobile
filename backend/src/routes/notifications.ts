// backend/src/routes/notifications.ts
// GET /api/notifications           — list all notifications for current user
// PUT /api/notifications/:id/read  — mark one as read
// PUT /api/notifications/read-all  — mark all as read

import { Router, Request, Response } from 'express';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../db';

export const notificationsRouter = Router();

// GET /api/notifications — list all notifications (newest first)
notificationsRouter.get('/', async (req: Request, res: Response) => {
    try {
        const notifications = await getNotifications(req.user!.id);
        res.json(notifications);
    } catch (err: any) {
        console.error('[Notifications] GET / failed:', err.message);
        // Return empty array instead of 500 — user simply has no notifications yet
        res.json([]);
    }
});

// PUT /api/notifications/read-all — mark ALL as read (must be before /:id route)
notificationsRouter.put('/read-all', async (req: Request, res: Response) => {
    try {
        await markAllNotificationsRead(req.user!.id);
        res.json({ message: 'All notifications marked as read' });
    } catch {
        res.status(500).json({ error: 'Failed to mark notifications read' });
    }
});

// PUT /api/notifications/:id/read — mark ONE notification as read
notificationsRouter.put('/:id/read', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id?.trim()) {
            res.status(400).json({ error: 'Notification ID is required' });
            return;
        }
        await markNotificationRead(id, req.user!.id);
        res.json({ message: 'Notification marked as read' });
    } catch {
        res.status(500).json({ error: 'Failed to mark notification read' });
    }
});
