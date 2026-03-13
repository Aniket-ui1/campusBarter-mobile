// backend/src/routes/insights.ts
// Market Insights + Leaderboard + Exchanges API

import { Request, Response, Router } from 'express';
import { body } from 'express-validator';
import {
    confirmExchange,
    createExchange,
    getListingById,
    getMarketInsights,
    getWeeklyLeaderboard,
} from '../db';
import { validate } from '../middleware/validate';

export const insightsRouter = Router();

// GET /api/v1/insights/leaderboard — weekly top helpers
insightsRouter.get('/leaderboard', async (_req: Request, res: Response) => {
    try {
        const leaderboard = await getWeeklyLeaderboard(10);
        res.json(leaderboard);
    } catch (err) {
        console.error('[Insights] Leaderboard error:', err instanceof Error ? err.message : err);
        console.error('[Insights] Leaderboard stack:', err instanceof Error ? err.stack : 'N/A');
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// GET /api/v1/insights/market — trending, categories, stats
insightsRouter.get('/market', async (_req: Request, res: Response) => {
    try {
        const insights = await getMarketInsights();
        res.json(insights);
    } catch (err) {
        console.error('[Insights] Market error:', err instanceof Error ? err.message : err);
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
        const listing = await getListingById(listingId);

        if (!listing) {
            res.status(404).json({ error: 'Listing not found' });
            return;
        }

        if (listing.status !== 'OPEN') {
            res.status(400).json({ error: 'Listing is not open for exchange' });
            return;
        }

        if ((listing.userId as string) !== sellerId) {
            res.status(400).json({ error: 'Seller does not own this listing' });
            return;
        }

        if (req.user!.id === sellerId) {
            res.status(400).json({ error: 'Cannot create an exchange with yourself' });
            return;
        }

        const requestedCredits = Number(credits);
        const listingCredits = Number(listing.credits);
        if (requestedCredits !== listingCredits) {
            res.status(400).json({ error: 'Credits must match the listing value' });
            return;
        }

        const qrCode = await createExchange(listingId, req.user!.id, sellerId, requestedCredits);
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
