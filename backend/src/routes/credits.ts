// backend/src/routes/credits.ts

import { Request, Response, Router } from 'express';
import { body, query } from 'express-validator';
import sql from 'mssql';
import { getCreditsBalance, getCreditsHistory, getPool, transferCredits } from '../db';
import { validate } from '../middleware/validate';

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

// POST /api/v1/credits/grant-test — Dev-only endpoint to grant test credits
creditsRouter.post('/grant-test',
    validate([body('amount').isInt({ min: 1 }).withMessage('Amount must be a positive integer')]),
    async (req: Request, res: Response) => {
        // Only allow in dev/local environments
        const isDev = process.env.NODE_ENV !== 'production';
        if (!isDev && !req.headers['x-dev-grant-key']) {
            res.status(403).json({ error: 'Test credits can only be granted in development' });
            return;
        }

        try {
            const { amount } = req.body;
            const userId = req.user!.id;
            
            const db = await getPool();
            
            await db.request()
                .input('userId', sql.NVarChar(128), userId)
                .input('amount', sql.Decimal(10, 2), Number(amount))
                .query(`
                    UPDATE Users
                    SET credits = credits + @amount, updatedAt = GETUTCDATE()
                    WHERE id = @userId
                `);
            
            res.json({ message: `${amount} test credits granted to your account` });
        } catch (err) {
            res.status(500).json({ error: 'Failed to grant test credits' });
        }
    }
);
