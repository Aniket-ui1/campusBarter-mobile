// backend/src/routes/tokens.ts
// POST /api/tokens/push — register an Expo push token for the current user
// The mobile app calls this on login so the server can send push notifications.

import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { savePushToken, saveUserPushToken } from '../db';

export const tokensRouter = Router();

const registerTokenRules = [
    body('token')
        .trim()
        .notEmpty().withMessage('Push token is required')
        .matches(/^ExponentPushToken\[.+\]$/).withMessage('Invalid Expo push token format'),
    body('platform')
        .optional()
        .trim()
        .isIn(['ios', 'android', 'web']).withMessage('platform must be ios, android, or web'),
];

// POST /api/tokens/push
tokensRouter.post('/push', validate(registerTokenRules), async (req: Request, res: Response) => {
    try {
        const token    = req.body.token.trim();
        const platform = req.body.platform?.trim() ?? 'unknown';
        // Write to both tables: legacy (Users.pushToken) and new multi-device (UserPushTokens)
        await savePushToken(req.user!.id, token);
        await saveUserPushToken(req.user!.id, token, platform);
        res.status(201).json({ message: 'Push token registered' });
    } catch {
        res.status(500).json({ error: 'Failed to register push token' });
    }
});
