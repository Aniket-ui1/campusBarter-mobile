// lib/api.ts
// ─────────────────────────────────────────────────────────────
// Typed HTTP client for CampusBarter Azure API.
// Replaces lib/firestore.ts — same function signatures where possible.
//
// Auth: every call attaches the Azure AD ID token stored in SecureStore.
// Token is injected by AuthContext after login via setApiToken().
// ─────────────────────────────────────────────────────────────

const API_BASE = process.env.EXPO_PUBLIC_API_URL
    ?? 'https://campusbarter-api-f3b4ascaemgthae3.canadacentral-01.azurewebsites.net';

// ── Token store ───────────────────────────────────────────────
// AuthContext calls setApiToken(idToken) after login and
// clearApiToken() after logout.

let _token: string | null = null;

export function setApiToken(token: string) { _token = token; }
export function clearApiToken() { _token = null; }
export function getApiToken() { return _token; }

// ── Core fetch wrapper ────────────────────────────────────────

class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

async function apiFetch<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };
    if (_token) headers['Authorization'] = `Bearer ${_token}`;

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
    listingId: string;
    listingTitle: string;
    lastMessageAt: string;
    lastMessage?: string;
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
    return apiFetch<ApiListing[]>('/api/listings');
}

export async function createListing(data: {
    type: 'OFFER' | 'REQUEST';
    title: string;
    description: string;
    credits: number;
}): Promise<string> {
    const res = await apiFetch<{ id: string }>('/api/listings', {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return res.id;
}

export async function closeListing(id: string): Promise<void> {
    await apiFetch(`/api/listings/${id}/close`, { method: 'PATCH' });
}

export async function deleteListing(id: string): Promise<void> {
    await apiFetch(`/api/listings/${id}`, { method: 'DELETE' });
}

// ── Chats ─────────────────────────────────────────────────────

export async function getChats(): Promise<ApiChat[]> {
    return apiFetch<ApiChat[]>('/api/chats');
}

export async function startChat(listingId: string, listingTitle: string): Promise<string> {
    const res = await apiFetch<{ id: string }>('/api/chats', {
        method: 'POST',
        body: JSON.stringify({ listingId, listingTitle }),
    });
    return res.id;
}

export async function getMessages(chatId: string): Promise<ApiMessage[]> {
    return apiFetch<ApiMessage[]>(`/api/chats/${chatId}/messages`);
}

export async function sendMessage(
    chatId: string,
    text: string,
    recipientId?: string
): Promise<void> {
    await apiFetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text, recipientId }),
    });
}

// ── Notifications ─────────────────────────────────────────────

export async function getNotifications(): Promise<ApiNotification[]> {
    return apiFetch<ApiNotification[]>('/api/notifications');
}

export async function markNotificationRead(notifId: string): Promise<void> {
    await apiFetch(`/api/notifications/${notifId}/read`, { method: 'PUT' });
}

export async function markAllNotificationsRead(): Promise<void> {
    await apiFetch('/api/notifications/read-all', { method: 'PUT' });
}

// ── Credits ───────────────────────────────────────────────────

export async function getCreditsBalance(): Promise<number> {
    const res = await apiFetch<{ balance: number }>('/api/credits/balance');
    return res.balance;
}

export async function transferCredits(
    toUserId: string,
    amount: number,
    reason: string
): Promise<void> {
    await apiFetch('/api/credits/transfer', {
        method: 'POST',
        body: JSON.stringify({ toUserId, amount, reason }),
    });
}

// ── User Profile ─────────────────────────────────────────────

export async function getMyProfile(): Promise<Record<string, unknown>> {
    return apiFetch('/api/users/me');
}

export async function updateMyProfile(data: {
    displayName?: string;
    bio?: string;
}): Promise<void> {
    await apiFetch('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

// ── Image Upload ─────────────────────────────────────────────

export async function uploadImage(
    uri: string,
    mimeType: string = 'image/jpeg'
): Promise<string> {
    const formData = new FormData();
    formData.append('image', { uri, type: mimeType, name: 'photo.jpg' } as unknown as Blob);

    const headers: Record<string, string> = {};
    if (_token) headers['Authorization'] = `Bearer ${_token}`;

    const res = await fetch(`${API_BASE}/api/upload`, {
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
    await apiFetch('/api/tokens/push', {
        method: 'POST',
        body: JSON.stringify({ token }),
    });
}
