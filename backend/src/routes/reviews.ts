// backend/src/routes/reviews.ts

import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { createReview, getReviews } from '../db';
import { notifyReview } from '../notifyEvent';

export const reviewsRouter = Router();

// POST /api/reviews — submit a review
const createReviewRules = [
    body('revieweeId').trim().notEmpty().withMessage('revieweeId is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be a whole number between 1 and 5'),
    body('comment').trim().notEmpty().withMessage('Comment is required')
        .isLength({ max: 1000 }).withMessage('Comment max 1000 characters'),
];

reviewsRouter.post('/', validate(createReviewRules), async (req: Request, res: Response) => {
    try {
        const { revieweeId, rating, comment } = req.body;

        if (revieweeId.trim() === req.user!.id) {
            res.status(400).json({ errors: [{ field: 'revieweeId', message: 'You cannot review yourself' }] });
            return;
        }

        const id = await createReview(req.user!.id, revieweeId.trim(), Number(rating), comment);

        // Notify reviewee (fire-and-forget)
        notifyReview(revieweeId.trim(), req.user!.displayName, Number(rating));

        res.status(201).json({ id, message: 'Review submitted' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create review';
        res.status(500).json({ error: message });
    }
});

// GET /api/reviews/user/:id — get all reviews for a user
reviewsRouter.get('/user/:id',
    validate([param('id').trim().notEmpty().withMessage('User ID is required')]),
    async (req: Request, res: Response) => {
        try {
            const reviews = await getReviews(req.params.id);
            res.json(reviews);
        } catch {
            res.status(500).json({ error: 'Failed to fetch reviews' });
        }
    }
);
