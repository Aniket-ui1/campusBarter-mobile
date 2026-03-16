<<<<<<< Updated upstream
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
    markChatRead as apiMarkChatRead,
    deleteChat as apiDeleteChat,
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
=======
import React, { createContext, useContext, useState } from "react";

export interface Listing {
    id: string;
    type: "OFFER" | "REQUEST";
    title: string;
    description: string;
    credits: number;
    userId: string;
    userName: string;
    createdAt: string;
    status: "OPEN" | "CLOSED";
}

interface Message {
    id: string;
    senderId: string;
    text: string;
    timestamp: string;
}

export interface Chat {
    id: string;
    listingId: string;
    listingTitle: string;
    participants: string[];
    participantNames: Record<string, string>;
    messages: Message[];
    exchangeConfirmedAt?: string;
    exchangeConfirmedBy?: string;
}

export interface Review {
    id: string;
    exchangeId: string;
    reviewerId: string;
    reviewerName: string;
    revieweeId: string;
    revieweeName: string;
    rating: number;
    comment: string;
    createdAt: string;
}

export interface PendingReview {
    exchangeId: string;
    listingId: string;
    listingTitle: string;
    revieweeId: string;
    revieweeName: string;
}

export interface ListingReport {
    id: string;
    listingId: string;
    listingTitle: string;
    listingOwnerId: string;
    listingOwnerName: string;
    reportedById: string;
    reportedByName: string;
    reason: string;
    createdAt: string;
    status: "OPEN" | "RESOLVED";
    resolvedAt?: string;
    resolvedById?: string;
}

export interface AuditLogEntry {
    id: string;
    action: "REPORT_LISTING" | "DELETE_LISTING";
    actorId: string;
    actorName: string;
    targetType: "LISTING";
    targetId: string;
    details: string;
    createdAt: string;
}

interface ChatParticipant {
    id: string;
    name: string;
}

interface ReviewSubmission {
    exchangeId: string;
    reviewerId: string;
    reviewerName: string;
    revieweeId: string;
    revieweeName: string;
    rating: number;
    comment: string;
>>>>>>> Stashed changes
}

interface DataContextType {
    listings: Listing[];
<<<<<<< Updated upstream
    addListing: (listing: Omit<Listing, "id" | "createdAt" | "status"> & { category?: string }) => Promise<void>;
    getListingById: (id: string) => Listing | undefined;
    closeListing: (id: string) => Promise<void>;
    deleteListing: (id: string) => Promise<void>;
    refreshListings: () => Promise<void>;

    chats: Chat[];
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
=======
    chats: Chat[];
    reviews: Review[];
    reports: ListingReport[];
    auditLog: AuditLogEntry[];
    addListing: (listing: Omit<Listing, "id" | "createdAt" | "status" | "userName">) => void;
    getListingById: (id: string) => Listing | undefined;
    startChat: (listingId: string, listingTitle: string, participants: ChatParticipant[]) => string;
    sendMessage: (chatId: string, text: string, senderId: string) => void;
    getChatById: (chatId: string) => Chat | undefined;
    confirmExchange: (chatId: string, confirmedById: string) => void;
    getPendingReviewsForUser: (userId: string) => PendingReview[];
    getPendingReviewForExchange: (exchangeId: string, userId: string) => PendingReview | undefined;
    submitReview: (review: ReviewSubmission) => void;
    getReviewsForUser: (userId: string) => Review[];
    getAverageRatingForUser: (userId: string) => number;
    reportListing: (listingId: string, reportedById: string, reportedByName: string, reason: string) => void;
    deleteListingAsAdmin: (listingId: string, adminId: string, adminName: string) => void;
>>>>>>> Stashed changes
}

// ── Context ───────────────────────────────────────────────────────

const DataContext = createContext<DataContextType | undefined>(undefined);

const createId = () => Math.random().toString(36).slice(2, 10);

const seededAt = new Date().toISOString();

export const useData = () => {
    const ctx = useContext(DataContext);
    if (!ctx) throw new Error("useData must be used within a DataProvider");
    return ctx;
};

<<<<<<< Updated upstream
// ── Provider ──────────────────────────────────────────────────────
=======
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
>>>>>>> Stashed changes

const MOCK_REPORTS: ListingReport[] = [
    {
        id: createId(),
        listingId: "2",
        listingTitle: "Moving Help",
        listingOwnerId: "user3",
        listingOwnerName: "MoverNeeded",
        reportedById: "user2",
        reportedByName: "MathWhiz",
        reason: "Possible duplicate listing spam.",
        createdAt: seededAt,
        status: "OPEN",
    },
];

const MOCK_AUDIT_LOG: AuditLogEntry[] = [
    {
        id: createId(),
        action: "REPORT_LISTING",
        actorId: "user2",
        actorName: "MathWhiz",
        targetType: "LISTING",
        targetId: "2",
        details: "Reported listing \"Moving Help\": Possible duplicate listing spam.",
        createdAt: seededAt,
    },
];

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, isLoading: authLoading } = useAuth();
    const [listings, setListings] = useState<Listing[]>([]);
    const [chats, setChats] = useState<Chat[]>([]);
