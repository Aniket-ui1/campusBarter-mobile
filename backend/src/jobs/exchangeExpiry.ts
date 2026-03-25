// backend/src/jobs/exchangeExpiry.ts
// Background jobs for exchange auto-completion, auto-cancellation, and monthly credits.
// Uses setInterval — no extra dependencies required.

import { autoCompleteStaleExchanges, autoCancelAbandonedExchanges, backfillWelcomeCredits, grantMonthlyCredits } from '../db';
import { notifyExchangeCompleted, notifyExchangeCancelled } from '../notifyEvent';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS  = 24 * HOUR_MS;

async function runAutoComplete() {
    try {
        const completed = await autoCompleteStaleExchanges();
        for (const ex of completed) {
            notifyExchangeCompleted(ex.requesterId, 'your skill exchange', ex.credits, '');
            notifyExchangeCompleted(ex.providerId,  'your skill exchange', ex.credits, '');
        }
        if (completed.length > 0) {
            console.log(`[ExchangeExpiry] Auto-completed ${completed.length} exchange(s)`);
        }
    } catch (err) {
        console.error('[ExchangeExpiry] Auto-complete job error:', err);
    }
}

async function runAutoCancel() {
    try {
        const cancelled = await autoCancelAbandonedExchanges();
        for (const ex of cancelled) {
            notifyExchangeCancelled(ex.requesterId, 'your skill exchange', '');
        }
        if (cancelled.length > 0) {
            console.log(`[ExchangeExpiry] Auto-cancelled ${cancelled.length} exchange(s)`);
        }
    } catch (err) {
        console.error('[ExchangeExpiry] Auto-cancel job error:', err);
    }
}

async function runMonthlyCredits() {
    try {
        await grantMonthlyCredits();
    } catch (err) {
        console.error('[Credits] Monthly credits job error:', err);
    }
}

export async function startExchangeExpiryJobs(): Promise<void> {
    // Backfill welcome credits for any existing users with 0 balance at startup
    try {
        await backfillWelcomeCredits();
    } catch (err) {
        console.error('[Credits] Welcome backfill error:', err);
    }

    // Auto-complete: runs every hour
    setInterval(() => { void runAutoComplete(); }, HOUR_MS);

    // Auto-cancel: runs once per day
    setInterval(() => { void runAutoCancel(); }, DAY_MS);

    // Monthly credits: runs once per day (grants 3 credits if user hasn't received any in 30 days)
    setInterval(() => { void runMonthlyCredits(); }, DAY_MS);

    console.log('[ExchangeExpiry] Jobs started (auto-complete: 1h, auto-cancel/monthly: 24h)');
}
