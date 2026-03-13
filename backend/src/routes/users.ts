// backend/src/routes/users.ts

import { Request, Response, Router } from 'express';
import { body, param } from 'express-validator';
import { adminAnonymizeUser, getUserProfile, updateUserProfile, upsertUserProfile } from '../db';
import { requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';

export const usersRouter = Router();

// GET /api/users/me — own profile (must be before /:id to avoid Express conflict)
usersRouter.get('/me', async (req: Request, res: Response) => {
    try {
        const profile = await getUserProfile(req.user!.id);
        if (!profile) { res.status(404).json({ error: 'User not found' }); return; }
        res.json(profile);
    } catch {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// GET /api/users/:id — public profile (strips email)
usersRouter.get('/:id',
    validate([param('id').trim().notEmpty().withMessage('User ID is required')]),
    async (req: Request, res: Response) => {
        try {
            const profile = await getUserProfile(req.params.id);
            if (!profile) {
                // User hasn't had their row created yet — return a safe placeholder
                res.json({
                    id: req.params.id,
                    displayName: 'CampusBarter User',
                    bio: '',
                    program: null,
                    semester: null,
                    avatarUrl: null,
                    role: 'Student',
                    credits: 10,
                    rating: null,
                    ratingCount: 0,
                    profileComplete: false,
                });
                return;
            }
            const safeProfile = { ...profile as Record<string, unknown> };
            delete safeProfile['email']; // never expose email to other users
            res.json(safeProfile);
        } catch (err: any) {
            console.error('[Users] GET /:id failed:', err.message);
            res.status(500).json({ error: 'Failed to fetch profile' });
        }
    }
);

// PATCH /api/users/me — update own profile
const updateProfileRules = [
    body('displayName').optional().trim()
        .isLength({ min: 1, max: 128 }).withMessage('Display name must be 1–128 characters'),
    body('bio').optional().trim()
        .isLength({ max: 500 }).withMessage('Bio max 500 characters'),
    body('program').optional().trim(),
    body('semester').optional().isInt({ min: 1, max: 12 }),
    body('profileComplete').optional().isBoolean(),
];

usersRouter.patch('/me', validate(updateProfileRules), async (req: Request, res: Response) => {
    try {
        const { displayName, bio, program, major, semester, skills, weaknesses, interests, profileComplete, avatarUrl } = req.body;
        await updateUserProfile(req.user!.id, {
            displayName, bio, program, major, semester,
            skills, weaknesses, interests, profileComplete, avatarUrl,
        });
        res.json({ message: 'Profile updated' });
    } catch {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// PUT /api/users/me — sync/upsert own profile (AuthContext call)
usersRouter.put('/me', validate(updateProfileRules), async (req: Request, res: Response) => {
    try {
        const { email, displayName, bio, program, major, semester, avatarUrl, profileComplete } = req.body;
        await upsertUserProfile(req.user!.id, {
            email: email || req.user!.email,
            displayName: displayName || req.user!.displayName,
            bio, program, major, semester, avatarUrl, profileComplete
        });
        res.json({ message: 'Profile synced' });
    } catch (err) {
        console.error('[Users] PUT /me failed:', err);
        res.status(500).json({ error: 'Failed to sync profile' });
    }
});

// DELETE /api/users/:id — Admin only
usersRouter.delete('/:id', requireRole('Admin'),
    validate([param('id').trim().notEmpty().withMessage('User ID is required')]),
    async (req: Request, res: Response) => {
        try {
            const targetUserId = req.params.id;

            if (targetUserId === req.user!.id) {
                res.status(400).json({ error: 'Admins cannot anonymize their own account via this endpoint' });
                return;
            }

            const updated = await adminAnonymizeUser(targetUserId, req.user!.id);
            if (!updated) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            res.json({ message: 'User anonymized successfully' });
        } catch {
            res.status(500).json({ error: 'Failed to anonymize user' });
        }
    }
);
