// services/chatApi.ts
// ─────────────────────────────────────────────────────────────
// CampusBarter Chat System v2 — REST API client.
// All calls go to the new /api/chat/* endpoints.
// Uses the same token mechanism as lib/api.ts.
// ─────────────────────────────────────────────────────────────

import { getApiBase, getApiToken } from '../lib/api';

export interface Conversation {
    conversationId: string;
    participant1Id: string;
    participant2Id: string;
    lastMessage: string | null;
    lastMessageTime: string | null;
    lastSenderId: string | null;
    createdAt: string;
    unreadCount: number;
    otherUser: {
        id: string;
        name: string;
        avatarUrl: string | null;
    };
}

export interface ChatMessage {
    messageId: string;
    conversationId: string;
    senderId: string;
    senderName?: string;
    messageType: 'text' | 'image' | 'file';
    textContent: string | null;
    mediaUrl: string | null;
    mediaName: string | null;
    isRead: boolean;
    readAt: string | null;
    isDeleted: boolean;
    createdAt: string;
}

function authHeaders(): Record<string, string> {
    const token = getApiToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

function base(): string {
    return `${getApiBase()}/api/chat`;
}

async function chatFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
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

export const chatApi = {
    /**
     * Find existing or create new conversation with another user.
     * The server derives currentUserId from the JWT — never send it from client.
     */
    findOrCreate(otherUserId: string): Promise<{ conversation: Conversation; isNew: boolean }> {
        return chatFetch(`${base()}/conversations`, {
            method: 'POST',
            body: JSON.stringify({ otherUserId }),
        });
    },

    /** Get all conversations for the logged-in user. */
    getConversations(): Promise<{ conversations: Conversation[] }> {
        return chatFetch(`${base()}/conversations`);
    },

    /**
     * Get messages for a conversation, paginated (30 per page).
     * Returns oldest-first.
     */
    getMessages(convId: string, page = 1): Promise<{ messages: ChatMessage[] }> {
        return chatFetch(`${base()}/${encodeURIComponent(convId)}/messages?page=${page}`);
    },

    /** Send a text message. */
    sendMessage(convId: string, textContent: string): Promise<{ message: ChatMessage }> {
        return chatFetch(`${base()}/${encodeURIComponent(convId)}/messages`, {
            method: 'POST',
            body: JSON.stringify({ textContent, messageType: 'text' }),
        });
    },

    /** Send an image or file message. */
    sendMedia(convId: string, mediaUrl: string, mediaName: string, messageType: 'image' | 'file' = 'image'): Promise<{ message: ChatMessage }> {
        return chatFetch(`${base()}/${encodeURIComponent(convId)}/messages`, {
            method: 'POST',
            body: JSON.stringify({ messageType, mediaUrl, mediaName }),
        });
    },

    /** Mark all unread messages as read. */
    markRead(convId: string): Promise<{ success: boolean }> {
        return chatFetch(`${base()}/${encodeURIComponent(convId)}/read`, { method: 'PUT' });
    },

    /** Soft-delete a conversation for the current user. */
    deleteConversation(convId: string): Promise<{ success: boolean }> {
        return chatFetch(`${base()}/${encodeURIComponent(convId)}`, { method: 'DELETE' });
    },

    /** Search messages across all conversations. */
    search(q: string): Promise<{ results: ChatMessage[] }> {
        return chatFetch(`${base()}/search?q=${encodeURIComponent(q)}`);
    },

    /** Register an Expo push token (call after login). */
    registerPushToken(pushToken: string, platform: 'ios' | 'android' | 'web'): Promise<{ success: boolean }> {
        return chatFetch(`${base()}/push-token`, {
            method: 'POST',
            body: JSON.stringify({ pushToken, platform }),
        });
    },
};
