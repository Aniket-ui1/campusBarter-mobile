// services/notificationApi.ts
// ─────────────────────────────────────────────────────────────
// CampusBarter Notification System — REST API client.
// All calls go to /api/notifications/* endpoints.
// ─────────────────────────────────────────────────────────────

import { getApiBase, getApiToken } from '../lib/api';

export interface AppNotification {
    notificationId: string;
    userId: string;
    type: 'chat' | 'marketplace' | 'transaction' | 'social' | 'system';
    title: string;
    message: string;
    relatedEntityId: string | null;
    relatedEntityType: string | null;
    actionUrl: string | null;
    isRead: boolean;
    createdAt: string;
}

function authHeaders(): Record<string, string> {
    const token = getApiToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

function base(): string {
    return `${getApiBase()}/api/notifications`;
}

function legacyBase(): string {
    return `${getApiBase()}/api/v1/notifications`;
}

async function notificationFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(url, {
        ...options,
        headers: { ...authHeaders(), ...(options.headers as Record<string, string> | undefined) },
    });
    if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try { const j = await res.json(); errMsg = j?.error ?? j?.message ?? errMsg; } catch { /* ignore */ }
        throw new Error(errMsg);
    }
    return res.json() as Promise<T>;
}

async function tryFetch<T>(requests: Array<() => Promise<T>>): Promise<T> {
    let lastError: unknown;
    for (const request of requests) {
        try {
            return await request();
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError instanceof Error ? lastError : new Error('Request failed');
}

export const notificationApi = {
    /** Get all notifications for the logged-in user (newest first). */
    getNotifications(): Promise<AppNotification[]> {
        return tryFetch([
            async () => {
                const result = await notificationFetch<AppNotification[]>(`${base()}`);
                return result;
            },
            async () => {
                const result = await notificationFetch<AppNotification[]>(`${legacyBase()}`);
                return result;
            },
        ]);
    },

    /** Mark a specific notification as read. */
    markRead(notificationId: string): Promise<{ message: string }> {
        return tryFetch([
            () => notificationFetch(`${base()}/${encodeURIComponent(notificationId)}/read`, { method: 'PUT' }),
            () => notificationFetch(`${legacyBase()}/${encodeURIComponent(notificationId)}/read`, { method: 'PUT' }),
        ]);
    },

    /** Mark all notifications as read. */
    markAllRead(): Promise<{ message: string }> {
        return tryFetch([
            () => notificationFetch(`${base()}/read-all`, { method: 'PUT' }),
            () => notificationFetch(`${legacyBase()}/read-all`, { method: 'PUT' }),
        ]);
    },

    /** Get unread count (client-side filter). */
    async getUnreadCount(): Promise<number> {
        const notifications = await this.getNotifications();
        return notifications.filter(n => !n.isRead).length;
    },
};
