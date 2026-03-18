// context/ChatBadgeContext.tsx
// Global context for Instagram-style badges:
// - Tab badge: count of USERS/CONVERSATIONS with unread
// - Chat row badge: count of MESSAGES in that conversation
import { chatApi, type Conversation } from '@/services/chatApi';
import { onConversationUpdated, onMessagesSeen, onSocketConnect } from '@/services/socketService';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

// Deduplicate conversations by participant (keep most recent)
function dedupeConversations(convs: Conversation[]): Conversation[] {
    const convsByParticipant = new Map<string, Conversation>();
    
    for (const conv of convs) {
        const key = conv.otherUser?.id ?? conv.conversationId;
        const existing = convsByParticipant.get(key);
        if (!existing) {
            convsByParticipant.set(key, conv);
            continue;
        }
        
        const existingTime = new Date(existing.lastMessageTime || 0).getTime();
        const nextTime = new Date(conv.lastMessageTime || 0).getTime();
        if (nextTime >= existingTime) {
            convsByParticipant.set(key, conv);
        }
    }
    
    return Array.from(convsByParticipant.values()).sort((left, right) => {
        const leftTime = new Date(left.lastMessageTime || 0).getTime();
        const rightTime = new Date(right.lastMessageTime || 0).getTime();
        return rightTime - leftTime;
    });
}

interface ChatBadgeContextType {
    // Conversation list (primary state source for ChatsScreen)
    conversations: Conversation[];
    
    // Count of CONVERSATIONS with unread (for tab badge, Instagram-style)
    totalUnreadCount: number;
    setTotalUnreadCount: (count: number) => void;
    
    // Update unread for specific conversation (optimistic)
    updateUnreadForConversation: (conversationId: string, count: number) => void;
    
    // Track which conversation is actively being viewed
    activeChatId: string | null;
    setActiveChatId: (id: string | null) => void;
}

const ChatBadgeContext = createContext<ChatBadgeContextType | undefined>(undefined);

export const useChatBadge = () => {
    const context = useContext(ChatBadgeContext);
    if (!context) {
        throw new Error('useChatBadge must be used within ChatBadgeProvider');
    }
    return context;
};

