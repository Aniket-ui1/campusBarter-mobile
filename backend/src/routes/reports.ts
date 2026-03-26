import { Request, Response, Router } from 'express';
import { body } from 'express-validator';
import { createListingReport, getListingById } from '../db';
import { validate } from '../middleware/validate';

export const reportsRouter = Router();

const createReportRules = [
    body('listingId').trim().notEmpty().withMessage('listingId is required'),
    body('reason').trim().notEmpty().withMessage('reason is required').isLength({ max: 120 }).withMessage('reason max 120 characters'),
    body('details').optional().trim().isLength({ max: 1000 }).withMessage('details max 1000 characters'),
];

// POST /api/v1/reports — report a listing
reportsRouter.post('/', validate(createReportRules), async (req: Request, res: Response) => {
    try {
        const { listingId, reason, details } = req.body;

        const listing = await getListingById(listingId);
        if (!listing) {
            res.status(404).json({ error: 'Listing not found' });
            return;
        }

        if ((listing.userId as string) === req.user!.id) {
            res.status(400).json({ error: 'You cannot report your own listing' });
            return;
        }

        const reportId = await createListingReport(listingId, req.user!.id, reason, details);
        res.status(201).json({ id: reportId, message: 'Report submitted' });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not submit report';
        if (msg.includes('already have an open report')) {
            res.status(409).json({ error: msg });
            return;
        }
        res.status(500).json({ error: msg });
    }
});
