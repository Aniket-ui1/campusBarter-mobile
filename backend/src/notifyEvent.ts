// backend/src/notifyEvent.ts
// ─────────────────────────────────────────────────────────────
// Centralised notification dispatcher.
// Writes a row to the Notifications table AND sends a push
// notification to the recipient's mobile device (if they have
// registered a push token).  Always fire-and-forget — never
// throw, never block the HTTP response.
// ─────────────────────────────────────────────────────────────

import { createNotification } from './db';
import { sendPushToUser } from './push';
import { getIO } from './socketInstance';
import { isUserOnline } from './socket';

type NotifType = 'request' | 'accepted' | 'message' | 'review' | 'match' | 'exchange';

interface NotifPayload {
    /** User to receive the notification */
    recipientId: string;
    type: NotifType;
    title: string;
    body: string;
    /** Optional related entity id (listingId, chatId, etc.) */
    relatedId?: string;
    /** Override the auto-computed actionUrl stored in the DB */
    actionUrlOverride?: string;
    /** Extra data for the push payload / socket emit */
    data?: Record<string, string>;
    /**
     * When true (default): persist to Notifications DB table and emit socket
     * bell event. Set to false for chat messages and "accepted" events which
     * should only trigger a push — they must NOT appear in the bell icon.
     */
    storeToBell?: boolean;
}

/**
 * Fire-and-forget: conditionally saves to DB + socket-emits (bell),
 * and sends an Expo push notification only when the user is offline.
 * Never throws.
 */
export async function notifyEvent(payload: NotifPayload): Promise<void> {
    const { recipientId, type, title, body, relatedId, actionUrlOverride, data, storeToBell = true } = payload;

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
    } else if (type === 'exchange') {
        entityType = 'exchange';
        actionUrl = relatedId ? `/exchange/${relatedId}` : undefined;
    }

    // Allow caller to override the actionUrl
    if (actionUrlOverride) actionUrl = actionUrlOverride;

    // 1. Persist to DB + emit socket bell — only for bell-worthy events
    if (storeToBell) {
        let notificationId: string | undefined;
        try {
            notificationId = await createNotification(recipientId, type, title, body, relatedId, entityType, actionUrl);
            console.log('[Notify] ✅ DB insert successful, ID:', notificationId);
        } catch (err) {
            console.error('[Notify] ❌ DB insert failed:', err);
        }

        try {
            const io = getIO();
            io.to(`user:${recipientId}`).emit('notification', {
                notificationId,
                type, title, body, relatedId,
                createdAt: new Date().toISOString(),
            });
        } catch (err) {
            console.error('[Notify] ❌ Socket emit failed:', err);
        }
    }

    // 2. Push notification — only when the user is NOT currently connected via socket
    // (online users already get the socket notification or real-time message in-app)
    if (!isUserOnline(recipientId)) {
        try {
            await sendPushToUser(recipientId, title, body, { type, ...(data ?? {}) });
        } catch (err) {
            console.error('[Notify] Push failed:', err);
        }
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
 * Push only — must NOT appear in the bell icon.
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
        storeToBell: false, // chat messages never appear in bell icon
    });
}

/**
 * Your skill request was accepted (listing owner started chatting back).
 * Push only — must NOT appear in the bell icon.
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
        storeToBell: false, // accepted events are push-only, not bell
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
// ── Skill Exchange Notifications ─────────────────────────────

export function notifyExchangeRequested(providerId: string, requesterName: string, listingTitle: string, exchangeId: string, requesterId: string) {
    void notifyEvent({
        recipientId: providerId,
        type: 'exchange',
        title: '📥 New skill request',
        body: `${requesterName} wants to learn "${listingTitle}"`,
        relatedId: exchangeId,
        actionUrlOverride: `/exchange/${exchangeId}`,
        data: { exchangeId, requesterId },
    });
}

export function notifyExchangeAccepted(requesterId: string, providerName: string, listingTitle: string, exchangeId: string) {
    void notifyEvent({ recipientId: requesterId, type: 'exchange', title: '✅ Request accepted', body: `${providerName} accepted your request for "${listingTitle}"`, relatedId: exchangeId });
}

export function notifyExchangeConfirmed(recipientId: string, confirmerName: string, listingTitle: string, exchangeId: string) {
    void notifyEvent({ recipientId, type: 'exchange', title: '👍 Exchange confirmed', body: `${confirmerName} confirmed the exchange for "${listingTitle}"`, relatedId: exchangeId });
}

export function notifyExchangeCompleted(recipientId: string, listingTitle: string, credits: number, exchangeId: string) {
    void notifyEvent({ recipientId, type: 'exchange', title: '🎉 Exchange completed!', body: `"${listingTitle}" — ${credits} credit${credits !== 1 ? 's' : ''} transferred`, relatedId: exchangeId });
}

export function notifyExchangeCancelled(recipientId: string, listingTitle: string, exchangeId: string) {
    void notifyEvent({ recipientId, type: 'exchange', title: '❌ Exchange cancelled', body: `The exchange for "${listingTitle}" was cancelled`, relatedId: exchangeId });
}

export function notifyDisputeRaised(recipientId: string, raisedByName: string, listingTitle: string, exchangeId: string) {
    void notifyEvent({ recipientId, type: 'exchange', title: '🚩 Dispute raised', body: `${raisedByName} raised a dispute for "${listingTitle}"`, relatedId: exchangeId });
}

export function notifyDisputeResolved(recipientId: string, outcome: string, listingTitle: string, exchangeId: string) {
    void notifyEvent({ recipientId, type: 'exchange', title: '⚖️ Dispute resolved', body: `"${listingTitle}" dispute resolved as ${outcome}`, relatedId: exchangeId });
}

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
