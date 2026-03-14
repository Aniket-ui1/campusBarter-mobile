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

function legacyBaseV1(): string {
    return `${getApiBase()}/api/v1`;
}

function legacyBase(): string {
    return `${getApiBase()}/api`;
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

function normalizeConversation(raw: any): Conversation {
    return {
        conversationId: raw?.conversationId ?? raw?.id ?? '',
        participant1Id: raw?.participant1Id ?? '',
        participant2Id: raw?.participant2Id ?? '',
        lastMessage: raw?.lastMessage ?? raw?.lastMessagePreview ?? null,
        lastMessageTime: raw?.lastMessageTime ?? raw?.lastMessageAt ?? null,
        lastSenderId: raw?.lastSenderId ?? null,
        createdAt: raw?.createdAt ?? raw?.lastMessageAt ?? new Date(0).toISOString(),
        unreadCount: Number(raw?.unreadCount ?? 0),
        otherUser: {
            id: raw?.otherUser?.id ?? raw?.otherUserId ?? '',
            name: raw?.otherUser?.name ?? raw?.otherUserName ?? 'Chat',
            avatarUrl: raw?.otherUser?.avatarUrl ?? raw?.otherUserAvatarUrl ?? null,
        },
    };
}

function normalizeMessage(raw: any, convId?: string): ChatMessage {
    return {
        messageId: raw?.messageId ?? raw?.id ?? `msg-${Date.now()}`,
        conversationId: raw?.conversationId ?? raw?.chatId ?? convId ?? '',
        senderId: raw?.senderId ?? '',
        senderName: raw?.senderName,
        messageType: raw?.messageType ?? 'text',
        textContent: raw?.textContent ?? raw?.text ?? null,
        mediaUrl: raw?.mediaUrl ?? null,
        mediaName: raw?.mediaName ?? null,
        isRead: Boolean(raw?.isRead ?? false),
        readAt: raw?.readAt ?? null,
        isDeleted: Boolean(raw?.isDeleted ?? false),
        createdAt: raw?.createdAt ?? raw?.sentAt ?? new Date().toISOString(),
    };
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

export const chatApi = {
    /**
     * Find existing or create new conversation with another user.
     * The server derives currentUserId from the JWT — never send it from client.
     */
    findOrCreate(otherUserId: string): Promise<{ conversation: Conversation; isNew: boolean }> {
        return tryFetch([
            async () => {
                const result = await chatFetch<{ conversation: any; isNew?: boolean }>(`${base()}/conversations`, {
                    method: 'POST',
                    body: JSON.stringify({ otherUserId }),
                });
                return {
                    conversation: normalizeConversation(result.conversation),
                    isNew: Boolean(result.isNew),
                };
            },
            async () => {
                const result = await chatFetch<{ conversationId: string; existing?: boolean }>(`${legacyBaseV1()}/conversations`, {
                    method: 'POST',
                    body: JSON.stringify({ otherUserId }),
                });
                return {
                    conversation: normalizeConversation({ conversationId: result.conversationId, otherUser: { id: otherUserId, name: 'Chat' } }),
                    isNew: !result.existing,
                };
            },
        ]);
    },

    /** Get all conversations for the logged-in user. */
    getConversations(): Promise<{ conversations: Conversation[] }> {
        return tryFetch([
            async () => {
                const result = await chatFetch<{ conversations: any[] }>(`${base()}/conversations`);
                return { conversations: (result.conversations ?? []).map(normalizeConversation) };
            },
            async () => {
                const result = await chatFetch<any[]>(`${legacyBaseV1()}/chats`);
                return { conversations: (result ?? []).map(normalizeConversation) };
            },
            async () => {
                const result = await chatFetch<any[]>(`${legacyBase()}/chats`);
                return { conversations: (result ?? []).map(normalizeConversation) };
            },
        ]);
    },

    /**
     * Get messages for a conversation, paginated (30 per page).
     * Returns oldest-first.
     */
    getMessages(convId: string, page = 1): Promise<{ messages: ChatMessage[] }> {
        return tryFetch([
            async () => {
                const result = await chatFetch<{ messages: any[] }>(`${base()}/${encodeURIComponent(convId)}/messages?page=${page}`);
                return { messages: (result.messages ?? []).map((m) => normalizeMessage(m, convId)) };
            },
            async () => {
                const result = await chatFetch<any[]>(`${legacyBaseV1()}/conversations/${encodeURIComponent(convId)}/messages?page=${page}&limit=30`);
                return { messages: (result ?? []).map((m) => normalizeMessage(m, convId)) };
            },
            async () => {
                const result = await chatFetch<any[]>(`${legacyBaseV1()}/chats/${encodeURIComponent(convId)}/messages`);
                return { messages: (result ?? []).map((m) => normalizeMessage(m, convId)) };
            },
            async () => {
                const result = await chatFetch<any[]>(`${legacyBase()}/chats/${encodeURIComponent(convId)}/messages`);
                return { messages: (result ?? []).map((m) => normalizeMessage(m, convId)) };
            },
        ]);
    },

    /** Send a text message. */
    sendMessage(
        convId: string,
        textContent: string,
        sender?: { id?: string; name?: string }
    ): Promise<{ message: ChatMessage }> {
        return tryFetch([
            async () => {
                const result = await chatFetch<{ message: any }>(`${base()}/${encodeURIComponent(convId)}/messages`, {
                    method: 'POST',
                    body: JSON.stringify({ textContent, messageType: 'text' }),
                });
                return { message: normalizeMessage(result.message, convId) };
            },
            async () => {
                const result = await chatFetch<any>(`${legacyBaseV1()}/conversations/${encodeURIComponent(convId)}/messages`, {
                    method: 'POST',
                    body: JSON.stringify({ text: textContent }),
                });
                const normalized = normalizeMessage(result, convId);
                return {
                    message: {
                        ...normalized,
                        senderId: normalized.senderId || sender?.id || '',
                        senderName: normalized.senderName || sender?.name,
                    },
                };
            },
            async () => {
                await chatFetch<any>(`${legacyBaseV1()}/chats/${encodeURIComponent(convId)}/messages`, {
                    method: 'POST',
                    body: JSON.stringify({ text: textContent }),
                });
                return {
                    message: normalizeMessage({
                        chatId: convId,
                        senderId: sender?.id,
                        senderName: sender?.name,
                        text: textContent,
                        sentAt: new Date().toISOString(),
                    }, convId),
                };
            },
            async () => {
                await chatFetch<any>(`${legacyBase()}/chats/${encodeURIComponent(convId)}/messages`, {
                    method: 'POST',
                    body: JSON.stringify({ text: textContent }),
                });
                return {
                    message: normalizeMessage({
                        chatId: convId,
                        senderId: sender?.id,
                        senderName: sender?.name,
                        text: textContent,
                        sentAt: new Date().toISOString(),
                    }, convId),
                };
            },
        ]);
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
        return tryFetch([
            () => chatFetch(`${base()}/${encodeURIComponent(convId)}/read`, { method: 'PUT' }),
            async () => {
                await chatFetch(`${legacyBaseV1()}/chats/${encodeURIComponent(convId)}/read`, { method: 'PUT' });
                return { success: true };
            },
        ]);
    },

    /** Soft-delete a conversation for the current user. */
    deleteConversation(convId: string): Promise<{ success: boolean }> {
        return tryFetch([
            () => chatFetch(`${base()}/${encodeURIComponent(convId)}`, { method: 'DELETE' }),
            async () => {
                await chatFetch(`${legacyBaseV1()}/chats/${encodeURIComponent(convId)}`, { method: 'DELETE' });
                return { success: true };
            },
            async () => {
                await chatFetch(`${legacyBase()}/chats/${encodeURIComponent(convId)}`, { method: 'DELETE' });
                return { success: true };
            },
        ]);
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

    /** Get online status and last seen timestamp for a user. */
    getUserStatus(userId: string): Promise<{ isOnline: boolean; lastSeenAt: string | null }> {
        return chatFetch(`${base()}/status/${encodeURIComponent(userId)}`);
    },

    /** Delete a message. */
    deleteMessage(messageId: string, deleteForEveryone: boolean = false): Promise<{ success: boolean; messageId: string }> {
        return chatFetch(`${base()}/message/${encodeURIComponent(messageId)}`, {
            method: 'DELETE',
            body: JSON.stringify({ deleteForEveryone }),
        });
    },

    /** Search messages within a conversation. */
    searchConversation(convId: string, q: string): Promise<{ results: ChatMessage[] }> {
        return chatFetch(`${base()}/${encodeURIComponent(convId)}/search?q=${encodeURIComponent(q)}`);
    },
};
