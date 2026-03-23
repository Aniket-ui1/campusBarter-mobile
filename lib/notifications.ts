// lib/notifications.ts
// ─────────────────────────────────────────────────────────────
// Expo push notification configuration.
//
// Two responsibilities:
//   1. Tell Expo how to display notifications when the app is in the foreground.
//   2. Handle notification taps (app in background or closed) and navigate
//      the user to the correct screen based on the notification data.
// ─────────────────────────────────────────────────────────────

import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

/**
 * Call once at app startup (before any notification can arrive).
 * Controls how push notifications behave when the app is in the foreground.
 *
 * When online, users already see real-time socket updates in the UI, so
 * we suppress the foreground alert and sound to avoid a double notification.
 * The badge is still updated so the OS icon count stays accurate.
 */
export function setupNotificationHandler(): void {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: false,  // suppress banner — user sees live socket update
            shouldPlaySound: false,
            shouldSetBadge: true,
        }),
    });
}

/**
 * Register a listener that fires when the user taps a push notification.
 * Parses the notification data and navigates to the correct screen.
 * Returns a cleanup function — call it in useEffect cleanup.
 */
export function setupNotificationResponseListener(): () => void {
    const subscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
            const data = response.notification.request.content.data as Record<string, string>;
            if (!data?.type) return;

            switch (data.type) {
                case 'new_message':
                    // Tapping a message push navigates directly into that conversation
                    if (data.conversationId) {
                        router.push(`/chat/${data.conversationId}` as any);
                    } else if (data.chatId) {
                        router.push(`/chat/${data.chatId}` as any);
                    }
                    break;

                case 'request':
                case 'accepted':
                    // Skill request or accepted — open the conversation
                    if (data.chatId) {
                        router.push(`/chat/${data.chatId}` as any);
                    }
                    break;

                case 'review':
                    // Someone reviewed you — open the notifications screen
                    router.push('/notifications' as any);
                    break;

                case 'match':
                    // Smart match — open the matched listing
                    if (data.listingId) {
                        router.push(`/skill/${data.listingId}` as any);
                    }
                    break;

                default:
                    // Unknown type — fall back to notifications screen
                    router.push('/notifications' as any);
                    break;
            }
        }
    );

    return () => subscription.remove();
}
