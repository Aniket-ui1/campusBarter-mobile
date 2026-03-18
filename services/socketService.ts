// services/socketService.ts
// ─────────────────────────────────────────────────────────────
// Auth-aware Socket.io singleton for Chat System v2.
// Re-exports the same underlying socket from lib/socket.ts so
// both the legacy and v2 systems share one physical connection.
// ─────────────────────────────────────────────────────────────

import {
    connectSocket,
    disconnectSocket,
    emitStopTyping,
    emitTyping,
    getSocket,
    joinChat,
    leaveChat,
    onNewMessage,
    onTyping,
} from '../lib/socket';
import type { ChatMessage } from './chatApi';

export type { };

// ─ types for v2 socket events ─────────────────────────────────
export interface ConversationUpdatedPayload {
    conversationId: string;
    lastMessage: string;
    lastMessageTime: string;
    lastSenderId: string;
}

export interface MessageSeenPayload {
    conversationId: string;
    readByUserId: string;
}

export interface MessageDeletedPayload {
    messageId: string;
    conversationId: string;
}

// ── Connect / Disconnect ──────────────────────────────────────
/** Connect the socket (call after login). */
export { connectSocket as connectChatSocket, disconnectSocket as disconnectChatSocket };

// ── Conversation room management ──────────────────────────────
/** Join a conversation room to receive real-time messages. */
export function joinConversation(conversationId: string): void {
    joinChat(conversationId);
}

/** Leave a conversation room. */
export function leaveConversation(conversationId: string): void {
    leaveChat(conversationId);
}

// ── Message events ────────────────────────────────────────────
/** Subscribe to incoming messages. Returns unsubscribe fn. */
export function onReceiveMessage(
    handler: (msg: Partial<ChatMessage> & { conversationId: string }) => void
): () => void {
    return onNewMessage((raw) => {
        handler({
            messageId:      (raw as any).messageId ?? (raw as any).id ?? `sock-${(raw as any).sentAt ?? Date.now()}-${raw.senderId}`,
            conversationId: raw.conversationId ?? (raw as any).chatId,
            senderId:       raw.senderId,
            senderName:     raw.senderName,
            messageType:    (raw as any).messageType ?? 'text',
            textContent:    (raw as any).textContent ?? raw.text ?? null,
            mediaUrl:       (raw as any).mediaUrl ?? null,
            mediaName:      (raw as any).mediaName ?? null,
            isRead:         false,
            isDeleted:      false,
            createdAt:      (raw as any).createdAt ?? raw.sentAt ?? new Date().toISOString(),
        });
    });
}

/** Subscribe to conversation list preview updates. Returns unsubscribe fn. */
export function onConversationUpdated(
    handler: (payload: ConversationUpdatedPayload) => void
): () => void {
    const sock = getSocket();
    if (!sock) {
        connectSocket();
        const newSock = getSocket();
        if (newSock) {
            newSock.off('conversation_updated'); // 🔥 Clear duplicates
            newSock.on('conversation_updated', (data) => {
                console.log('[Socket] conversation_updated EVENT:', data);
                handler(data);
            });
            return () => newSock.off('conversation_updated', handler);
        }
        return () => {};
    }
    sock.off('conversation_updated'); // 🔥 Clear duplicates
    sock.on('conversation_updated', (data) => {
        console.log('[Socket] conversation_updated EVENT:', data);
        handler(data);
    });
    return () => sock.off('conversation_updated', handler);
}

/** Subscribe to "messages seen" (read receipts). Returns unsubscribe fn. */
export function onMessagesSeen(
    handler: (payload: MessageSeenPayload) => void
): () => void {
    const sock = getSocket() ?? connectSocket();
    sock.off('messages_seen'); // 🔥 Clear duplicates
    sock.on('messages_seen', handler);
    return () => sock.off('messages_seen', handler);
}

/** Subscribe to "message deleted" events. Returns unsubscribe fn. */
export function onMessageDeleted(
    handler: (payload: MessageDeletedPayload) => void
): () => void {
    const sock = getSocket() ?? connectSocket();
    sock.on('message_deleted', handler);
    return () => sock.off('message_deleted', handler);
}

/** Subscribe to socket 'connect' event (for reconnect fallback). Returns unsubscribe fn. */
export function onSocketConnect(
    handler: () => void
): () => void {
    const sock = getSocket();
    if (!sock) {
        // Socket not initialized yet — try connecting first
        const newSock = connectSocket();
        if (newSock) {
            newSock.on('connect', handler);
            return () => newSock.off('connect', handler);
        }
        return () => {};
    }
    sock.on('connect', handler);
    return () => sock.off('connect', handler);
}

// ── Typing indicators ─────────────────────────────────────────
/** Emit typing-start to server. */
export { emitStopTyping, emitTyping as emitTypingStart, onTyping as onUserTyping };

/** Emit typing-stop after debounce. Returns cleanup fn. */
export function createTypingEmitter(conversationId: string): {
    onInput: () => void;
    cleanup: () => void;
} {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const onInput = () => {
        emitTyping(conversationId);
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => emitStopTyping(conversationId), 1500);
    };

    const cleanup = () => {
        if (timer) clearTimeout(timer);
        emitStopTyping(conversationId);
    };

    return { onInput, cleanup };
}
