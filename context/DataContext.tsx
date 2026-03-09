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
    getListings,
    getChats,
    getMessages,
    sendMessage as apiSendMessage,
    startChat as apiStartChat,
    getNotifications,
    markNotificationRead as apiMarkRead,
    markAllNotificationsRead as apiMarkAllRead,
    createListing as apiCreateListing,
    closeListing as apiCloseListing,
    deleteListing as apiDeleteListing,
    ApiListing,
    ApiMessage,
    ApiChat,
    ApiNotification,
} from "../lib/api";
import { onNewMessage, joinChat, leaveChat } from "../lib/socket";
import { useAuth } from "./AuthContext";

// ── Public types ──────────────────────────────────────────────────

// Re-export as the names the rest of the app already uses
export type Listing = ApiListing;
export type Chat = ApiChat & { messages: ApiMessage[] };
export type AppNotification = ApiNotification;

// FSMessage alias so existing screens don't need changing
export type FSMessage = ApiMessage;

interface DataContextType {
    listings: Listing[];
    addListing: (listing: Omit<Listing, "id" | "createdAt" | "status"> & { category?: string }) => Promise<void>;
    getListingById: (id: string) => Listing | undefined;
    closeListing: (id: string) => Promise<void>;
    deleteListing: (id: string) => Promise<void>;
    refreshListings: () => Promise<void>;

    chats: Chat[];
    startChat: (listingId: string, listingTitle: string, userIds: string[]) => Promise<string>;
    sendMessage: (chatId: string, text: string, senderId: string) => Promise<void>;
    getChatById: (chatId: string) => Chat | undefined;
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
    const { user } = useAuth();
    const [listings, setListings] = useState<Listing[]>([]);
    const [chats, setChats] = useState<Chat[]>([]);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    // Ref map: chatId → message array (for socket updates)
    const chatMessages = useRef<Record<string, ApiMessage[]>>({});
    // Callbacks registered by chat screens
    const msgCallbacks = useRef<Record<string, ((msgs: ApiMessage[]) => void)[]>>({});

    // ── Load listings ─────────────────────────────────────────────
    const refreshListings = useCallback(async () => {
        try {
            const data = await getListings();
            setListings(data);
        } catch (e) {
            console.warn("[Data] Could not load listings:", e);
        }
    }, []);

    useEffect(() => {
        void refreshListings();
        const id = setInterval(refreshListings, 30_000); // poll every 30s
        return () => clearInterval(id);
    }, [refreshListings]);

    // ── Load chats ────────────────────────────────────────────────
    const refreshChats = useCallback(async () => {
        if (!user) { setChats([]); return; }
        try {
            const data = await getChats();
            setChats(data.map(c => ({ ...c, messages: chatMessages.current[c.id] ?? [] })));
        } catch (e) {
            console.warn("[Data] Could not load chats:", e);
        }
    }, [user?.id]);

    useEffect(() => {
        void refreshChats();
    }, [refreshChats]);

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
        void refreshNotifications();
        const id = setInterval(refreshNotifications, 60_000); // poll every 60s
        return () => clearInterval(id);
    }, [refreshNotifications]);

    // ── Socket.io: listen for new messages ────────────────────────
    useEffect(() => {
        const cleanup = onNewMessage((msg) => {
            const { chatId } = msg;
            // Append to local message cache
            const prev = chatMessages.current[chatId] ?? [];
            const newMsg: ApiMessage = {
                ...msg,
                id: `socket-${msg.senderId}-${Date.now()}`, // local id until next REST refresh
            };
            chatMessages.current[chatId] = [...prev, newMsg];
            // Notify any subscribed screen
            (msgCallbacks.current[chatId] ?? []).forEach(cb =>
                cb(chatMessages.current[chatId])
            );
            // Update chat list last message
            setChats(cs => cs.map(c =>
                c.id === chatId
                    ? { ...c, lastMessage: msg.text, lastMessageAt: msg.sentAt }
                    : c
            ));
        });
        return cleanup;
    }, []);

    const unreadCount = useMemo(
        () => notifications.filter(n => !n.read).length,
        [notifications]
    );

    // ── Listings API ──────────────────────────────────────────────

    const addListing = async (
        data: Omit<Listing, "id" | "createdAt" | "status"> & { category?: string }
    ) => {
        await apiCreateListing({
            type: data.type,
            title: data.title,
            description: data.description,
            credits: data.credits,
            category: data.category,
        });
        await refreshListings(); // refresh feed immediately after posting
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
        _userIds: string[] // kept for API compat — server infers from token
    ) => {
        const chatId = await apiStartChat(listingId, listingTitle);
        await refreshChats();
        joinChat(chatId);
        return chatId;
    };

    const sendMessage = async (chatId: string, text: string, _senderId: string) => {
        await apiSendMessage(chatId, text);
        // Optimistic: local update will also arrive via socket
    };

    const getChatById = (id: string) => chats.find(c => c.id === id);

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
        getMessages(chatId).then(msgs => {
            chatMessages.current[chatId] = msgs;
            cb(msgs);
        }).catch(console.warn);

        // Join socket room
        joinChat(chatId);

        // Register callback
        if (!msgCallbacks.current[chatId]) msgCallbacks.current[chatId] = [];
        msgCallbacks.current[chatId].push(cb);

        return () => {
            leaveChat(chatId);
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
            n.id === notifId ? { ...n, read: true } : n
        ));
    };

    const markAllRead = async () => {
        await apiMarkAllRead();
        setNotifications(ns => ns.map(n => ({ ...n, read: true })));
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
                startChat,
                sendMessage,
                getChatById,
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
