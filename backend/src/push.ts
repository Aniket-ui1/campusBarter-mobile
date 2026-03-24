// backend/src/push.ts
// ─────────────────────────────────────────────────────────────
// Expo Push Notification helper for CampusBarter.
// Sends push notifications to mobile devices via Expo's Push API.
// Tokens are stored in the Users table (pushToken column).
// ─────────────────────────────────────────────────────────────

import Expo, { ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { getPushToken, getUserPushTokens } from './db';

const expo = new Expo();

/**
 * Send a push notification to a specific user.
 * Silently ignores if the user has no push token registered.
 */
export async function sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data: Record<string, string> = {}
): Promise<void> {
    try {
        const token = await getPushToken(userId);
        if (!token) return; // User hasn't granted notification permission

        // Validate the token format before sending
        if (!Expo.isExpoPushToken(token)) {
            console.warn(`[Push] Invalid push token for user ${userId}`);
            return;
        }

        const message: ExpoPushMessage = {
            to: token,
            title,
            body,
            data,
            sound: 'default',
            priority: 'high',
        };

        // Send and handle receipts
        const chunks = expo.chunkPushNotifications([message]);
        for (const chunk of chunks) {
            const tickets: ExpoPushTicket[] = await expo.sendPushNotificationsAsync(chunk);
            for (const ticket of tickets) {
                if (ticket.status === 'error') {
                    console.error(`[Push] Delivery error for ${userId}:`, ticket.message);
                }
            }
        }
    } catch (err) {
        // Push failures must NEVER crash the API — just log
        console.error('[Push] Failed to send notification:', err);
    }
}

/**
 * Send a push notification to all registered devices for a user.
 * Reads tokens from UserPushTokens table (multi-device).
 * Silently ignores users with no tokens. Never throws.
 */
export async function sendPushToUser(
    userId: string,
    title: string,
    body: string,
    data: Record<string, string> = {}
): Promise<void> {
    try {
        const tokens = await getUserPushTokens(userId);
        if (tokens.length === 0) return;

        const messages: ExpoPushMessage[] = tokens
            .filter(t => Expo.isExpoPushToken(t))
            .map(to => ({ to, title, body, data, sound: 'default' as const, priority: 'high' as const }));

        if (messages.length === 0) return;

        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
            const tickets: ExpoPushTicket[] = await expo.sendPushNotificationsAsync(chunk);
            for (const ticket of tickets) {
                if (ticket.status === 'error') {
                    console.warn('[Push] Ticket error:', ticket.message);
                }
            }
        }
    } catch (err) {
        console.error('[Push] sendPushToUser failed:', err);
    }
}

/**
 * Notify a user about a new chat message.
 */
export async function notifyNewMessage(
    recipientId: string,
    senderName: string,
    chatId: string,
    preview: string
): Promise<void> {
    await sendPushNotification(
        recipientId,
        `New message from ${senderName}`,
        preview.length > 100 ? preview.slice(0, 97) + '...' : preview,
        { type: 'new_message', chatId }
    );
}

/**
 * Notify a user that someone reviewed them.
 */
export async function notifyNewReview(
    recipientId: string,
    reviewerName: string
): Promise<void> {
    await sendPushNotification(
        recipientId,
        'New review received!',
        `${reviewerName} left you a review`,
        { type: 'new_review' }
    );
}
