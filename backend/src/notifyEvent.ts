// backend/src/notifyEvent.ts
// ─────────────────────────────────────────────────────────────
// Centralised notification dispatcher.
// Writes a row to the Notifications table AND sends a push
// notification to the recipient's mobile device (if they have
// registered a push token).  Always fire-and-forget — never
// throw, never block the HTTP response.
// ─────────────────────────────────────────────────────────────

import { createNotification } from './db';
import { sendPushNotification } from './push';
import { getIO } from './socketInstance';

type NotifType = 'request' | 'accepted' | 'message' | 'review' | 'match';

interface NotifPayload {
    /** User to receive the notification */
    recipientId: string;
    type: NotifType;
    title: string;
    body: string;
    /** Optional related entity id (listingId, chatId, etc.) */
    relatedId?: string;
    /** Extra data for the push payload / socket emit */
    data?: Record<string, string>;
}

/**
 * Fire-and-forget: saves notification to DB, emits via Socket.IO,
 * and sends an Expo push notification. Never throws.
 */
export async function notifyEvent(payload: NotifPayload): Promise<void> {
    const { recipientId, type, title, body, relatedId, data } = payload;

    // Determine entity type and action URL based on notification type
    let entityType: string | undefined;
    let actionUrl: string | undefined;

    if (type === 'message' || type === 'request' || type === 'accepted') {
        entityType = 'conversation';
        actionUrl = relatedId ? `/chat/${relatedId}` : undefined;
    } else if (type === 'match') {
        entityType = 'listing';
        actionUrl = relatedId ? `/skill/${relatedId}` : undefined;
    } else if (type === 'review') {
        entityType = 'review';
        actionUrl = recipientId ? `/reviews/${recipientId}` : undefined;
    }

    console.log('[Notify] 📨 Creating notification:', { recipientId, type, title, actionUrl });

    // 1. Persist to DB (the bell icon in-app)
    try {
        await createNotification(recipientId, type, title, body, relatedId, entityType, actionUrl);
        console.log('[Notify] ✅ DB insert successful');
    } catch (err) {
        console.error('[Notify] ❌ DB insert failed:', err);
    }

    // 2. Real-time socket emit to the user's personal room
    try {
        const io = getIO();
        io.to(`user:${recipientId}`).emit('notification', {
            type, title, body, relatedId,
            createdAt: new Date().toISOString(),
        });
        console.log('[Notify] ✅ Socket emit successful to room:', `user:${recipientId}`);
    } catch (err) {
        console.error('[Notify] ❌ Socket emit failed:', err);
    }

    // 3. Push notification (mobile, if token registered)
    try {
        await sendPushNotification(recipientId, title, body, { type, ...(data ?? {}) });
    } catch (err) {
        console.error('[Notify] Push failed:', err);
    }
}

// ── Typed helpers (called from route handlers) ────────────────

/**
 * Someone sent a skill request (opened a chat) on your listing.
 */
export function notifySkillRequest(
    listingOwnerId: string,
    requesterName: string,
    listingTitle: string,
    chatId: string
) {
    void notifyEvent({
        recipientId: listingOwnerId,
        type: 'request',
        title: '🙋 New skill request!',
        body: `${requesterName} wants to exchange for "${listingTitle}"`,
        relatedId: chatId,
        data: { chatId },
    });
}

/**
 * You received a new chat message.
 */
export function notifyMessage(
    recipientId: string,
    senderName: string,
    chatId: string,
    preview: string
) {
    void notifyEvent({
        recipientId,
        type: 'message',
        title: `💬 New message from ${senderName}`,
        body: preview.length > 80 ? preview.slice(0, 77) + '...' : preview,
        relatedId: chatId,
        data: { chatId },
    });
}

/**
 * Your skill request was accepted (listing owner started chatting back).
 */
export function notifyRequestAccepted(
    requesterId: string,
    ownerName: string,
    listingTitle: string,
    chatId: string
) {
    void notifyEvent({
        recipientId: requesterId,
        type: 'accepted',
        title: '✅ Request accepted!',
        body: `${ownerName} accepted your request for "${listingTitle}"`,
        relatedId: chatId,
        data: { chatId },
    });
}

/**
 * Someone left you a review.
 */
export function notifyReview(
    revieweeId: string,
    reviewerName: string,
    rating: number
) {
    const stars = '⭐'.repeat(Math.min(rating, 5));
    void notifyEvent({
        recipientId: revieweeId,
        type: 'review',
        title: `${stars} New review from ${reviewerName}`,
        body: `${reviewerName} rated you ${rating}/5`,
    });
}

/**
 * Smart matching found a potential partner for your listing.
 */
export function notifySmartMatch(
    userId: string,
    matchedListingTitle: string,
    matchedListingId: string
) {
    void notifyEvent({
        recipientId: userId,
        type: 'match',
        title: '🤝 New skill match found!',
        body: `We found a potential match: "${matchedListingTitle}"`,
        relatedId: matchedListingId,
        data: { listingId: matchedListingId },
    });
}
