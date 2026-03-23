// context/DataContext.tsx
// ─────────────────────────────────────────────────────────────────
// All app data (listings, chats, notifications) now fetched from
// the CampusBarter Azure API instead of Firestore.
//
// Real-time: socket.io for chat messages.
// Fallback:  polling (listings every 30s, notifications every 60s).
// ─────────────────────────────────────────────────────────────────

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ApiChat,
    closeListing as apiCloseListing,
    createListing as apiCreateListing,
    deleteChat as apiDeleteChat,
    deleteListing as apiDeleteListing,
    ApiListing,
    markAllNotificationsRead as apiMarkAllRead,
    markNotificationRead as apiMarkRead,
    ApiMessage,
    ApiNotification,
    sendMessage as apiSendMessage,
    startChat as apiStartChat,
    getChats,
    getListings,
    getMessages,
    getNotifications,
} from "../lib/api";
import { emitMarkRead, joinChat, leaveChat, onNewListing, onNewMessage, onNewNotification } from "../lib/socket";
import { chatApi } from "../services/chatApi";
import { useAuth } from "./AuthContext";

// ── Public types ──────────────────────────────────────────────────

// Re-export as the names the rest of the app already uses
export type Listing = ApiListing;
export type Chat = ApiChat & { messages: ApiMessage[] };
export type AppNotification = ApiNotification;

// FSMessage alias so existing screens don't need changing
export type FSMessage = ApiMessage;

function dedupeChatsByParticipant(chats: Chat[]): Chat[] {
    const chatsByParticipant = new Map<string, Chat>();

    for (const chat of chats) {
        const key = chat.otherUserId || chat.otherUserName || chat.id;
        const existing = chatsByParticipant.get(key);
        if (!existing) {
            chatsByParticipant.set(key, chat);
            continue;
        }

        const existingTime = new Date(existing.lastMessageAt || 0).getTime();
        const nextTime = new Date(chat.lastMessageAt || 0).getTime();
        if (nextTime >= existingTime) {
            chatsByParticipant.set(key, chat);
        }
    }

    return Array.from(chatsByParticipant.values()).sort((left, right) => {
        const leftTime = new Date(left.lastMessageAt || 0).getTime();
        const rightTime = new Date(right.lastMessageAt || 0).getTime();
        return rightTime - leftTime;
    });
}

interface DataContextType {
    listings: Listing[];
    addListing: (listing: Omit<Listing, "id" | "createdAt" | "status"> & { category?: string }) => Promise<void>;
    getListingById: (id: string) => Listing | undefined;
    closeListing: (id: string) => Promise<void>;
    deleteListing: (id: string) => Promise<void>;
    refreshListings: () => Promise<void>;

    chats: Chat[];
    unreadChatsCount: number;
    startChat: (listingId: string, listingTitle: string, userIds: string[], listingOwnerId?: string) => Promise<string>;
    sendMessage: (chatId: string, text: string, senderId: string) => Promise<void>;
    markChatRead: (chatId: string) => Promise<void>;
    deleteChat: (chatId: string) => Promise<void>;
    getChatById: (chatId: string) => Chat | undefined;
    loadOlderMessages: (chatId: string, page: number, limit?: number) => Promise<ApiMessage[]>;
    subscribeToMessages: (chatId: string, cb: (msgs: ApiMessage[]) => void) => () => void;

    notifications: AppNotification[];
    unreadCount: number;
    addNotification: () => Promise<void>; // server-side only — kept for compat
    markRead: (notifId: string) => Promise<void>;
    markAllRead: () => Promise<void>;
    refreshNotifications: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
    const ctx = useContext(DataContext);
    if (!ctx) throw new Error("useData must be used within a DataProvider");
    return ctx;
};

