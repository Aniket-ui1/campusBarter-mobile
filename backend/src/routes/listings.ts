// backend/src/routes/listings.ts
// RBAC: Students create/close their own. Moderators close any. Admins full access.

import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { requireRole } from '../middleware/auth';
import { getOpenListings, createListing, closeListing, deleteListing } from '../db';
import { runSmartMatching } from '../matcher';

export const listingsRouter = Router();

// GET /api/listings — all open listings (any authenticated user)
listingsRouter.get('/', async (req: Request, res: Response) => {
    try {
        const listings = await getOpenListings();
        res.json(listings);
    } catch {
        res.status(500).json({ error: 'Failed to fetch listings' });
    }
});

// POST /api/listings — create a listing
const createListingRules = [
    body('type').isIn(['OFFER', 'REQUEST']).withMessage('type must be OFFER or REQUEST'),
    body('title').trim().notEmpty().withMessage('Title is required')
        .isLength({ max: 200 }).withMessage('Title max 200 characters'),
    body('description').trim().notEmpty().withMessage('Description is required')
        .isLength({ max: 2000 }).withMessage('Description max 2000 characters'),
    body('credits').isInt({ min: 1 }).withMessage('Credits must be a positive integer'),
];

listingsRouter.post('/', validate(createListingRules), async (req: Request, res: Response) => {
    try {
        const { type, title, description, credits } = req.body;

        const id = await createListing({
            type,
            title: title.trim(),
            description: description.trim(),
            credits: Number(credits),
            userId: req.user!.id,
            userName: req.user!.displayName,
        });

        // ── Smart Matching ──────────────────────────────────
        // Fire-and-forget: runs in background, never blocks the response.
        // If matching fails for any reason, the listing is still created.
        void runSmartMatching({
            newListingId: id,
            type: type as 'OFFER' | 'REQUEST',
            title: title.trim(),
            description: description.trim(),
            postedByUserId: req.user!.id,
            postedByName: req.user!.displayName,
        });

        res.status(201).json({ id, message: 'Listing created' });
    } catch {
        res.status(500).json({ error: 'Failed to create listing' });
    }
});

// PATCH /api/listings/:id/close — close a listing (own or mod/admin)
const listingIdRule = [
    param('id').trim().notEmpty().withMessage('Listing ID is required'),
];

listingsRouter.patch('/:id/close', validate(listingIdRule), async (req: Request, res: Response) => {
    try {
        await closeListing(req.params.id, req.user!.id);
        res.json({ message: 'Listing closed' });
    } catch {
        res.status(500).json({ error: 'Failed to close listing' });
    }
});

// DELETE /api/listings/:id — Moderators and Admins only
listingsRouter.delete('/:id', requireRole('Moderator', 'Admin'), validate(listingIdRule), async (req: Request, res: Response) => {
    try {
        await deleteListing(req.params.id, req.user!.id);
        res.json({ message: 'Listing deleted' });;
    } catch {
        res.status(500).json({ error: 'Failed to delete listing' });
    }
});
