// lib/socket.ts
// ─────────────────────────────────────────────────────────────
// Singleton socket.io-client for CampusBarter.
// Connects with the Azure AD JWT from lib/api.ts.
// ─────────────────────────────────────────────────────────────

import { io, Socket } from 'socket.io-client';
import { getApiBase, getApiToken } from './api';

console.log('[Socket] Module loaded successfully');


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
    console.log('[Socket] 📨 Received message via WebSocket:', {
        conversationId: msg.conversationId ?? msg.chatId,
        senderId: msg.senderId,
        textPreview: msg.text?.substring(0, 30) + '...',
        handlersCount: messageHandlers.size,
    });
    const normalized = normalizeMessage(msg);
    messageHandlers.forEach((handler) => handler(normalized));
    console.log('[Socket] ✅ Message dispatched to', messageHandlers.size, 'handlers');
}

function dispatchTyping(data: { conversationId?: string; userId: string; displayName: string }) {
    typingHandlers.forEach((handler) => handler(data));
}

/** Connect and authenticate. Call after setApiToken() is set. */
export function connectSocket(): Socket {
    console.log('[Socket] connectSocket() called');
    console.log('[Socket] API Base:', getApiBase());
    console.log('[Socket] Token present:', !!getApiToken());

    if (_socket) {
        console.log('[Socket] Reusing existing socket, connected:', _socket.connected);
        if (!_socket.connected) _socket.connect();
        return _socket;
    }

    console.log('[Socket] Creating new socket instance...');
    _socket = io(getApiBase(), {
        // Use a callback so socket.io reads the CURRENT token on every (re)connect,
        // instead of capturing a stale/null value at construction time.
        auth: (cb) => {
            const token = getApiToken();
            console.log('[Socket] Auth callback - token:', token?.substring(0, 20) + '...');
            cb({ token });
        },
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
    });
    console.log('[Socket] Socket instance created');

    _socket.on('connect', () => {
        console.log('[Socket] ✅ Connected successfully!');
        console.log('[Socket] Transport:', _socket?.io?.engine?.transport?.name);
        console.log('[Socket] Socket ID:', _socket?.id);
        // Expose globally for debugging
        if (typeof window !== 'undefined') {
            (window as any).__socket = _socket;
            console.log('[Socket] Exposed as window.__socket');
        }
        // Re-join active rooms after reconnect so real-time messages continue.
        joinedRooms.forEach((conversationId) => {
            console.log('[Socket] Re-joining room:', conversationId);
            _socket?.emit('join_conversation', conversationId);
        });
    });
    _socket.on('disconnect', (reason) => {
        console.log('[Socket] ❌ Disconnected. Reason:', reason);
    });
    _socket.on('connect_error', (err) => {
        console.error('[Socket] ⚠️ Connection Error:', err.message);
        console.error('[Socket] Error details:', err);
    });
    _socket.on('error', (err) => {
        console.error('[Socket] ⚠️ Socket Error:', err);
    });
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
    console.log('[Socket] joinChat called for:', chatId);
    if (!chatId) {
        console.log('[Socket] joinChat aborted - no chatId');
        return;
    }
    joinedRooms.add(chatId);
    if (!_socket) {
        console.log('[Socket] No socket exists, calling connectSocket()...');
        connectSocket();
    }
    console.log('[Socket] Emitting join_conversation for:', chatId);
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