// ── Provider ──────────────────────────────────────────────────────

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, isLoading: authLoading } = useAuth();
    const [listings, setListings] = useState<Listing[]>([]);
    const [chats, setChats] = useState<Chat[]>([]);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    // Ref map: chatId → message array (for socket updates)
    const chatMessages = useRef<Record<string, ApiMessage[]>>({});
    // Callbacks registered by chat screens
    const msgCallbacks = useRef<Record<string, ((msgs: ApiMessage[]) => void)[]>>({});
    const activeChatSubscriptions = useRef<Record<string, number>>({});

    // ── Load listings ─────────────────────────────────────────────
    const refreshListings = useCallback(async () => {
        try {
            const data = await getListings();
            setListings(data);
        } catch (e) {
            console.warn("[Data] Could not load listings:", e);
        }
    }, []);

    // Load initial listings (only once when auth finishes)
    useEffect(() => {
        if (authLoading) return;
        void refreshListings();
    }, [authLoading, refreshListings]);

    // Listen to real-time new listings via Socket
    useEffect(() => {
        return onNewListing((newListing) => {
            setListings(prev => [newListing, ...prev.filter(l => l.id !== newListing.id)]);
        });
    }, []);

    // ── Load chats ────────────────────────────────────────────────
    const refreshChats = useCallback(async () => {
        if (!user) { setChats([]); return; }
        try {
            // Try v2 API first
            const v2Data = await chatApi.getConversations();
            if (v2Data.conversations && v2Data.conversations.length > 0) {
                const normalizedChats = v2Data.conversations.map(c => ({
                    id: c.conversationId,
                    conversationId: c.conversationId,
                    otherUserId: c.otherUser?.id ?? '',
                    otherUserName: c.otherUser?.name ?? 'Chat',
                    lastMessage: c.lastMessage ?? '',
                    lastMessageAt: c.lastMessageTime ?? new Date().toISOString(),
                    unreadCount: c.unreadCount ?? 0,
                    listingId: '',
                    listingTitle: '',
                    messages: chatMessages.current[c.conversationId] ?? [],
                }));
                setChats(normalizedChats);
                return;
            }
        } catch (e) {
            console.warn("[Data] V2 chat API failed, falling back to legacy:", e);
        }

        // Fallback to legacy API
        try {
            const data = await getChats(user.id);
            const normalizedChats = data.map(c => ({
                ...c,
                id: c.conversationId ?? c.id,
                messages: chatMessages.current[c.conversationId ?? c.id] ?? [],
            }));
            setChats(dedupeChatsByParticipant(normalizedChats));
        } catch (e) {
            console.warn("[Data] Could not load chats:", e);
        }
    }, [user?.id]);

    useEffect(() => {
        if (authLoading) return; // wait for auth to resolve before fetching user data
        void refreshChats();
    }, [authLoading, refreshChats]);

    // ── Load notifications ────────────────────────────────────────
    const refreshNotifications = useCallback(async () => {
        if (!user) { setNotifications([]); return; }
        try {
            const data = await getNotifications();
            setNotifications(data);
        } catch (e) {
            console.warn("[Data] Could not load notifications:", e);
        }
    }, [user?.id]);

    useEffect(() => {
        if (authLoading) return; // wait for auth to resolve before fetching user data
        void refreshNotifications();
    }, [authLoading, refreshNotifications]);

    // NOTE: Real-time notifications are handled below by the onNotification listener.
    // The onNewNotification listener was removed to prevent every notification
    // from being added twice (both handlers fire on the same socket event).

    // ── Socket.io: listen for new messages ────────────────────────
    useEffect(() => {
        const cleanup = onNewMessage((msg) => {
            const chatId = msg.conversationId ?? msg.chatId;
            // Dedup: if a messageId is present (v2 system emits to both room + user room),
            // skip if already in cache to prevent the same message appearing twice.
            const msgId = (msg as any).messageId;
            const prev = chatMessages.current[chatId] ?? [];
            if (msgId && prev.some(m => (m as any).messageId === msgId || m.id === msgId)) return;
            // Append to local message cache
            const newMsg: ApiMessage = {
                ...msg,
                id: msgId ?? `socket-${msg.senderId}-${Date.now()}`,
            };
            chatMessages.current[chatId] = [...prev, newMsg];
            // Notify any subscribed screen
            (msgCallbacks.current[chatId] ?? []).forEach(cb =>
                cb(chatMessages.current[chatId])
            );
            // Update chat list preview and unread count, or refresh if the chat is hidden/not loaded.
            setChats((currentChats) => {
                const chatExists = currentChats.some((chat) => chat.id === chatId);
                if (!chatExists) {
                    void refreshChats();
                    return currentChats;
                }

                return dedupeChatsByParticipant(currentChats.map((chat) => {
                    if (chat.id !== chatId) return chat;

                    const isActive = (activeChatSubscriptions.current[chatId] ?? 0) > 0;
                    const nextUnreadCount = msg.senderId === user?.id || isActive
                        ? 0
                        : (chat.unreadCount ?? 0) + 1;

                    return {
                        ...chat,
                        lastMessage: msg.text,
                        lastMessageAt: msg.sentAt,
                        unreadCount: nextUnreadCount,
                    };
                }));
            });
        });
        return cleanup;
    }, [refreshChats, user?.id]);

    // ── Socket.io: listen for new notifications ───────────────────
    useEffect(() => {
        const cleanup = onNewNotification((notif) => {
            const incomingId = (notif as any).notificationId ?? `socket-${Date.now()}`;
            setNotifications(prev => {
                // Skip if already present (prevents duplicate on fast socket + HTTP race)
                if (prev.some(n => n.notificationId === incomingId)) return prev;
                return [{
                    notificationId: incomingId,
                    userId: user?.id ?? '',
                    type: notif.type,
                    title: notif.title,
                    message: notif.body,
                    relatedEntityId: notif.relatedId ?? null,
                    relatedEntityType: null,
                    actionUrl: null,
                    isRead: false,
                    createdAt: notif.createdAt,
                    // Legacy fields
                    id: incomingId,
                    body: notif.body,
                    read: false,
                    relatedId: notif.relatedId,
                }, ...prev];
            });
        });
        return cleanup;
    }, [user?.id]);

    // Bell badge: only bell-worthy types (request, review, match)
    // Chat messages and accepted events are push-only and never stored to bell
    const BELL_TYPES = ['request', 'review', 'match'];
    const unreadCount = useMemo(
        () => notifications.filter(n =>
            BELL_TYPES.includes(n.type) && !n.isRead && !n.read
        ).length,
        [notifications]
    );

    const unreadChatsCount = useMemo(
        () => chats.filter(chat => (chat.unreadCount ?? 0) > 0).length,
        [chats]
    );

    // ── Listings API ──────────────────────────────────────────────

    const addListing = async (
        data: Omit<Listing, "id" | "createdAt" | "status"> & { category?: string }
    ) => {
        // Let creation errors propagate to the caller (post screen shows Alert)
        const newId = await apiCreateListing({
            type: data.type,
            title: data.title,
            description: data.description,
            credits: data.credits,
            category: data.category,
        });

        // 1. Optimistic Update so the current user sees it immediately (handle race condition with socket)
        setListings(prev => {
            if (prev.some(l => l.id === newId)) return prev;
            return [{
                ...data,
                id: newId,
                createdAt: new Date().toISOString(),
                status: "OPEN" as const
            } as Listing, ...prev];
        });

        // 2. Note: Other users will get this via the `new_listing` socket event 
        // once you deploy the updated backend code to Azure!
    };

    const getListingById = (id: string) => listings.find(l => l.id === id);

    const handleCloseListing = async (id: string) => {
        await apiCloseListing(id);
        setListings(ls => ls.filter(l => l.id !== id));
    };

    const handleDeleteListing = async (id: string) => {
        await apiDeleteListing(id);
        setListings(ls => ls.filter(l => l.id !== id));
    };

    // ── Chats API ─────────────────────────────────────────────────

    const startChat = async (
        listingId: string,
        listingTitle: string,
        userIds: string[], // kept for API compat — derive other user id when needed
        listingOwnerId?: string
    ) => {
        const otherUserId = listingOwnerId || userIds.find((id) => id && id !== user?.id);
        if (!otherUserId) {
            throw new Error('otherUserId is required to start a conversation');
        }

        const normalizedListingId = listingId === 'profile' ? '' : listingId;

        let chatId: string;
        try {
            chatId = await apiStartChat(normalizedListingId, listingTitle, otherUserId);
        } catch (error) {
            // Fallback to direct conversation when listing lookup fails (e.g. stale post id).
            if ((error as { status?: number }).status === 404 && normalizedListingId) {
                chatId = await apiStartChat('', listingTitle, otherUserId);
            } else {
                throw error;
            }
        }

        await refreshChats();
        joinChat(chatId);
        return chatId;
    };

    const sendMessage = async (chatId: string, text: string, _senderId: string) => {
        await apiSendMessage(chatId, text);
    };

    const markChatRead = async (chatId: string) => {
        if (!user?.id) return;
        // Mark read via socket (zero API calls) — backend updates DB + emits messages_seen
        emitMarkRead(chatId);
        // Update local state to clear badge immediately
        setChats((currentChats) => currentChats.map((chat) =>
            chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
        ));
    };

    const deleteChat = async (chatId: string) => {
        if (!user?.id) return;
        await apiDeleteChat(chatId, user.id);
        delete chatMessages.current[chatId];
        delete msgCallbacks.current[chatId];
        delete activeChatSubscriptions.current[chatId];
        setChats((currentChats) => currentChats.filter((chat) => chat.id !== chatId));
    };

    const getChatById = (id: string) => chats.find(c => c.id === id);

    const loadOlderMessages = async (chatId: string, page: number, limit = 30) => {
        const olderMessages = [...(await getMessages(chatId, page, limit))].reverse();
        const existingMessages = chatMessages.current[chatId] ?? [];
        const seenIds = new Set(existingMessages.map((message) => message.id));
        const merged = [
            ...olderMessages.filter((message) => !seenIds.has(message.id)),
            ...existingMessages,
        ];
        chatMessages.current[chatId] = merged;
        (msgCallbacks.current[chatId] ?? []).forEach((cb) => cb(merged));
        return olderMessages;
    };

    /**
     * Subscribe to real-time messages for a chat room.
     * Loads history from API first, then streams new messages via socket.
     * Returns unsubscribe function — call in useEffect cleanup.
     */
    const subscribeToMessages = (
        chatId: string,
        cb: (msgs: ApiMessage[]) => void
    ): (() => void) => {
        // Load history
        getMessages(chatId, 1, 30).then((msgs) => {
            const orderedMessages = [...msgs].reverse();
            chatMessages.current[chatId] = orderedMessages;
            cb(orderedMessages);
        }).catch((error) => {
            console.warn('[Data] getMessages failed:', error);
            chatMessages.current[chatId] = [];
            cb([]);
        });

        // Join socket room
        joinChat(chatId);
        activeChatSubscriptions.current[chatId] = (activeChatSubscriptions.current[chatId] ?? 0) + 1;
        // Mark read via socket (no API call)
        emitMarkRead(chatId);

        // Register callback
        if (!msgCallbacks.current[chatId]) msgCallbacks.current[chatId] = [];
        msgCallbacks.current[chatId].push(cb);

        return () => {
            leaveChat(chatId);
            activeChatSubscriptions.current[chatId] = Math.max(
                (activeChatSubscriptions.current[chatId] ?? 1) - 1,
                0
            );
            msgCallbacks.current[chatId] = (msgCallbacks.current[chatId] ?? [])
                .filter(fn => fn !== cb);
        };
    };

    // ── Notifications API ─────────────────────────────────────────

    const addNotification = async () => {
        // Notifications are created server-side — this is a no-op for compat
        console.warn("[Data] addNotification is server-side only in Azure mode");
    };

    const markRead = async (notifId: string) => {
        await apiMarkRead(notifId);
        setNotifications(ns => ns.map(n =>
            (n.notificationId === notifId || n.id === notifId) ? { ...n, read: true, isRead: true } : n
        ));
    };

    const markAllRead = async () => {
        await apiMarkAllRead();
        setNotifications(ns => ns.map(n => ({ ...n, read: true, isRead: true })));
    };

    return (
        <DataContext.Provider
            value={{
                listings,
                addListing,
                getListingById,
                closeListing: handleCloseListing,
                deleteListing: handleDeleteListing,
                refreshListings,
                chats,
                unreadChatsCount,
                startChat,
                sendMessage,
                markChatRead,
                deleteChat,
                getChatById,
                loadOlderMessages,
                subscribeToMessages,
                notifications,
                unreadCount,
                addNotification,
                markRead,
                markAllRead,
                refreshNotifications,
            }}
        >
            {children}
        </DataContext.Provider>
    );
};
