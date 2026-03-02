// backend/src/server.ts
// ─────────────────────────────────────────────────────────────
// CampusBarter — Express REST API
// Hosted on Azure App Service
// Reads secrets from Azure Key Vault via Managed Identity
// ─────────────────────────────────────────────────────────────

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { verifyAzureAdToken, requireRole } from './middleware/auth';
import { auditLog } from './db';

// Route handlers
import { listingsRouter } from './routes/listings';
import { chatsRouter } from './routes/chats';
import { usersRouter } from './routes/users';
import { healthRouter } from './routes/health';
import { reviewsRouter } from './routes/reviews';
import { notificationsRouter } from './routes/notifications';
import { creditsRouter } from './routes/credits';
import { uploadRouter } from './routes/upload';

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security Middleware ───────────────────────────────────────

// Sets secure HTTP headers (XSS protection, HSTS, etc.)
app.use(helmet());

// CORS — only allow requests from the app bundle
app.use(cors({
    origin: [
        'https://campusbarter.azurestaticapps.net',  // web app
        'exp://*',                                    // Expo Go
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
}));

// Rate limiting — max 100 requests per 15 minutes per IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Parse JSON bodies
app.use(express.json({ limit: '1mb' }));

// ── Audit Logging Middleware ──────────────────────────────────
// Logs every incoming request to the AuditLog table

app.use(async (req, res, next) => {
    res.on('finish', async () => {
        const userId = req.user?.id ?? null;
        await auditLog(
            userId,
            `${req.method} ${req.path}`,
            undefined,
            req.ip,
            res.statusCode
        );
    });
    next();
});

// ── Routes ───────────────────────────────────────────────────

// Health check — no auth required (used by Azure Monitor)
app.use('/health', healthRouter);

// All other routes require a valid Azure AD token
app.use('/api', verifyAzureAdToken);
app.use('/api/listings', listingsRouter);
app.use('/api/chats', chatsRouter);
app.use('/api/users', usersRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/credits', creditsRouter);
app.use('/api/upload', uploadRouter);

// Admin-only route example
app.get('/api/admin/audit-log', verifyAzureAdToken, requireRole('Admin'), async (req, res) => {
    res.json({ message: 'Audit log endpoint — Phase 6 implementation' });
});

// ── Error Handler ────────────────────────────────────────────

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(`[Error] ${req.method} ${req.path}:`, err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// ── Start ────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`CampusBarter API running on port ${PORT}`);
});

export default app;
