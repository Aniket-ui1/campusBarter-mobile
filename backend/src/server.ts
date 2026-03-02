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

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security Middleware ───────────────────────────────────────

// Sets secure HTTP headers (XSS protection, HSTS, etc.)
app.use(helmet());

// CORS — only allow requests from the app bundle
app.use(cors({
    origin: [
        'https://campusbarter.azurestaticapps.net',
        'exp://*',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
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
app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.on('finish', async () => {
        const userId = req.user?.id ?? null;
        await auditLog(userId, `${req.method} ${req.path}`, undefined, req.ip, res.statusCode);
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
app.use('/api/tokens', tokensRouter);

// Admin-only audit log
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
export const io = initSocketServer(httpServer);

httpServer.listen(PORT, () => {
    console.log(`CampusBarter API + WebSocket running on port ${PORT}`);
});

export default app;
