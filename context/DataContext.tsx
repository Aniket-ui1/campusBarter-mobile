// context/DataContext.tsx
// ─────────────────────────────────────────────────────────────────
// All app data (listings, chats, messages) is stored in Firestore.
// Real-time onSnapshot listeners keep UI in sync automatically.
// ─────────────────────────────────────────────────────────────────

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";
import {
    closeListing,
    createListing,
    FSChat,
    FSListing,
    FSMessage,
    sendMessage as fsSendMessage,
    startChat as fsStartChat,
    subscribeToChats,
    subscribeToListings,
    subscribeToMessages,
} from "../lib/firestore";
import { useAuth } from "./AuthContext";

// ── Public types ──────────────────────────────────────────────────

// Re-export Firestore types under the names the rest of the app uses
export type Listing = FSListing;
export type Chat = FSChat & { messages: FSMessage[] };

interface DataContextType {
    listings: Listing[];
    addListing: (
        listing: Omit<Listing, "id" | "createdAt" | "status">
    ) => Promise<void>;
    getListingById: (id: string) => Listing | undefined;
    closeListing: (id: string) => Promise<void>;

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

    // ── Listings API ──────────────────────────────────────────────

    const addListing = async (
        newListing: Omit<Listing, "id" | "createdAt" | "status">
    ) => {
        await createListing(newListing);
        // onSnapshot will push the new doc automatically — no setState needed
    };

    const getListingById = (id: string) => listings.find((l) => l.id === id);

    const handleCloseListing = async (id: string) => {
        await closeListing(id);
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

    return (
        <DataContext.Provider
            value={{
                listings,
                addListing,
                getListingById,
                closeListing: handleCloseListing,
                chats,
                startChat,
                sendMessage,
                getChatById,
                subscribeToMessages,
            }}
        >
            {children}
        </DataContext.Provider>
    );
};
