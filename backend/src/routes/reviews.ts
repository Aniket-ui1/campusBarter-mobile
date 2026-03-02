// backend/src/routes/reviews.ts
// POST /api/reviews  — submit a rating after an exchange
// GET  /api/reviews/user/:id — get all reviews for a user

import { Router, Request, Response } from 'express';
import { createReview, getReviews } from '../db';

export const reviewsRouter = Router();

// POST /api/reviews — create a review (authenticated user reviewing another user)
reviewsRouter.post('/', async (req: Request, res: Response) => {
    try {
        const { revieweeId, rating, comment } = req.body;

        // Input validation
        if (!revieweeId?.trim()) {
            res.status(400).json({ error: 'revieweeId is required' });
            return;
        }
        if (revieweeId === req.user!.id) {
            res.status(400).json({ error: 'You cannot review yourself' });
            return;
        }
        const parsedRating = Number(rating);
        if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            res.status(400).json({ error: 'Rating must be a whole number between 1 and 5' });
            return;
        }
        if (!comment?.trim() || comment.length > 1000) {
            res.status(400).json({ error: 'Comment is required (max 1000 chars)' });
            return;
        }

        const reviewId = await createReview(
            req.user!.id,
            revieweeId.trim(),
            parsedRating,
            comment
        );

        res.status(201).json({ id: reviewId, message: 'Review submitted' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create review';
        res.status(500).json({ error: message });
    }
});

// GET /api/reviews/user/:id — get all reviews for a given user (public)
reviewsRouter.get('/user/:id', async (req: Request, res: Response) => {
    try {
        const reviews = await getReviews(req.params.id);
        res.json(reviews);
    } catch {
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});
