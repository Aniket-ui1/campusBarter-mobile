// context/DataContext.tsx
// ─────────────────────────────────────────────────────────────────
// All app data (listings, chats, notifications) is stored in Firestore.
// Real-time onSnapshot listeners keep UI in sync automatically.
// ─────────────────────────────────────────────────────────────────

import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    closeListing,
    createListing,
    deleteListing,
    FSChat,
    FSListing,
    FSMessage,
    FSNotification,
    sendMessage as fsSendMessage,
    startChat as fsStartChat,
    subscribeToChats,
    subscribeToListings,
    subscribeToMessages,
    subscribeToNotifications,
    createNotification as fsCreateNotification,
    markNotificationRead as fsMarkRead,
    markAllNotificationsRead as fsMarkAllRead,
} from "../lib/firestore";
import { useAuth } from "./AuthContext";

// ── Public types ──────────────────────────────────────────────────

// Re-export Firestore types under the names the rest of the app uses
export type Listing = FSListing;
export type Chat = FSChat & { messages: FSMessage[] };
export type AppNotification = FSNotification;

interface DataContextType {
    listings: Listing[];
    addListing: (
        listing: Omit<Listing, "id" | "createdAt" | "status">
    ) => Promise<void>;
    getListingById: (id: string) => Listing | undefined;
    closeListing: (id: string) => Promise<void>;
    deleteListing: (id: string) => Promise<void>;

    chats: Chat[];
    startChat: (
        listingId: string,
        listingTitle: string,
        userIds: string[]
    ) => Promise<string>;
    sendMessage: (chatId: string, text: string, senderId: string) => Promise<void>;
    getChatById: (chatId: string) => Chat | undefined;
    subscribeToMessages: (
        chatId: string,
        cb: (messages: FSMessage[]) => void
    ) => () => void;

    notifications: AppNotification[];
    unreadCount: number;
    addNotification: (
        userId: string,
        data: Omit<AppNotification, "id" | "createdAt" | "read">
    ) => Promise<void>;
    markRead: (notifId: string) => Promise<void>;
    markAllRead: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("useData must be used within a DataProvider");
    return context;
};

// ── Provider ──────────────────────────────────────────────────────

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [listings, setListings] = useState<Listing[]>([]);
    const [chats, setChats] = useState<Chat[]>([]);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    // ── Subscribe to listings ─────────────────────────────────────
    useEffect(() => {
        const unsub = subscribeToListings((data) => setListings(data));
        return unsub;
    }, []);

    // ── Subscribe to chats for the current user ───────────────────
    useEffect(() => {
        if (!user) {
            setChats([]);
            return;
        }
        const unsub = subscribeToChats(user.id, (data) =>
            // Cast to Chat — messages are loaded per-chat in the chat screen
            setChats(data.map((c) => ({ ...c, messages: [] })))
        );
        return unsub;
    }, [user?.id]);

    // ── Subscribe to notifications for the current user ───────────
    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }
        const unsub = subscribeToNotifications(user.id, (data) =>
            setNotifications(data)
        );
        return unsub;
    }, [user?.id]);

    const unreadCount = useMemo(
        () => notifications.filter((n) => !n.read).length,
        [notifications]
    );

    // ── Listings API ──────────────────────────────────────────────

    const addListing = async (
        newListing: Omit<Listing, "id" | "createdAt" | "status">
    ) => {
        await createListing(newListing);
    };

    const getListingById = (id: string) => listings.find((l) => l.id === id);

    const handleCloseListing = async (id: string) => {
        await closeListing(id);
    };

    const handleDeleteListing = async (id: string) => {
        await deleteListing(id);
    };

    // ── Chats API ─────────────────────────────────────────────────

    const startChat = async (
        listingId: string,
        listingTitle: string,
        userIds: string[]
    ) => {
        return fsStartChat(listingId, listingTitle, userIds);
    };

    const sendMessage = async (
        chatId: string,
        text: string,
        senderId: string
    ) => {
        await fsSendMessage(chatId, senderId, text);
    };

    const getChatById = (chatId: string) => chats.find((c) => c.id === chatId);

    // ── Notifications API ─────────────────────────────────────────

    const addNotification = async (
        userId: string,
        data: Omit<AppNotification, "id" | "createdAt" | "read">
    ) => {
        await fsCreateNotification(userId, data);
    };

    const markRead = async (notifId: string) => {
        if (!user) return;
        await fsMarkRead(user.id, notifId);
    };

    const markAllRead = async () => {
        if (!user) return;
        await fsMarkAllRead(user.id);
    };

    return (
        <DataContext.Provider
            value={{
                listings,
                addListing,
                getListingById,
                closeListing: handleCloseListing,
                deleteListing: handleDeleteListing,
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
            }}
        >
            {children}
        </DataContext.Provider>
    );
};
