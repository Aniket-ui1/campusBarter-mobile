// lib/api.ts
// ─────────────────────────────────────────────────────────────
// Typed HTTP client for CampusBarter Azure API.
// Replaces lib/firestore.ts — same function signatures where possible.
//
// Auth: every call attaches the Azure AD ID token stored in SecureStore.
// Token is injected by AuthContext after login via setApiToken().
// ─────────────────────────────────────────────────────────────
const AZURE_URL = 'https://campusbarter-api-f3b4ascaemgthae3.canadacentral-01.azurewebsites.net';
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? AZURE_URL;

// ── Token store ───────────────────────────────────────────────
// AuthContext calls setApiToken(idToken) after login and
// clearApiToken() after logout.

let _token: string | null = null;

export function setApiToken(token: string) { _token = token; }
export function clearApiToken() { _token = null; }
export function getApiToken() { return _token; }
export function getApiBase() { return API_BASE; }

// ── Core fetch wrapper ────────────────────────────────────────

class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

// ── Type for dev user info stored alongside mock token ────────
let _devUser: { id: string; email: string; name: string } | null = null;

export function setDevUser(info: { id: string; email: string; name: string }) {
    _devUser = info;
}

function resolveAuthToken(): string | null {
    if (_token) return _token;

    // Web refresh fallback: recover token from localStorage when in-memory state is lost.
    if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('campusbarter_token');
    }

    return null;
}

async function apiFetch<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    const token = resolveAuthToken();

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;

        // When using a mock token (local dev), also send x-dev-* headers
        // so the backend dev bypass can identify the user without JWT.
        if (token.startsWith('mock-') && _devUser) {
            headers['x-dev-user-id'] = _devUser.id;
            headers['x-dev-email'] = _devUser.email;
            headers['x-dev-name'] = _devUser.name;
        }
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }

    // 204 No Content — return empty object
    if (res.status === 204) return {} as T;
    return res.json() as Promise<T>;
}

// ── Types (mirror backend types) ─────────────────────────────

export interface ApiListing {
    id: string;
    type: 'OFFER' | 'REQUEST';
    title: string;
    description: string;
    credits: number;
    userId: string;
    userName: string;
    createdAt: string;
    status: 'OPEN' | 'CLOSED';
    imageUrl?: string;
}

export interface ApiMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    sentAt: string;
}

export interface ApiChat {
    id: string;
    conversationId?: string;
    listingId: string;
    listingTitle: string;
    lastMessageAt: string;
    lastMessage?: string;
    unreadCount?: number;
    otherUserName?: string;
    otherUserId?: string;
    otherUserAvatarUrl?: string;
    initiatorId?: string;
    listingOwnerId?: string;
}

export interface ApiNotification {
    id: string;
    type: string;
    title: string;
    body: string;
    read: boolean;
    relatedId?: string;
    createdAt: string;
}

// ── Listings ──────────────────────────────────────────────────

export async function getListings(): Promise<ApiListing[]> {
    try {
        return await apiFetch<ApiListing[]>('/api/v1/listings');
    } catch (error) {
        const status = (error as { status?: number }).status;
        if (status !== 404) throw error;
        return apiFetch<ApiListing[]>('/api/listings');
    }
}

