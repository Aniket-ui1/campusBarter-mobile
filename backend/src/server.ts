// backend/src/server.ts
// ─────────────────────────────────────────────────────────────
// CampusBarter — Express REST API + Socket.io WebSocket server
// Hosted on Azure App Service (Node 22, Linux)
// ─────────────────────────────────────────────────────────────

import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import http from 'http';
import { auditLog, closePool, getAuditLogEntries, getOpenDisputes, resolveDispute } from './db';
import { getAdminUsers } from './dbAdminReports';
import { notifyDisputeResolved } from './notifyEvent';
import { startExchangeExpiryJobs } from './jobs/exchangeExpiry';
import { requireRole, verifyAzureAdToken } from './middleware/auth';
import { initSocketServer } from './socket';
import { setIO } from './socketInstance';

// Route handlers
import { exchangesRouter } from './routes/exchanges';
import { chatsRouter } from './routes/chats';
import { registerChatRoutes } from './routes/chat';
import { conversationsRouter } from './routes/conversations';
import { creditsRouter } from './routes/credits';
import { healthRouter } from './routes/health';
import { insightsRouter } from './routes/insights';
import { listingsRouter } from './routes/listings';
import { notificationsRouter } from './routes/notifications';
import { adminReportsRouter, reportsRouter } from './routes/reports';
import { reviewsRouter } from './routes/reviews';
import { tokensRouter } from './routes/tokens';
import { uploadRouter } from './routes/upload';
import { usersRouter } from './routes/users';

const app = express();
const PORT = process.env.PORT || 3000;
const isDevEnvironment = process.env.NODE_ENV === 'development';

// ── Security Middleware ───────────────────────────────────────

// Strict security headers (CSP, HSTS, X-Frame-Options, etc.)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https://campusbarterstg.blob.core.windows.net'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],     // Prevent clickjacking
            formAction: ["'self'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false,       // Required for mobile clients
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

// Explicit X-Content-Type-Options (belt-and-suspenders with Helmet)
app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

// CORS — allow app origin plus local development clients.
const allowedOrigins: Array<string | RegExp> = [
    'https://campusbarter.azurestaticapps.net',
    'http://localhost:3999',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:8083',
    /^exp:\/\/.*/,
];

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type', 'x-dev-user-id', 'x-dev-email', 'x-dev-name', 'x-dev-role'],
    credentials: true,
}));

// Rate limiting — 2000 requests per 15 minutes per IP.
// We need headroom for: Socket.IO handshake+polling (~20 req), real-time
// data polling (listings/chats/notifications), and actual user actions.
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000,
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Parse JSON bodies
app.use(express.json({ limit: '1mb' }));

// ── Audit Logging Middleware ──────────────────────────────────
app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.on('finish', async () => {
        const userId = req.user?.id ?? null;
        await auditLog(userId, `${req.method} ${req.path}`, undefined, req.ip, res.statusCode);
    });
    next();
});

// ── API v1 Routes ────────────────────────────────────────────

// Health check — no auth required (used by Azure Monitor)
app.use('/health', healthRouter);

// All v1 routes require a valid Azure AD token
app.use('/api/v1', verifyAzureAdToken);
app.use('/api/v1/listings', listingsRouter);
app.use('/api/v1/chats', chatsRouter);
app.use('/api/v1/conversations', conversationsRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/credits', creditsRouter);
app.use('/api/v1/upload', uploadRouter);
app.use('/api/v1/tokens', tokensRouter);
app.use('/api/v1/insights', insightsRouter);
app.use('/api/v1/exchanges', exchangesRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/admin/reports', adminReportsRouter);

// Admin — disputes
app.get('/api/v1/admin/disputes', verifyAzureAdToken, requireRole('Moderator'), async (_req: express.Request, res: express.Response) => {
    try {
        const disputes = await getOpenDisputes();
        res.json({ disputes });
    } catch {
        res.status(500).json({ error: 'Failed to fetch disputes' });
    }
});

app.post('/api/v1/admin/disputes/:id/resolve', verifyAzureAdToken, requireRole('Moderator'), async (req: express.Request, res: express.Response) => {
    try {
        const { outcome, resolution } = req.body;
        if (!outcome || !['COMPLETED', 'CANCELLED'].includes(outcome)) {
            res.status(400).json({ error: 'outcome must be COMPLETED or CANCELLED' }); return;
        }
        if (!resolution?.trim()) {
            res.status(400).json({ error: 'resolution is required' }); return;
        }
        const result = await resolveDispute(req.params.id, req.user!.id, outcome, resolution.trim());
        notifyDisputeResolved(result.requesterId, outcome, '', req.params.id);
        notifyDisputeResolved(result.providerId,  outcome, '', req.params.id);
        res.json({ message: `Dispute resolved as ${outcome}` });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to resolve dispute';
        res.status(400).json({ error: msg });
    }
});

// Admin-only audit log
app.get('/api/v1/admin/audit-log', verifyAzureAdToken, requireRole('Admin'), async (req: express.Request, res: express.Response) => {
    try {
        const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 200));
        const logs = await getAuditLogEntries(limit);
        res.json({ count: logs.length, logs });
    } catch {
        res.status(500).json({ error: 'Failed to fetch audit log entries' });
    }
});

app.get('/api/v1/admin/users', verifyAzureAdToken, requireRole('Moderator', 'Admin'), async (req: express.Request, res: express.Response) => {
    try {
        const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 200));
        const users = await getAdminUsers(limit);
        res.json({ count: users.length, users });
    } catch {
        res.status(500).json({ error: 'Failed to fetch admin users list' });
    }
});

// ── Backward-Compatible Deprecated /api/* Routes ─────────────
// Old /api/* paths still work but return deprecation headers.
// Will be removed in a future release.
const deprecationMiddleware = (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', '2026-09-01');
    res.setHeader('Link', '</api/v1>; rel="successor-version"');
    next();
};
app.use('/api', deprecationMiddleware);
app.use('/api', verifyAzureAdToken);
app.use('/api/listings', listingsRouter);
app.use('/api/chats', chatsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/users', usersRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/credits', creditsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/tokens', tokensRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/admin/reports', adminReportsRouter);

app.get('/api/admin/audit-log', verifyAzureAdToken, requireRole('Admin'), async (req: express.Request, res: express.Response) => {
    try {
        const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 200));
        const logs = await getAuditLogEntries(limit);
        res.json({ count: logs.length, logs });
    } catch {
        res.status(500).json({ error: 'Failed to fetch audit log entries' });
    }
});

// ── Error Handler ────────────────────────────────────────────

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(`[Error] ${req.method} ${req.path}:`, err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// ── HTTP + WebSocket Server ───────────────────────────────────
// Use http.createServer so socket.io and Express share the same port.

const httpServer = http.createServer(app);
const io = initSocketServer(httpServer);
setIO(io); // Register singleton so route files can emit without circular imports

// ── Chat System v2 routes ─────────────────────────────────────
// Registered AFTER http server is created so getIO() is available.
// Mounts at both /api/chat/* and /api/v1/chat/* (see routes/chat.ts).
registerChatRoutes(app);

httpServer.listen(PORT, () => {
    console.log(`CampusBarter API + WebSocket running on port ${PORT}`);
    void startExchangeExpiryJobs();
});

// ── Graceful shutdown ────────────────────────────────────────
// Close the SQL pool cleanly when the process is terminated
// (Azure App Service sends SIGTERM before restarting).
async function shutdown() {
    console.log('[Server] Shutting down…');
    httpServer.close();
    await closePool();
    process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;

