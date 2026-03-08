// backend/src/server.ts
// ─────────────────────────────────────────────────────────────
// CampusBarter — Express REST API + Socket.io WebSocket server
// Hosted on Azure App Service (Node 22, Linux)
// ─────────────────────────────────────────────────────────────

import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { verifyAzureAdToken, requireRole } from './middleware/auth';
import { auditLog } from './db';
import { initSocketServer } from './socket';
import { setIO } from './socketInstance';

// Route handlers
import { listingsRouter } from './routes/listings';
import { chatsRouter } from './routes/chats';
import { usersRouter } from './routes/users';
import { healthRouter } from './routes/health';
import { reviewsRouter } from './routes/reviews';
import { notificationsRouter } from './routes/notifications';
import { creditsRouter } from './routes/credits';
import { uploadRouter } from './routes/upload';
import { tokensRouter } from './routes/tokens';
import { insightsRouter } from './routes/insights';

const app = express();
const PORT = process.env.PORT || 3000;

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

// CORS — allow requests from the app bundle + dev proxy
app.use(cors({
    origin: [
        'https://campusbarter.azurestaticapps.net',
        'http://localhost:3999',     // dev-proxy for web development
        'http://localhost:8081',     // Metro bundler
        'http://localhost:8083',     // Web dev server
        /^exp:\/\/.*/,               // Expo Go
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type', 'x-dev-user-id', 'x-dev-email', 'x-dev-name', 'x-dev-role'],
    credentials: true,
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
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/credits', creditsRouter);
app.use('/api/v1/upload', uploadRouter);
app.use('/api/v1/tokens', tokensRouter);
app.use('/api/v1/insights', insightsRouter);

// Admin-only audit log
app.get('/api/v1/admin/audit-log', verifyAzureAdToken, requireRole('Admin'), async (req: express.Request, res: express.Response) => {
    res.json({ message: 'Audit log endpoint — Phase 6 implementation' });
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
app.use('/api/users', usersRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/credits', creditsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/tokens', tokensRouter);
app.use('/api/insights', insightsRouter);

app.get('/api/admin/audit-log', verifyAzureAdToken, requireRole('Admin'), async (req: express.Request, res: express.Response) => {
    res.json({ message: 'Audit log endpoint — Phase 6 implementation' });
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

httpServer.listen(PORT, () => {
    console.log(`CampusBarter API + WebSocket running on port ${PORT}`);
});

export default app;