export async function createListing(data: {
    type: 'OFFER' | 'REQUEST';
    title: string;
    description: string;
    credits: number;
    category?: string;
}): Promise<string> {
    try {
        const res = await apiFetch<{ id: string }>('/api/v1/listings', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return res.id;
    } catch (error) {
        const status = (error as { status?: number }).status;
        if (status !== 404) throw error;

        const res = await apiFetch<{ id: string }>('/api/listings', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return res.id;
    }
}

export async function closeListing(id: string): Promise<void> {
    try {
        await apiFetch(`/api/v1/listings/${id}/close`, { method: 'PATCH' });
    } catch (error) {
        const status = (error as { status?: number }).status;
        if (status !== 404) throw error;
        await apiFetch(`/api/listings/${id}/close`, { method: 'PATCH' });
    }
}

export async function deleteListing(id: string): Promise<void> {
    try {
        await apiFetch(`/api/v1/listings/${id}`, { method: 'DELETE' });
    } catch (error) {
        const status = (error as { status?: number }).status;
        if (status !== 404) throw error;
        await apiFetch(`/api/listings/${id}`, { method: 'DELETE' });
    }
}

// ── Chats ─────────────────────────────────────────────────────

export async function getChats(userId: string): Promise<ApiChat[]> {
    try {
        return await apiFetch<ApiChat[]>(`/api/v1/conversations/${userId}`);
    } catch (error) {
        const status = (error as { status?: number }).status;
        if (status !== 404) throw error;

        try {
            return await apiFetch<ApiChat[]>('/api/v1/chats');
        } catch {
            return apiFetch<ApiChat[]>('/api/chats');
        }
    }
}

export async function startChat(
    listingId: string,
    listingTitle: string,
    otherUserId: string
): Promise<string> {
    try {
        const res = await apiFetch<{ conversationId: string }>('/api/v1/conversations', {
            method: 'POST',
            body: JSON.stringify({ listingId, listingTitle, otherUserId }),
        });
        return res.conversationId;
    } catch (error) {
        const status = (error as { status?: number }).status;
        if (status !== 404 && status !== 400) {
            throw error;
        }

        // Backward-compatible fallback for older deployments.
        try {
            const legacy = await apiFetch<{ id: string }>('/api/v1/chats', {
                method: 'POST',
                body: JSON.stringify({ listingId, listingTitle, listingOwnerId: otherUserId }),
            });
            return legacy.id;
        } catch {
            const legacy = await apiFetch<{ id: string }>('/api/chats', {
                method: 'POST',
                body: JSON.stringify({ listingId, listingTitle, listingOwnerId: otherUserId }),
            });
            return legacy.id;
        }
    }
}

export async function getMessages(chatId: string, page = 1, limit = 30): Promise<ApiMessage[]> {
    try {
        return await apiFetch<ApiMessage[]>(`/api/v1/conversations/${chatId}/messages?page=${page}&limit=${limit}`);
    } catch (error) {
        const status = (error as { status?: number }).status;
        if (status !== 404) throw error;

        try {
            return await apiFetch<ApiMessage[]>(`/api/v1/chats/${chatId}/messages`);
        } catch {
            return apiFetch<ApiMessage[]>(`/api/chats/${chatId}/messages`);
        }
    }
}

export async function sendMessage(
    chatId: string,
    text: string,
    recipientId?: string
): Promise<void> {
    try {
        await apiFetch(`/api/v1/conversations/${chatId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ text, recipientId }),
        });
    } catch (error) {
        const status = (error as { status?: number }).status;
        if (status !== 404) throw error;

        try {
            await apiFetch(`/api/v1/chats/${chatId}/messages`, {
                method: 'POST',
                body: JSON.stringify({ text, recipientId }),
            });
        } catch {
            await apiFetch(`/api/chats/${chatId}/messages`, {
                method: 'POST',
                body: JSON.stringify({ text, recipientId }),
            });
        }
    }
}

export async function markChatRead(chatId: string, userId: string): Promise<void> {
    try {
        await apiFetch(`/api/v1/conversations/${chatId}/read/${userId}`, {
            method: 'PUT',
        });
    } catch (error) {
        const status = (error as { status?: number }).status;
        if (status !== 404) throw error;

        try {
            await apiFetch(`/api/v1/chats/${chatId}/read`, {
                method: 'PUT',
            });
        } catch {
            await apiFetch(`/api/chats/${chatId}/read`, {
                method: 'PUT',
            });
        }
    }
}

export async function deleteChat(chatId: string, userId: string): Promise<void> {
    try {
        await apiFetch(`/api/v1/conversations/${chatId}/${userId}`, {
            method: 'DELETE',
        });
    } catch (error) {
        const status = (error as { status?: number }).status;
        if (status !== 404) throw error;

        try {
            await apiFetch(`/api/v1/chats/${chatId}`, {
                method: 'DELETE',
            });
        } catch {
            await apiFetch(`/api/chats/${chatId}`, {
                method: 'DELETE',
            });
        }
    }
}

// ── Notifications ─────────────────────────────────────────────

export async function getNotifications(): Promise<ApiNotification[]> {
    return apiFetch<ApiNotification[]>('/api/v1/notifications');
}

export async function markNotificationRead(notifId: string): Promise<void> {
    await apiFetch(`/api/v1/notifications/${notifId}/read`, { method: 'PUT' });
}

export async function markAllNotificationsRead(): Promise<void> {
    await apiFetch('/api/v1/notifications/read-all', { method: 'PUT' });
}

// ── Credits ───────────────────────────────────────────────────

export async function getCreditsBalance(): Promise<number> {
    const res = await apiFetch<{ balance: number }>('/api/v1/credits/balance');
    return res.balance;
}

export async function transferCredits(
    toUserId: string,
    amount: number,
    reason: string
): Promise<void> {
    await apiFetch('/api/v1/credits/transfer', {
        method: 'POST',
        body: JSON.stringify({ toUserId, amount, reason }),
    });
}

// ── User Profile ─────────────────────────────────────────────

export interface ApiUserProfile {
    id: string;
    displayName: string;
    email: string;
    bio?: string;
    credits: number;
    program?: string;
    major?: string;
    semester?: number;
    rating?: number;
    reviewCount?: number;
    skills?: string[];
    weaknesses?: string[];
    interests?: string[];
    profileComplete?: boolean;
    avatarUrl?: string;
    role?: string;
}

export async function getMyProfile(): Promise<ApiUserProfile> {
    return apiFetch<ApiUserProfile>('/api/v1/users/me');
}

export async function getUserById(userId: string): Promise<ApiUserProfile | null> {
    try {
        return await apiFetch<ApiUserProfile>(`/api/v1/users/${userId}`);
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
    }
}

export async function getAllUsers(): Promise<ApiUserProfile[]> {
    try {
        return await apiFetch<ApiUserProfile[]>('/api/v1/users');
    } catch {
        return [];
    }
}

export async function updateMyProfile(data: Partial<Omit<ApiUserProfile, 'id' | 'email' | 'credits'>>): Promise<void> {
    await apiFetch('/api/v1/users/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

export async function upsertUserProfile(data: Partial<ApiUserProfile>): Promise<void> {
    try {
        await apiFetch('/api/v1/users/me', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    } catch (e) {
        console.warn('[API] upsertUserProfile failed:', e);
        throw e; // Throw so AuthContext knows it failed
    }
}

// ── Image Upload ─────────────────────────────────────────────

export async function uploadImage(
    uri: string,
    mimeType: string = 'image/jpeg'
): Promise<string> {
    const formData = new FormData();
    formData.append('image', { uri, type: mimeType, name: 'photo.jpg' } as unknown as Blob);

    const headers: Record<string, string> = {};
    const token = resolveAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/api/v1/upload`, {
        method: 'POST',
        headers,
        body: formData,
    });
    if (!res.ok) throw new ApiError(res.status, 'Image upload failed');
    const json = await res.json();
    return json.url as string;
}

// ── Push Token Registration ───────────────────────────────────

export async function registerPushToken(token: string): Promise<void> {
    await apiFetch('/api/v1/tokens/push', {
        method: 'POST',
        body: JSON.stringify({ token }),
    });
}
