// backend/src/routes/exchanges.ts
// Skill Exchange lifecycle: request → accept → confirm → complete
// Auth is applied globally via verifyAzureAdToken in server.ts

import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import {
    acceptSkillExchange, cancelSkillExchange, confirmSkillExchange,
    createSkillExchange, getListingById, getSkillExchangeById,
    getSkillExchanges, raiseDispute,
} from '../db';
import {
    notifyExchangeAccepted, notifyExchangeCancelled, notifyExchangeCompleted,
    notifyExchangeConfirmed, notifyExchangeRequested, notifyDisputeRaised,
} from '../notifyEvent';

export const exchangesRouter = Router();

// POST /api/v1/exchanges — Create exchange request, escrow credits
exchangesRouter.post('/',
    validate([body('listingId').trim().notEmpty().withMessage('listingId is required')]),
    async (req: Request, res: Response) => {
        try {
            const { listingId } = req.body;
            const requesterId = req.user!.id;

            const listing = await getListingById(listingId) as any;
            if (!listing) { res.status(404).json({ error: 'Listing not found' }); return; }
            if (listing.status !== 'OPEN') { res.status(400).json({ error: 'Listing is not open' }); return; }
            if (listing.userId === requesterId) { res.status(400).json({ error: 'Cannot request your own listing' }); return; }

            const exchangeId = await createSkillExchange(listingId, requesterId, listing.userId as string, listing.credits as number);
            notifyExchangeRequested(listing.userId as string, req.user!.displayName ?? 'Someone', listing.title as string, exchangeId);
            res.status(201).json({ exchangeId });
        } catch (err: any) {
            const msg = err?.message ?? '';
            if (msg === 'Insufficient credits') { res.status(402).json({ error: 'Insufficient credits' }); return; }
            if (msg.includes('duplicate') || msg.includes('UQ_') || msg.includes('UX_')) {
                res.status(409).json({ error: 'You already have an active request for this listing' }); return;
            }
            res.status(500).json({ error: 'Could not create exchange' });
        }
    }
);

// GET /api/v1/exchanges — List my exchanges
exchangesRouter.get('/', async (req: Request, res: Response) => {
    try {
        const exchanges = await getSkillExchanges(req.user!.id);
        res.json(exchanges);
    } catch {
        res.status(500).json({ error: 'Could not fetch exchanges' });
    }
});

// GET /api/v1/exchanges/:id — Single exchange detail
exchangesRouter.get('/:id',
    validate([param('id').trim().notEmpty()]),
    async (req: Request, res: Response) => {
        try {
            const exchange = await getSkillExchangeById(req.params.id, req.user!.id);
            if (!exchange) { res.status(404).json({ error: 'Exchange not found' }); return; }
            res.json(exchange);
        } catch {
            res.status(500).json({ error: 'Could not fetch exchange' });
        }
    }
);

// POST /api/v1/exchanges/:id/accept — Provider accepts
exchangesRouter.post('/:id/accept',
    validate([param('id').trim().notEmpty()]),
    async (req: Request, res: Response) => {
        try {
            await acceptSkillExchange(req.params.id, req.user!.id);
            const ex = await getSkillExchangeById(req.params.id, req.user!.id) as any;
            if (ex) notifyExchangeAccepted(ex.requesterId, req.user!.displayName ?? 'Provider', ex.listingTitle, ex.id);
            res.json({ message: 'Exchange accepted' });
        } catch (err: any) {
            res.status(400).json({ error: err?.message ?? 'Could not accept exchange' });
        }
    }
);

// POST /api/v1/exchanges/:id/confirm — Either party confirms completion
exchangesRouter.post('/:id/confirm',
    validate([param('id').trim().notEmpty()]),
    async (req: Request, res: Response) => {
        try {
            const result = await confirmSkillExchange(req.params.id, req.user!.id);
            const ex = await getSkillExchangeById(req.params.id, req.user!.id) as any;
            if (result.completed) {
                notifyExchangeCompleted(result.requesterId, ex?.listingTitle ?? '', result.credits, req.params.id);
                notifyExchangeCompleted(result.providerId,  ex?.listingTitle ?? '', result.credits, req.params.id);
            } else if (ex) {
                const otherId = req.user!.id === result.requesterId ? result.providerId : result.requesterId;
                notifyExchangeConfirmed(otherId, req.user!.displayName ?? 'Your partner', ex.listingTitle, req.params.id);
            }
            res.json({ completed: result.completed });
        } catch (err: any) {
            res.status(400).json({ error: err?.message ?? 'Could not confirm exchange' });
        }
    }
);

// POST /api/v1/exchanges/:id/cancel — Either party cancels
exchangesRouter.post('/:id/cancel',
    validate([param('id').trim().notEmpty()]),
    async (req: Request, res: Response) => {
        try {
            const { reason } = req.body;
            const ex = await getSkillExchangeById(req.params.id, req.user!.id) as any;
            const result = await cancelSkillExchange(req.params.id, req.user!.id, reason);
            if (ex) {
                const otherId = req.user!.id === result.requesterId ? ex.providerId : ex.requesterId;
                notifyExchangeCancelled(otherId, ex.listingTitle, req.params.id);
            }
            res.json({ message: 'Exchange cancelled' });
        } catch (err: any) {
            res.status(400).json({ error: err?.message ?? 'Could not cancel exchange' });
        }
    }
);

// POST /api/v1/exchanges/:id/dispute — Either party raises a dispute
exchangesRouter.post('/:id/dispute',
    validate([
        param('id').trim().notEmpty(),
        body('reason').trim().notEmpty().withMessage('reason is required').isLength({ max: 1000 }),
    ]),
    async (req: Request, res: Response) => {
        try {
            const ex = await getSkillExchangeById(req.params.id, req.user!.id) as any;
            await raiseDispute(req.params.id, req.user!.id, req.body.reason);
            if (ex) {
                const otherId = req.user!.id === ex.requesterId ? ex.providerId : ex.requesterId;
                notifyDisputeRaised(otherId, req.user!.displayName ?? 'Your partner', ex.listingTitle, req.params.id);
            }
            res.json({ message: 'Dispute raised' });
        } catch (err: any) {
            res.status(400).json({ error: err?.message ?? 'Could not raise dispute' });
        }
    }
);
