// lib/socket.ts
// ─────────────────────────────────────────────────────────────
// Singleton socket.io-client for CampusBarter.
// Connects with the Azure AD JWT from lib/api.ts.
// ─────────────────────────────────────────────────────────────

import { io, Socket } from 'socket.io-client';
import { getApiBase, getApiToken } from './api';

let _socket: Socket | null = null;
const joinedRooms = new Set<string>();
const messageHandlers = new Set<(msg: {
    conversationId: string;
    chatId: string;
    senderId: string;
    senderName: string;
    text: string;
    sentAt: string;
}) => void>();
const typingHandlers = new Set<(data: { conversationId?: string; userId: string; displayName: string }) => void>();

function getTokenWithFallback(): string | null {
    const token = getApiToken();
    if (token) return token;
    
    // Web refresh fallback: recover token from localStorage when in-memory state is lost
    if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('campusbarter_token');
    }
    
    return null;
}

function normalizeMessage(msg: {
    conversationId?: string;
    chatId?: string;
    senderId: string;
    senderName: string;
    text: string;
    sentAt: string;
}) {
    const conversationId = msg.conversationId ?? msg.chatId ?? '';
    return {
        ...msg,
        conversationId,
        chatId: msg.chatId ?? conversationId,
    };
}

function dispatchNewMessage(msg: {
    conversationId?: string;
    chatId?: string;
    senderId: string;
    senderName: string;
    text: string;
    sentAt: string;
}) {
    const normalized = normalizeMessage(msg);
    messageHandlers.forEach((handler) => handler(normalized));
}

function dispatchTyping(data: { conversationId?: string; userId: string; displayName: string }) {
    typingHandlers.forEach((handler) => handler(data));
}

/** Connect and authenticate. Call after setApiToken() is set. */
export function connectSocket(): Socket {
    if (_socket) {
        if (!_socket.connected) _socket.connect();
        return _socket;
    }

    _socket = io(getApiBase(), {
        // Use a callback so socket.io reads the CURRENT token on every (re)connect,
        // including fallback to localStorage for web page refreshes.
        auth: (cb) => cb({ token: getTokenWithFallback() }),
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
    });

    _socket.on('connect', () => {
        console.log('[Socket] Connected');
        // Re-join active rooms after reconnect so real-time messages continue.
        joinedRooms.forEach((conversationId) => {
            _socket?.emit('join_conversation', conversationId);
        });
    });
    _socket.on('disconnect', () => console.log('[Socket] Disconnected'));
    _socket.on('connect_error', (err) => console.warn('[Socket] Error:', err.message));
    _socket.on('new_message', dispatchNewMessage);
    _socket.on('receive_message', dispatchNewMessage);
    _socket.on('typing', dispatchTyping);
    _socket.on('user_typing', dispatchTyping);

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
    if (!chatId) return;
    joinedRooms.add(chatId);
    if (!_socket) connectSocket();
    _socket?.emit('join_conversation', chatId);
}

/** Leave a chat room. */
export function leaveChat(chatId: string) {
    if (!chatId) return;
    joinedRooms.delete(chatId);
    _socket?.emit('leave_conversation', chatId);
}

/** Emit typing indicator to the chat room. */
export function emitTyping(chatId: string) {
    _socket?.emit('typing', chatId);
}

export function emitConversationMessage(data: {
    conversationId: string;
    text: string;
}) {
    _socket?.emit('send_message', data);
}

/** Emit stop-typing to the chat room. */
export function emitStopTyping(chatId: string) {
    _socket?.emit('stop_typing', chatId);
}

/** Listen for new messages in a room. Returns cleanup function. */
export function onNewMessage(
    handler: (msg: {
        conversationId: string;
        chatId: string;
        senderId: string;
        senderName: string;
        text: string;
        sentAt: string;
    }) => void
): () => void {
    messageHandlers.add(handler);
    return () => {
        messageHandlers.delete(handler);
    };
}

/** Listen for typing events in a room. Returns cleanup function. */
export function onTyping(
    handler: (data: { conversationId?: string; userId: string; displayName: string }) => void
): () => void {
    typingHandlers.add(handler);
    return () => {
        typingHandlers.delete(handler);
    };
}
