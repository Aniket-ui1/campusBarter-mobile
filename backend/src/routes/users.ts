// backend/src/routes/users.ts
import { Router, Request, Response } from 'express';
import { requireRole } from '../middleware/auth';
import { getUserProfile, updateUserProfile } from '../db';

export const usersRouter = Router();

// GET /api/users/me — get your own profile
usersRouter.get('/me', async (req: Request, res: Response) => {
    try {
        const profile = await getUserProfile(req.user!.id);
        if (!profile) { res.status(404).json({ error: 'User not found' }); return; }
        res.json(profile);
    } catch {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// GET /api/users/:id — get any user profile (authenticated users)
usersRouter.get('/:id', async (req: Request, res: Response) => {
    try {
        const profile = await getUserProfile(req.params.id);
        if (!profile) { res.status(404).json({ error: 'User not found' }); return; }
        // Strip sensitive fields before returning to other users
        const { ...safeProfile } = profile as Record<string, unknown>;
        delete safeProfile['email']; // don't expose email to other users
        res.json(safeProfile);
    } catch {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// PATCH /api/users/me — update own profile
usersRouter.patch('/me', async (req: Request, res: Response) => {
    try {
        const { displayName, bio } = req.body;
        if (displayName && displayName.length > 128) {
            res.status(400).json({ error: 'Display name too long (max 128 chars)' });
            return;
        }
        if (bio && bio.length > 500) {
            res.status(400).json({ error: 'Bio too long (max 500 chars)' });
            return;
        }
        await updateUserProfile(req.user!.id, { displayName, bio });
        res.json({ message: 'Profile updated' });
    } catch {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// DELETE /api/users/:id — Admin only
usersRouter.delete('/:id', requireRole('Admin'), async (req: Request, res: Response) => {
    res.json({ message: 'User deletion — Phase 5 implementation' });
});
