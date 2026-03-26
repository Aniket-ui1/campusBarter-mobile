import { Request, Response, Router } from 'express';
import { body, param, query } from 'express-validator';
import {
    createReport,
    getAdminReports,
    getReportsByReporter,
    updateAdminReport,
} from '../dbAdminReports';
import { requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';

export const reportsRouter = Router();
export const adminReportsRouter = Router();

const reportCreateRules = [
    body('targetType').trim().isIn(['LISTING', 'USER', 'CHAT', 'MESSAGE', 'REVIEW', 'OTHER'])
        .withMessage('targetType is invalid'),
    body('targetId').trim().notEmpty().isLength({ max: 128 }).withMessage('targetId is required'),
    body('reason').trim().notEmpty().isLength({ max: 500 }).withMessage('reason is required (max 500 chars)'),
    body('details').optional().trim().isLength({ max: 2000 }).withMessage('details max 2000 chars'),
];

// POST /api/v1/reports
reportsRouter.post('/', validate(reportCreateRules), async (req: Request, res: Response) => {
    try {
        const reportId = await createReport({
            reporterUserId: req.user!.id,
            targetType: req.body.targetType,
            targetId: req.body.targetId,
            reason: req.body.reason,
            details: req.body.details,
        });
        res.status(201).json({ reportId, message: 'Report submitted' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to submit report';
        res.status(500).json({ error: message });
    }
});

// GET /api/v1/reports/mine
reportsRouter.get('/mine',
    validate([query('limit').optional().isInt({ min: 1, max: 200 })]),
    async (req: Request, res: Response) => {
        try {
            const limit = Number(req.query.limit) || 100;
            const reports = await getReportsByReporter(req.user!.id, limit);
            res.json({ reports });
        } catch {
            res.status(500).json({ error: 'Failed to fetch your reports' });
        }
    }
);

const adminStatusRule = body('status').isIn(['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED']);

// GET /api/v1/admin/reports
adminReportsRouter.get('/',
    requireRole('Moderator', 'Admin'),
    validate([
        query('status').optional().isIn(['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED']),
        query('limit').optional().isInt({ min: 1, max: 300 }),
    ]),
    async (req: Request, res: Response) => {
        try {
            const reports = await getAdminReports({
                status: req.query.status as string | undefined,
                limit: Number(req.query.limit) || 100,
            });
            res.json({ reports });
        } catch {
            res.status(500).json({ error: 'Failed to fetch reports' });
        }
    }
);

// PATCH /api/v1/admin/reports/:id
adminReportsRouter.patch('/:id',
    requireRole('Moderator', 'Admin'),
    validate([
        param('id').isInt({ min: 1 }).withMessage('Report id must be a positive integer'),
        adminStatusRule,
        body('resolutionAction').optional().trim().isLength({ max: 40 }),
        body('resolutionNote').optional().trim().isLength({ max: 2000 }),
        body('assignToSelf').optional().isBoolean(),
    ]),
    async (req: Request, res: Response) => {
        try {
            const updated = await updateAdminReport({
                reportId: Number(req.params.id),
                actorUserId: req.user!.id,
                status: req.body.status,
                resolutionAction: req.body.resolutionAction,
                resolutionNote: req.body.resolutionNote,
                assignToSelf: req.body.assignToSelf,
            });

            if (!updated) {
                res.status(404).json({ error: 'Report not found' });
                return;
            }

            res.json({ message: 'Report updated' });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update report';
            res.status(500).json({ error: message });
        }
    }
);
