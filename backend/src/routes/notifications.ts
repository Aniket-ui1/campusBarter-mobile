// backend/src/routes/notifications.ts
// GET /api/notifications           — list all notifications for current user
// PUT /api/notifications/:id/read  — mark one as read
// PUT /api/notifications/read-all  — mark all as read

import { Request, Response, Router } from 'express';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../db';
import { getIO } from '../socket';

export const notificationsRouter = Router();

// GET /api/notifications — list all notifications (newest first)
notificationsRouter.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        console.log('[Notifications] GET / attempt, userId:', userId);
        
        if (!userId?.trim?.()) {
            console.error('[Notifications] GET / missing or empty userId in req.user');
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        
        console.log(`[Notifications] GET / for userId=${userId}`);
        const notifications = await getNotifications(userId);
        console.log(`[Notifications] GET / returning ${notifications.length} notifications`);
        res.json(notifications);
    } catch (err: any) {
        console.error('[Notifications] GET / failed:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to fetch notifications', debug: err.message });
    }
});

// PUT /api/notifications/read-all — mark ALL as read (must be before /:id route)
notificationsRouter.put('/read-all', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        await markAllNotificationsRead(userId);
        
        // 🔥 Emit real-time event so frontend updates immediately
        const io = getIO();
        if (io) {
            io.to(userId).emit('notifications_read_all');
        }
        
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
        const userId = req.user!.id;
        await markNotificationRead(id, userId);
        
        // 🔥 Emit real-time event so frontend updates immediately
        const io = getIO();
        if (io) {
            io.to(userId).emit('notification_read', { notificationId: id });
        }
        
        res.json({ message: 'Notification marked as read' });
    } catch {
        res.status(500).json({ error: 'Failed to mark notification read' });
    }
});
