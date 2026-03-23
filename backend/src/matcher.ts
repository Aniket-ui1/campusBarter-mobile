// backend/src/matcher.ts
// ─────────────────────────────────────────────────────────────
// CampusBarter Smart Matching Engine
//
// When a new listing is posted, this engine:
//   1. Extracts meaningful keywords from title + description
//   2. Queries the DB for users whose open listings are a
//      potential match (opposite type + overlapping keywords)
//   3. Sends each matched user a push notification
//
// Logic:
//   New OFFER → find users who have REQUEST listings with same keywords
//   New REQUEST → find users who have OFFER listings with same keywords
// ─────────────────────────────────────────────────────────────

import { findMatchingUsers } from './db';
import { notifySmartMatch } from './notifyEvent';

// Common English stop-words to strip before keyword matching
const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'is', 'it', 'as', 'by', 'be', 'my', 'we', 'i', 'you', 'he', 'she', 'they',
    'this', 'that', 'these', 'those', 'from', 'up', 'about', 'into', 'if',
    'am', 'are', 'was', 'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'need', 'can', 'looking',
    'want', 'need', 'offer', 'offering', 'request', 'requesting', 'available',
]);

/**
 * Extracts meaningful keywords from listing text.
 * Returns up to 10 distinct lowercase keywords (min 3 chars).
 */
export function extractKeywords(title: string, description: string): string[] {
    const combined = `${title} ${description}`.toLowerCase();
    const words = combined.match(/\b[a-z]{3,}\b/g) ?? [];
    const unique = [...new Set(words)].filter(w => !STOP_WORDS.has(w));
    return unique.slice(0, 10); // cap at 10 to keep SQL query efficient
}

/**
 * Main matching function — call this after createListing() succeeds.
 * Runs fully async, never throws — a match failure must never fail the API.
 */
export async function runSmartMatching(params: {
    newListingId: string;
    type: 'OFFER' | 'REQUEST';
    title: string;
    description: string;
    postedByUserId: string;
    postedByName: string;
}): Promise<void> {
    try {
        const { newListingId, type, title, description, postedByUserId } = params;

        const keywords = extractKeywords(title, description);
        if (keywords.length === 0) return;

        // Look for the opposite type — OFFER matches REQUEST and vice versa
        const oppositeType = type === 'OFFER' ? 'REQUEST' : 'OFFER';

        const matches = await findMatchingUsers({
            keywords,
            oppositeType,
            excludeUserId: postedByUserId, // don't notify the poster
        });

        if (matches.length === 0) return;

        console.log(`[Matcher] Found ${matches.length} potential matches for listing ${newListingId}`);

        // Notify each matched user — in parallel
        // notifySmartMatch handles: DB bell insert + socket emit + push (when offline)
        const notifyAll = matches.map((match) => {
            const userId = match.userId as string;
            notifySmartMatch(userId, title, newListingId);
            return Promise.resolve();
        });

        await Promise.allSettled(notifyAll); // allSettled = one failure doesn't stop others
    } catch (err) {
        // Matching must never crash the API
        console.error('[Matcher] Error during smart matching:', err);
    }
}
