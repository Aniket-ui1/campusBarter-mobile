// backend/src/routes/credits.ts
// GET  /api/credits/balance  — current user's Time Credits balance
// GET  /api/credits/history  — paginated transaction log
// POST /api/credits/transfer — transfer credits to another user (atomic)

import { Router, Request, Response } from 'express';
import { getCreditsBalance, getCreditsHistory, transferCredits } from '../db';

export const creditsRouter = Router();

// GET /api/credits/balance
creditsRouter.get('/balance', async (req: Request, res: Response) => {
    try {
        const balance = await getCreditsBalance(req.user!.id);
        res.json({ userId: req.user!.id, balance });
    } catch {
        res.status(500).json({ error: 'Failed to fetch credits balance' });
    }
});

// GET /api/credits/history?page=1
creditsRouter.get('/history', async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const history = await getCreditsHistory(req.user!.id, page);
        res.json({ page, transactions: history });
    } catch {
        res.status(500).json({ error: 'Failed to fetch credits history' });
    }
});

// POST /api/credits/transfer — transfer credits to another user
creditsRouter.post('/transfer', async (req: Request, res: Response) => {
    try {
        const { toUserId, amount, reason } = req.body;

        // Input validation
        if (!toUserId?.trim()) {
            res.status(400).json({ error: 'toUserId is required' });
            return;
        }
        if (toUserId.trim() === req.user!.id) {
            res.status(400).json({ error: 'Cannot transfer credits to yourself' });
            return;
        }
        const parsedAmount = Number(amount);
        if (!Number.isInteger(parsedAmount) || parsedAmount < 1) {
            res.status(400).json({ error: 'Amount must be a positive whole number' });
            return;
        }
        if (!reason?.trim() || reason.length > 500) {
            res.status(400).json({ error: 'Reason is required (max 500 chars)' });
            return;
        }

        await transferCredits(req.user!.id, toUserId.trim(), parsedAmount, reason.trim());
        res.json({ message: `${parsedAmount} credits transferred successfully` });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Transfer failed';
        // Return 402 for insufficient credits so frontend can handle it specifically
        const status = message === 'Insufficient credits' ? 402 : 500;
        res.status(status).json({ error: message });
    }
});
