import React, { createContext, useContext, useState } from "react";
// Wait, I am overwriting the file, so I need to redefine interfaces.

export interface Listing {
    id: string;
    type: 'OFFER' | 'REQUEST';
    title: string;
    description: string;
    credits: number;
    userId: string;
    userName: string;
    createdAt: string;
    status: 'OPEN' | 'CLOSED';
}

export interface Chat {
    id: string;
    listingId: string;
    listingTitle: string;
    participants: string[]; // userIds
    messages: Array<{
        id: string;
        senderId: string;
        text: string;
        timestamp: string;
    }>;
}

interface DataContextType {
    listings: Listing[];
    addListing: (listing: Omit<Listing, "id" | "createdAt" | "status" | "userName">) => void;
    getListingById: (id: string) => Listing | undefined;
    chats: Chat[];
    startChat: (listingId: string, listingTitle: string, userIds: string[]) => string; // Returns chatId
    sendMessage: (chatId: string, text: string, senderId: string) => void;
    getChatById: (chatId: string) => Chat | undefined;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error("useData must be used within a DataProvider");
    }
    return context;
};

// Mock Data
const MOCK_LISTINGS: Listing[] = [
    {
        id: "1",
        type: "OFFER",
        title: "Math Tutoring (Calculus I)",
        description: "I can help with derivatives and integrals. Available evenings.",
        credits: 1,
        userId: "user2",
        userName: "MathWhiz",
        createdAt: new Date().toISOString(),
        status: "OPEN",
    },
    {
        id: "2",
        type: "REQUEST",
        title: "Moving Help",
        description: "Need help moving a couch this Saturday.",
        credits: 2,
        userId: "user3",
        userName: "MoverNeeded",
        createdAt: new Date().toISOString(),
        status: "OPEN",
    },
];

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
    const [listings, setListings] = useState<Listing[]>(MOCK_LISTINGS);
    const [chats, setChats] = useState<Chat[]>([]);

    const addListing = (newListing: Omit<Listing, "id" | "createdAt" | "status" | "userName">) => {
        const listing: Listing = {
            ...newListing,
            id: Math.random().toString(),
            createdAt: new Date().toISOString(),
            status: "OPEN",
            userName: "Me",
        };
        setListings([listing, ...listings]);
    };

    const getListingById = (id: string) => listings.find((l) => l.id === id);

    const startChat = (listingId: string, listingTitle: string, userIds: string[]) => {
        // Check if chat already exists
        const existingChat = chats.find(c => c.listingId === listingId &&
            userIds.every(uid => c.participants.includes(uid)));

        if (existingChat) return existingChat.id;

        const newChat: Chat = {
            id: Math.random().toString(),
            listingId,
            listingTitle,
            participants: userIds,
            messages: []
        };
        setChats([newChat, ...chats]);
        return newChat.id;
    };

    const sendMessage = (chatId: string, text: string, senderId: string) => {
        setChats(currentChats => currentChats.map(c => {
            if (c.id === chatId) {
                return {
                    ...c,
                    messages: [
                        ...c.messages,
                        {
                            id: Math.random().toString(),
                            senderId,
                            text,
                            timestamp: new Date().toISOString()
                        }
                    ]
                };
            }
            return c;
        }));
    };

    const getChatById = (chatId: string) => chats.find(c => c.id === chatId);

    return (
        <DataContext.Provider value={{ listings, addListing, getListingById, chats, startChat, sendMessage, getChatById }}>
            {children}
        </DataContext.Provider>
    );
};
