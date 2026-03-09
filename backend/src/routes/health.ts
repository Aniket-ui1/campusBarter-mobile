// backend/src/routes/health.ts
// Public endpoint — no auth required
// Used by Azure Monitor to check if the API is alive

import { Router, Request, Response } from 'express';
import { getPool } from '../db';

export const healthRouter = Router();

// GET /health — basic liveness check
healthRouter.get('/', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        service: 'campusbarter-api',
        allowDevAuth: process.env.ALLOW_DEV_AUTH === 'true',
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
    });
});

// GET /health/db — checks database connectivity
healthRouter.get('/db', async (_req: Request, res: Response) => {
    try {
        const db = await getPool();
        await db.request().query('SELECT 1 AS alive');
        res.json({
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        res.status(503).json({
            status: 'error',
            database: 'unreachable',
            timestamp: new Date().toISOString(),
        });
    }
});
