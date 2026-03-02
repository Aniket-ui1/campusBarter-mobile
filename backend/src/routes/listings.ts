// backend/src/routes/listings.ts
// RBAC: Students can create/close their own. Moderators can close any. Admins full access.

import { Router, Request, Response } from 'express';
import { requireRole } from '../middleware/auth';
import { getOpenListings, createListing, closeListing, deleteListing } from '../db';

export const listingsRouter = Router();

// GET /api/listings — all open listings (any authenticated user)
listingsRouter.get('/', async (req: Request, res: Response) => {
    try {
        const listings = await getOpenListings();
        res.json(listings);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch listings' });
    }
});

// POST /api/listings — create a listing (Students, Moderators, Admins)
listingsRouter.post('/', async (req: Request, res: Response) => {
    try {
        const { type, title, description, credits } = req.body;

        // Input validation — server-side (never trust client input)
        if (!['OFFER', 'REQUEST'].includes(type)) { res.status(400).json({ error: 'Invalid type' }); return; }
        if (!title?.trim() || title.length > 200) { res.status(400).json({ error: 'Title required (max 200 chars)' }); return; }
        if (!description?.trim() || description.length > 2000) { res.status(400).json({ error: 'Description required (max 2000 chars)' }); return; }
        if (!Number.isInteger(credits) || credits < 1) { res.status(400).json({ error: 'Credits must be a positive integer' }); return; }

        const id = await createListing({
            type,
            title,
            description,
            credits,
            userId: req.user!.id,
            userName: req.user!.displayName,
        });

        res.status(201).json({ id, message: 'Listing created' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create listing' });
    }
});

// PATCH /api/listings/:id/close — close a listing
// Students can only close their OWN listings; Moderators/Admins can close any
listingsRouter.patch('/:id/close', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await closeListing(id, req.user!.id);
        res.json({ message: 'Listing closed' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to close listing' });
    }
});

// DELETE /api/listings/:id — Moderators and Admins only
listingsRouter.delete('/:id', requireRole('Moderator', 'Admin'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await deleteListing(id, req.user!.id);
        res.json({ message: 'Listing deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete listing' });
    }
});
