// backend/src/routes/credits.ts

import { Router, Request, Response } from 'express';
import { body, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { getCreditsBalance, getCreditsHistory, transferCredits } from '../db';

export const creditsRouter = Router();

// GET /api/credits/balance
creditsRouter.get('/balance', async (req: Request, res: Response) => {
    try {
        const { balance, reserved } = await getCreditsBalance(req.user!.id);
        res.json({ balance, reserved });
    } catch {
        res.status(500).json({ error: 'Failed to fetch credits balance' });
    }
});

// GET /api/credits/history?page=1
creditsRouter.get('/history',
    validate([query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer')]),
    async (req: Request, res: Response) => {
        try {
            const page = Math.max(1, Number(req.query.page) || 1);
            const history = await getCreditsHistory(req.user!.id, page);
            res.json({ page, transactions: history });
        } catch {
            res.status(500).json({ error: 'Failed to fetch credits history' });
        }
    }
);

// POST /api/credits/transfer
const transferRules = [
    body('toUserId').trim().notEmpty().withMessage('toUserId is required'),
    body('amount').isInt({ min: 1 }).withMessage('Amount must be a positive integer'),
    body('reason').trim().notEmpty().withMessage('Reason is required')
        .isLength({ max: 500 }).withMessage('Reason max 500 characters'),
];

creditsRouter.post('/transfer', validate(transferRules), async (req: Request, res: Response) => {
    try {
        const { toUserId, amount, reason } = req.body;

        if (toUserId.trim() === req.user!.id) {
            res.status(400).json({ errors: [{ field: 'toUserId', message: 'Cannot transfer credits to yourself' }] });
            return;
        }

        await transferCredits(req.user!.id, toUserId.trim(), Number(amount), reason.trim());
        res.json({ message: `${amount} credits transferred successfully` });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Transfer failed';
        const status = message === 'Insufficient credits' ? 402 : 500;
        res.status(status).json({ error: message });
    }
});
