// backend/src/routes/tokens.ts
// POST /api/tokens/push — register an Expo push token for the current user
// The mobile app calls this on login so the server can send push notifications.

import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { savePushToken } from '../db';

export const tokensRouter = Router();

const registerTokenRules = [
    body('token')
        .trim()
        .notEmpty().withMessage('Push token is required')
        .matches(/^ExponentPushToken\[.+\]$/).withMessage('Invalid Expo push token format'),
];

// POST /api/tokens/push
tokensRouter.post('/push', validate(registerTokenRules), async (req: Request, res: Response) => {
    try {
        await savePushToken(req.user!.id, req.body.token.trim());
        res.status(201).json({ message: 'Push token registered' });
    } catch {
        res.status(500).json({ error: 'Failed to register push token' });
    }
});
