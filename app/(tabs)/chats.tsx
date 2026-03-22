import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Avatar } from '@/components/ui/Avatar';
import { type Conversation, chatApi } from '@/services/chatApi';
import { onConversationUpdated } from '@/services/socketService';
import { useData } from '@/context/DataContext';

function formatTime(dateStr?: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ChatsScreen() {
    const router = useRouter();
    const { chats } = useData();
    const [v2Conversations, setV2Conversations] = useState<Conversation[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    // Load v2 conversations from API
    const loadConversations = useCallback(async () => {
        try {
            setRefreshing(true);
            const data = await chatApi.getConversations();
            setV2Conversations(data.conversations ?? []);
        } catch {
            // Silently fail — stale data is better than a crash
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void loadConversations();
    }, [loadConversations]);

    // Merge v2 conversations with DataContext chats (for unread counts)
    const conversations = useMemo(() => {
        if (v2Conversations.length === 0) {
            // Fallback to DataContext chats if no v2 conversations loaded yet
            return chats.map(chat => ({
                conversationId: chat.id,
                participant1Id: '',
                participant2Id: '',
                lastMessage: chat.lastMessage ?? '',
                lastMessageTime: chat.lastMessageAt ?? '',
                lastSenderId: '',
                createdAt: '',
                otherUser: {
                    id: chat.otherUserId ?? '',
                    name: chat.otherUserName ?? 'Chat',
                    avatarUrl: null,
                },
                unreadCount: chat.unreadCount ?? 0,
            }));
        }
        // Use v2 conversations but sync unread counts from DataContext
        return v2Conversations.map(conv => {
            const dataContextChat = chats.find(c => c.id === conv.conversationId);
            return {
                ...conv,
                unreadCount: dataContextChat?.unreadCount ?? conv.unreadCount ?? 0,
            };
        });
    }, [v2Conversations, chats]);

    // Real-time: update conversation preview when a new message arrives
    useEffect(() => {
        const unsub = onConversationUpdated((updated) => {
            setV2Conversations((prev: Conversation[]) =>
                prev
                    .map((c: Conversation) => c.conversationId === updated.conversationId
                        ? { ...c, lastMessage: updated.lastMessage, lastMessageTime: updated.lastMessageTime, lastSenderId: updated.lastSenderId }
                        : c
                    )
                    .sort((a: Conversation, b: Conversation) => {
                        const ta = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
                        const tb = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
                        return tb - ta;
                    })
            );
        });
        return unsub;
    }, []);

    const confirmDelete = (convId: string, displayName: string) => {
        Alert.alert(
            'Delete this conversation?',
            'This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await chatApi.deleteConversation(convId);
                            setV2Conversations((prev: Conversation[]) => prev.filter((c: Conversation) => c.conversationId !== convId));
                        } catch {
                            Alert.alert('Delete failed', `Could not delete the conversation with ${displayName}.`);
                        }
                    },
                },
            ]
        );
    };

    const renderItem = ({ item, index }: { item: Conversation; index: number }) => {
        const displayName = item.otherUser?.name ?? 'Chat';
        const unreadCount = item.unreadCount ?? 0;
        return (
            <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
                <Pressable
                    style={({ pressed }) => [styles.chatItem, pressed && { backgroundColor: AppColors.surface }]}
                    onLongPress={() => confirmDelete(item.conversationId, displayName)}
                    onPress={() => router.push({
                        pathname: '/chat/[id]' as any,
                        params: {
                            id: item.conversationId,
                            recipientName: displayName,
                            recipientId: item.otherUser?.id ?? '',
                        },
                    })}
                    accessibilityRole="button"
                    accessibilityLabel={`Chat with ${displayName}${item.lastMessage ? `, last message: ${item.lastMessage}` : ''}`}
                >
                    <View style={styles.avatarWrap}>
                        <Avatar name={displayName} uri={item.otherUser?.avatarUrl ?? undefined} size={52} />
                    </View>
                    <View style={styles.chatInfo}>
                        <View style={styles.chatTopRow}>
                            <Text style={styles.chatName} numberOfLines={1}>
                                {displayName}
                            </Text>
                            <Text style={styles.chatTime}>{formatTime(item.lastMessageTime ?? undefined)}</Text>
                        </View>
                        <View style={styles.chatBottomRow}>
                            <Text style={styles.chatPreview} numberOfLines={1}>
                                {item.lastMessage || `💬 New conversation`}
                            </Text>
                            {unreadCount > 0 && (
                                <View style={styles.unreadBadge}>
                                    <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </Pressable>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />

            {/* WhatsApp-style header */}
            <View style={styles.headerBar}>
                <Text style={styles.headerTitle}>Chats</Text>
                <View style={styles.headerActions}>
                    <Pressable style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Search chats">
                        <Ionicons name="search-outline" size={20} color="#FFFFFF" />
                    </Pressable>
                </View>
            </View>

            {conversations.length === 0 ? (
                <View style={styles.emptyWrap}>
                    <Text style={styles.emptyEmoji}>💬</Text>
                    <Text style={styles.emptyTitle}>No conversations yet</Text>
                    <Text style={styles.emptyDesc}>Find a skill and start chatting!</Text>
                    <Pressable style={styles.emptyBtn} onPress={() => router.push('/(tabs)/search')}
                        accessibilityRole="button" accessibilityLabel="Browse skills to start a conversation">
                        <Text style={styles.emptyBtnText}>Browse Skills</Text>
                    </Pressable>
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item.conversationId}
                    renderItem={renderItem}
                    refreshing={refreshing}
                    onRefresh={loadConversations}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppColors.background },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },

    // WhatsApp-style header
    headerBar: {
        backgroundColor: AppColors.primaryDark,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
    headerActions: { flexDirection: 'row', gap: Spacing.md },
    headerBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },

    list: { paddingBottom: 40 },

    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        gap: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: AppColors.border,
    },
    avatarWrap: { position: 'relative' },
    chatInfo: { flex: 1, gap: 4 },
    chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chatName: { fontSize: 16, fontWeight: '700', color: AppColors.text, flex: 1, marginRight: 8 },
    chatTime: { fontSize: 12, color: AppColors.textMuted, fontWeight: '500' },
    chatBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    chatPreview: { fontSize: 14, color: AppColors.textMuted, flex: 1, lineHeight: 20 },
    unreadBadge: {
        minWidth: 22,
        height: 22,
        paddingHorizontal: 6,
        borderRadius: 11,
        backgroundColor: AppColors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },

    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingBottom: 80 },
    emptyEmoji: { fontSize: 56 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: AppColors.text },
    emptyDesc: { fontSize: 14, color: AppColors.textMuted },
    emptyBtn: {
        backgroundColor: AppColors.primary, paddingHorizontal: 24, paddingVertical: 12,
        borderRadius: Radii.sm, marginTop: Spacing.md,
    },
    emptyBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
