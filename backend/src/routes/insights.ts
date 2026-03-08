// backend/src/routes/insights.ts
// Market Insights + Leaderboard + Exchanges API

import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import {
    getWeeklyLeaderboard,
    getMarketInsights,
    createExchange,
    confirmExchange,
} from '../db';

export const insightsRouter = Router();

// GET /api/v1/insights/leaderboard — weekly top helpers
insightsRouter.get('/leaderboard', async (_req: Request, res: Response) => {
    try {
        const leaderboard = await getWeeklyLeaderboard(10);
        res.json(leaderboard);
    } catch {
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// GET /api/v1/insights/market — trending, categories, stats
insightsRouter.get('/market', async (_req: Request, res: Response) => {
    try {
        const insights = await getMarketInsights();
        res.json(insights);
    } catch {
        res.status(500).json({ error: 'Failed to fetch market insights' });
    }
});

// POST /api/v1/insights/exchange — create a QR exchange
const exchangeRules = [
    body('listingId').trim().notEmpty().withMessage('listingId is required'),
    body('sellerId').trim().notEmpty().withMessage('sellerId is required'),
    body('credits').isInt({ min: 1 }).withMessage('Credits must be positive'),
];

insightsRouter.post('/exchange', validate(exchangeRules), async (req: Request, res: Response) => {
    try {
        const { listingId, sellerId, credits } = req.body;
        const qrCode = await createExchange(listingId, req.user!.id, sellerId, Number(credits));
        res.status(201).json({ qrCode });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create exchange';
        res.status(500).json({ error: msg });
    }
});

// POST /api/v1/insights/exchange/confirm — scan QR to confirm
insightsRouter.post('/exchange/confirm', validate([
    body('qrCode').trim().notEmpty().withMessage('qrCode is required'),
]), async (req: Request, res: Response) => {
    try {
        const result = await confirmExchange(req.body.qrCode.trim(), req.user!.id);
        res.json({ message: 'Exchange confirmed', ...result });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to confirm exchange';
        res.status(400).json({ error: msg });
    }
});