<<<<<<< Updated upstream
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

    // Only start fetching listings once auth has fully resolved (token restored from SecureStore).
    // Without this gate, the very first fetch runs before the token is set, fails silently,
    // and listings stay empty until the 30-second polling interval fires.
    useEffect(() => {
        if (authLoading) return; // wait for auth to finish initialising
        void refreshListings();
        const id = setInterval(refreshListings, 30_000); // poll every 30s
        return () => clearInterval(id);
    }, [authLoading, refreshListings]);

    // ── Load chats ────────────────────────────────────────────────
    const refreshChats = useCallback(async () => {
        if (!user) { setChats([]); return; }
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
        const id = setInterval(refreshNotifications, 60_000); // poll every 60s
        return () => clearInterval(id);
    }, [authLoading, refreshNotifications]);

    // ── Socket.io: listen for new messages ────────────────────────
    useEffect(() => {
        const cleanup = onNewMessage((msg) => {
            const chatId = msg.conversationId ?? msg.chatId;
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

    const unreadCount = useMemo(
        () => notifications.filter(n => !n.read).length,
        [notifications]
    );

    // ── Listings API ──────────────────────────────────────────────

    const addListing = async (
        data: Omit<Listing, "id" | "createdAt" | "status"> & { category?: string }
    ) => {
        // Let creation errors propagate to the caller (post screen shows Alert)
        await apiCreateListing({
            type: data.type,
            title: data.title,
            description: data.description,
            credits: data.credits,
            category: data.category,
        });
        // Refresh is best-effort — if it fails, the 30s poll will pick up the listing
        try {
            await refreshListings();
        } catch (e) {
            console.warn("[Data] refreshListings after create failed:", e);
        }
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
        await apiMarkChatRead(chatId, user.id);
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
        void markChatRead(chatId).catch((error) => {
            console.warn('[Data] markChatRead failed:', error);
        });

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
            n.id === notifId ? { ...n, read: true } : n
        ));
    };

    const markAllRead = async () => {
        await apiMarkAllRead();
        setNotifications(ns => ns.map(n => ({ ...n, read: true })));
=======
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reports, setReports] = useState<ListingReport[]>(MOCK_REPORTS);
    const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(MOCK_AUDIT_LOG);

    const appendAuditLog = (entry: Omit<AuditLogEntry, "id" | "createdAt">) => {
        setAuditLog((currentLogs) => [
            {
                id: createId(),
                ...entry,
                createdAt: new Date().toISOString(),
            },
            ...currentLogs,
        ]);
    };

    const addListing = (newListing: Omit<Listing, "id" | "createdAt" | "status" | "userName">) => {
        const listing: Listing = {
            ...newListing,
            id: createId(),
            createdAt: new Date().toISOString(),
            status: "OPEN",
            userName: "Me",
        };

        setListings((currentListings) => [listing, ...currentListings]);
    };

    const getListingById = (id: string) => listings.find((listing) => listing.id === id);

    const startChat = (listingId: string, listingTitle: string, participants: ChatParticipant[]) => {
        const participantIds = participants.map((participant) => participant.id);
        const existingChat = chats.find(
            (chat) =>
                chat.listingId === listingId &&
                chat.participants.length === participantIds.length &&
                participantIds.every((participantId) => chat.participants.includes(participantId))
        );

        if (existingChat) {
            return existingChat.id;
        }

        const participantNames = participants.reduce<Record<string, string>>((accumulator, participant) => {
            accumulator[participant.id] = participant.name;
            return accumulator;
        }, {});

        const newChat: Chat = {
            id: createId(),
            listingId,
            listingTitle,
            participants: participantIds,
            participantNames,
            messages: [],
        };

        setChats((currentChats) => [newChat, ...currentChats]);
        return newChat.id;
    };

    const sendMessage = (chatId: string, text: string, senderId: string) => {
        setChats((currentChats) =>
            currentChats.map((chat) => {
                if (chat.id !== chatId) {
                    return chat;
                }

                return {
                    ...chat,
                    messages: [
                        ...chat.messages,
                        {
                            id: createId(),
                            senderId,
                            text,
                            timestamp: new Date().toISOString(),
                        },
                    ],
                };
            })
        );
    };

    const getChatById = (chatId: string) => chats.find((chat) => chat.id === chatId);

    const confirmExchange = (chatId: string, confirmedById: string) => {
        const targetChat = chats.find((chat) => chat.id === chatId);

        if (!targetChat || targetChat.exchangeConfirmedAt) {
            return;
        }

        const confirmedAt = new Date().toISOString();

        setChats((currentChats) =>
            currentChats.map((chat) =>
                chat.id === chatId
                    ? {
                            ...chat,
                            exchangeConfirmedAt: confirmedAt,
                            exchangeConfirmedBy: confirmedById,
                        }
                    : chat
            )
        );

        setListings((currentListings) =>
            currentListings.map((listing) =>
                listing.id === targetChat.listingId
                    ? {
                            ...listing,
                            status: "CLOSED",
                        }
                    : listing
            )
        );
    };

    const getPendingReviewsForUser = (userId: string) =>
        chats.flatMap((chat) => {
            if (!chat.exchangeConfirmedAt || !chat.participants.includes(userId)) {
                return [];
            }

            return chat.participants
                .filter((participantId) => participantId !== userId)
                .filter(
                    (participantId) =>
                        !reviews.some(
                            (review) =>
                                review.exchangeId === chat.id &&
                                review.reviewerId === userId &&
                                review.revieweeId === participantId
                        )
                )
                .map((participantId) => ({
                    exchangeId: chat.id,
                    listingId: chat.listingId,
                    listingTitle: chat.listingTitle,
                    revieweeId: participantId,
                    revieweeName: chat.participantNames[participantId] ?? "Campus Barter user",
                }));
        });

    const getPendingReviewForExchange = (exchangeId: string, userId: string) =>
        getPendingReviewsForUser(userId).find((review) => review.exchangeId === exchangeId);

    const submitReview = (reviewSubmission: ReviewSubmission) => {
        setReviews((currentReviews) => {
            const alreadySubmitted = currentReviews.some(
                (review) =>
                    review.exchangeId === reviewSubmission.exchangeId &&
                    review.reviewerId === reviewSubmission.reviewerId &&
                    review.revieweeId === reviewSubmission.revieweeId
            );

            if (alreadySubmitted) {
                return currentReviews;
            }

            const nextReview: Review = {
                id: createId(),
                ...reviewSubmission,
                comment: reviewSubmission.comment.trim(),
                createdAt: new Date().toISOString(),
            };

            return [nextReview, ...currentReviews];
        });
    };

    const getReviewsForUser = (userId: string) =>
        reviews
            .filter((review) => review.revieweeId === userId)
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    const getAverageRatingForUser = (userId: string) => {
        const userReviews = getReviewsForUser(userId);

        if (userReviews.length === 0) {
            return 0;
        }

        const total = userReviews.reduce((sum, review) => sum + review.rating, 0);
        return total / userReviews.length;
    };

    const reportListing = (listingId: string, reportedById: string, reportedByName: string, reason: string) => {
        const listing = listings.find((candidateListing) => candidateListing.id === listingId);

        if (!listing || listing.userId === reportedById) {
            return;
        }

        const normalizedReason = reason.trim();
        if (!normalizedReason) {
            return;
        }

        const duplicateOpenReport = reports.some(
            (report) =>
                report.listingId === listingId &&
                report.reportedById === reportedById &&
                report.status === "OPEN"
        );

        if (duplicateOpenReport) {
            return;
        }

        const report: ListingReport = {
            id: createId(),
            listingId,
            listingTitle: listing.title,
            listingOwnerId: listing.userId,
            listingOwnerName: listing.userName,
            reportedById,
            reportedByName,
            reason: normalizedReason,
            createdAt: new Date().toISOString(),
            status: "OPEN",
        };

        setReports((currentReports) => [report, ...currentReports]);

        appendAuditLog({
            action: "REPORT_LISTING",
            actorId: reportedById,
            actorName: reportedByName,
            targetType: "LISTING",
            targetId: listingId,
            details: `Reported listing "${listing.title}": ${normalizedReason}`,
        });
    };

    const deleteListingAsAdmin = (listingId: string, adminId: string, adminName: string) => {
        const listingToDelete = listings.find((candidateListing) => candidateListing.id === listingId);

        if (!listingToDelete) {
            return;
        }

        setListings((currentListings) =>
            currentListings.filter((listing) => listing.id !== listingId)
        );

        setChats((currentChats) =>
            currentChats.filter((chat) => chat.listingId !== listingId)
        );

        const resolvedAt = new Date().toISOString();
        setReports((currentReports) =>
            currentReports.map((report) =>
                report.listingId === listingId && report.status === "OPEN"
                    ? {
                        ...report,
                        status: "RESOLVED",
                        resolvedAt,
                        resolvedById: adminId,
                    }
                    : report
            )
        );

        appendAuditLog({
            action: "DELETE_LISTING",
            actorId: adminId,
            actorName: adminName,
            targetType: "LISTING",
            targetId: listingId,
            details: `Deleted listing "${listingToDelete.title}" owned by ${listingToDelete.userName}.`,
        });
>>>>>>> Stashed changes
    };

    return (
        <DataContext.Provider
            value={{
                listings,
<<<<<<< Updated upstream
                addListing,
                getListingById,
                closeListing: handleCloseListing,
                deleteListing: handleDeleteListing,
                refreshListings,
                chats,
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
=======
                chats,
                reviews,
                reports,
                auditLog,
                addListing,
                getListingById,
                startChat,
                sendMessage,
                getChatById,
                confirmExchange,
                getPendingReviewsForUser,
                getPendingReviewForExchange,
                submitReview,
                getReviewsForUser,
                getAverageRatingForUser,
                reportListing,
                deleteListingAsAdmin,
            }}>
>>>>>>> Stashed changes
            {children}
        </DataContext.Provider>
    );
};