export const ChatBadgeProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [totalUnreadCount, setTotalUnreadCount] = useState(0);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    
    // 🔥 Refs to always access latest state (prevents stale closures in socket handler)
    const conversationsRef = useRef(conversations);
    const userRef = useRef(user);
    const activeChatIdRef = useRef(activeChatId);

    useEffect(() => {
        conversationsRef.current = conversations;
    }, [conversations]);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        activeChatIdRef.current = activeChatId;
    }, [activeChatId]);

    // Calculate badge count: number of CONVERSATIONS with unread > 0 (Instagram style)
    const calculateBadgeCount = useCallback((convs: Conversation[]) => {
        return convs.reduce((sum, c) => sum + (c.unreadCount > 0 ? 1 : 0), 0);
    }, []);

    // 🔥 Optimistically update unread for a specific conversation
    const updateUnreadForConversation = useCallback((conversationId: string, count: number) => {
        setConversations(prev => {
            const updated = prev.map(c =>
                c.conversationId === conversationId
                    ? { ...c, unreadCount: count }
                    : c
            );
            // Recalculate badge (count of convs with unread > 0)
            const newBadgeCount = calculateBadgeCount(updated);
            setTotalUnreadCount(newBadgeCount);
            return updated;
        });
    }, [calculateBadgeCount]);

    // 🔥 Refresh unread count from API with Math.max merge (initial load + reconnect)
    const refreshUnreadCount = useCallback(async () => {
        try {
            const data = await chatApi.getConversations();
            const serverConvs = data.conversations ?? [];

            setConversations(prev => {
                // 🔥 Use Math.max to prevent regression during reconnect
                // This protects against eventual consistency delays
                const merged = serverConvs.map(serverConv => {
                    const localConv = prev.find(c => c.conversationId === serverConv.conversationId);
                    
                    return {
                        ...serverConv,
                        // 🔥 Use Math.max: keep the higher value (local + socket wins over stale server)
                        unreadCount: Math.max(
                            localConv?.unreadCount ?? 0,
                            serverConv.unreadCount
                        ),
                    };
                });

                // 🔥 Deduplicate conversations to prevent showing same user twice
                const deduped = dedupeConversations(merged);

                // Count conversations with unread > 0 (Instagram-style)
                const newBadgeCount = calculateBadgeCount(deduped);
                setTotalUnreadCount(newBadgeCount);
                return deduped;
            });
        } catch (err) {
            console.warn('[ChatBadge] Failed to refresh unread count:', err);
        }
    }, [calculateBadgeCount]);

    // 🔥 Load unread count on app start (independent of ChatsScreen)
    useEffect(() => {
        if (!user?.id) return; // Wait for auth to complete
        void refreshUnreadCount();
        // Only load once on mount, don't refresh when refreshUnreadCount changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    // 🔥 NEW: Reconnect fallback — sync with server using Math.max merge when socket reconnects
    useEffect(() => {
        const unsub = onSocketConnect(() => {
            console.log('[ChatBadge] Socket reconnected, syncing unread...');
            void refreshUnreadCount();
        });
        return unsub;
    }, [refreshUnreadCount]);

    // 🔥 Subscribe to socket events for real-time updates
    useEffect(() => {
        if (!user?.id) return;

        // Real-time increment on new message (only if from other user and not actively viewing)
        const unsubUpdated = onConversationUpdated(({ conversationId, lastSenderId }) => {
            if (!conversationId) return;

            // Check permissions via refs (prevents stale closure on checks)
            const currentUser = userRef.current;
            const currentActiveChatId = activeChatIdRef.current;

            // Ignore messages from current user
            if (lastSenderId === currentUser?.id) {
                console.log('[ChatBadge] Ignoring own message', { conversationId, lastSenderId, userId: currentUser?.id });
                return;
            }

            // 🔥 NEW: Skip increment if user is actively viewing this chat
            if (currentActiveChatId === conversationId) {
                console.log('[ChatBadge] Skipping increment (actively viewing)', { conversationId });
                return;
            }

            // 🔥 FIX: Use functional setState to handle socket events safely
            // This ensures we always build from the most recent state
            setConversations(prev => {
                const updated = prev.map(c => {
                    if (c.conversationId === conversationId) {
                        return {
                            ...c,
                            // 🔥 Real-time increment for incoming messages (simple addition, no Math.max)
                            unreadCount: (c.unreadCount || 0) + 1,
                        };
                    }
                    return c;
                });

                // Recalculate badge count from updated state
                const newTotal = calculateBadgeCount(updated);
                setTotalUnreadCount(newTotal);

                console.log('[ChatBadge] Updated after socket event', { conversationId, newUnread: newTotal });
                return updated;
            });
        });

        // Handle when messages are marked as read
        const unsubSeen = onMessagesSeen(({ conversationId }) => {
            // 🔥 CRITICAL: Don't fetch from server (it returns stale data)
            // Instead, directly mark as read in local state
            setConversations(prev => {
                const updated = prev.map(c =>
                    c.conversationId === conversationId
                        ? { ...c, unreadCount: 0 }
                        : c
                );

                // Recalculate badge count (convs with unread > 0)
                const total = updated.reduce((sum, c) => sum + (c.unreadCount > 0 ? 1 : 0), 0);
                setTotalUnreadCount(total);

                console.log('[ChatBadge] Marked as read locally', { conversationId, newTotal: total });
                return updated;
            });
        });

        return () => {
            unsubUpdated();
            unsubSeen();
        };
    }, []);

    return (
        <ChatBadgeContext.Provider value={{ conversations, totalUnreadCount, setTotalUnreadCount, updateUnreadForConversation, activeChatId, setActiveChatId }}>
            {children}
        </ChatBadgeContext.Provider>
    );
};