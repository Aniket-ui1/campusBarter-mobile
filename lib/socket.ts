// lib/socket.ts
// ─────────────────────────────────────────────────────────────
// Singleton socket.io-client for CampusBarter.
// Connects with the Azure AD JWT from lib/api.ts.
// ─────────────────────────────────────────────────────────────

import { io, Socket } from 'socket.io-client';
import { getApiToken, getApiBase } from './api';


let _socket: Socket | null = null;

/** Connect and authenticate. Call after setApiToken() is set. */
export function connectSocket(): Socket {
    if (_socket?.connected) return _socket;

    _socket = io(getApiBase(), {
        auth: { token: getApiToken() },
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
    });

    _socket.on('connect', () => console.log('[Socket] Connected'));
    _socket.on('disconnect', () => console.log('[Socket] Disconnected'));
    _socket.on('connect_error', (err) => console.warn('[Socket] Error:', err.message));

    return _socket;
}

export function disconnectSocket() {
    _socket?.disconnect();
    _socket = null;
}

export function getSocket(): Socket | null {
    return _socket;
}

/** Join a chat room to receive real-time messages. */
export function joinChat(chatId: string) {
    _socket?.emit('joinChat', chatId);
}

/** Leave a chat room. */
export function leaveChat(chatId: string) {
    _socket?.emit('leaveChat', chatId);
}

/** Emit typing indicator to the chat room. */
export function emitTyping(chatId: string) {
    _socket?.emit('typing', chatId);
}

/** Emit stop-typing to the chat room. */
export function emitStopTyping(chatId: string) {
    _socket?.emit('stop_typing', chatId);
}

/** Listen for new messages in a room. Returns cleanup function. */
export function onNewMessage(
    handler: (msg: {
        chatId: string;
        senderId: string;
        senderName: string;
        text: string;
        sentAt: string;
    }) => void
): () => void {
    _socket?.on('new_message', handler);
    return () => { _socket?.off('new_message', handler); };
}

/** Listen for typing events in a room. Returns cleanup function. */
export function onTyping(
    handler: (data: { userId: string; displayName: string }) => void
): () => void {
    _socket?.on('typing', handler);
    return () => { _socket?.off('typing', handler); };
}
