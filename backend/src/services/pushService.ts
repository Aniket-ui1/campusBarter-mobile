// backend/src/services/pushService.ts
// ─────────────────────────────────────────────────────────────
// Push notification helper for the v2 Chat system.
// Reads recipient Expo push tokens from UserPushTokens table.
// Fire-and-forget — failures never crash the caller.
// ─────────────────────────────────────────────────────────────

import Expo, { ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import sql from 'mssql';
import { getPool } from '../db';
import { notifyMessage } from '../notifyEvent';

const expo = new Expo();

/**
 * Look up all registered Expo push tokens for a user.
 * Uses the UserPushTokens table (new v2 table).
 */
async function getTokensForUser(userId: string): Promise<string[]> {
    try {
        const db = await getPool();
        const result = await db.request()
            .input('uid', sql.NVarChar(128), userId)
            .query('SELECT pushToken FROM UserPushTokens WHERE userId = @uid');
        return result.recordset.map((r: { pushToken: string }) => r.pushToken);
    } catch {
        return [];
    }
}

/**
 * Send a push notification to a user (all their registered devices).
 * Silently ignores users with no tokens. Never throws.
 */
export async function sendPushToUser(
    userId: string,
    title: string,
    body: string,
    data: Record<string, string> = {}
): Promise<void> {
    try {
        const tokens = await getTokensForUser(userId);
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
                    console.warn('[PushService] Ticket error:', ticket.message);
                }
            }
        }
    } catch (err) {
        // Push failures must NEVER crash the API
        console.error('[PushService] Failed to send push:', err);
    }
}

/**
 * Notify the other participant in a conversation when a new message arrives.
 * Looks up who the other participant is and sends to all their devices.
 */
export async function notifyOtherParticipant(
    conversationId: string,
    senderId: string,
    preview: string,
    pool: sql.ConnectionPool
): Promise<void> {
    try {
        const result = await pool.request()
            .input('cid', sql.NVarChar(300), conversationId)
            .input('sid', sql.NVarChar(128), senderId)
            .query(`
                SELECT u.displayName AS senderName,
                       CASE
                           WHEN c.participant1Id = @sid THEN c.participant2Id
                           ELSE c.participant1Id
                       END AS recipientId
                FROM Conversations c
                JOIN Users u ON u.id = @sid
                WHERE c.conversationId = @cid
            `);

        if (result.recordset.length === 0) return;

        const { senderName, recipientId } = result.recordset[0];
        const bodyText = preview.length > 100 ? preview.slice(0, 97) + '...' : preview;

        // Create in-app notification
        notifyMessage(recipientId, senderName, conversationId, bodyText);

        // Send push notification
        await sendPushToUser(
            recipientId,
            `New message from ${senderName}`,
            bodyText,
            { type: 'new_message', conversationId }
        );
    } catch (err) {
        console.error('[PushService] notifyOtherParticipant failed:', err);
    }
}
