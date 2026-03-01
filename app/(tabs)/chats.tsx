import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, Radii, Shadows, Spacing } from '@/constants/theme';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getUserProfile } from '@/lib/firestore';

interface ChatThread {
    id: string;
    otherName: string;
    otherAvatar?: string;
    lastMessage: string;
    lastMessageAt: string;
    listingTitle?: string;
    unread?: boolean;
}

function formatTime(dateStr?: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ChatsScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [threads, setThreads] = useState<ChatThread[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) return;
        const q = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', user.id),
            orderBy('lastMessageAt', 'desc')
        );
        const unsub = onSnapshot(q, async (snap) => {
            const results: ChatThread[] = [];
            for (const docSnap of snap.docs) {
                const data = docSnap.data();
                const otherId = (data.participants as string[]).find((p: string) => p !== user.id) ?? '';
                let otherName = 'Unknown';
                let otherAvatar: string | undefined;
                try {
                    const profile = await getUserProfile(otherId);
                    if (profile) {
                        otherName = profile.displayName ?? 'Unknown';
                        otherAvatar = profile.avatarUrl;
                    }
                } catch { }
                results.push({
                    id: docSnap.id,
                    otherName,
                    otherAvatar,
                    lastMessage: data.lastMessage ?? '',
                    lastMessageAt: data.lastMessageAt?.toDate?.()?.toISOString?.() ?? '',
                    listingTitle: data.listingTitle,
                });
            }
            setThreads(results);
            setLoading(false);
        });
        return unsub;
    }, [user?.id]);

    const renderItem = ({ item, index }: { item: ChatThread; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
            <Pressable
                style={({ pressed }) => [styles.chatItem, pressed && { backgroundColor: AppColors.surface }]}
                onPress={() => router.push({ pathname: '/chat/[id]' as any, params: { id: item.id } })}
            >
                <View style={styles.avatarWrap}>
                    <Avatar name={item.otherName} uri={item.otherAvatar} size={52} />
                </View>
                <View style={styles.chatInfo}>
                    <View style={styles.chatTopRow}>
                        <Text style={styles.chatName} numberOfLines={1}>{item.otherName}</Text>
                        <Text style={styles.chatTime}>{formatTime(item.lastMessageAt)}</Text>
                    </View>
                    <View style={styles.chatBottomRow}>
                        <Text style={styles.chatPreview} numberOfLines={1}>
                            {item.lastMessage || `💬 ${item.listingTitle ?? 'New conversation'}`}
                        </Text>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />

            {/* WhatsApp-style header */}
            <View style={styles.headerBar}>
                <Text style={styles.headerTitle}>Chats</Text>
                <View style={styles.headerActions}>
                    <Pressable style={styles.headerBtn}>
                        <Ionicons name="search-outline" size={20} color="#FFFFFF" />
                    </Pressable>
                </View>
            </View>

            {loading ? (
                <View style={styles.emptyWrap}>
                    <Text style={styles.emptyEmoji}>💬</Text>
                    <Text style={styles.emptyTitle}>Loading chats...</Text>
                </View>
            ) : threads.length === 0 ? (
                <View style={styles.emptyWrap}>
                    <Text style={styles.emptyEmoji}>💬</Text>
                    <Text style={styles.emptyTitle}>No conversations yet</Text>
                    <Text style={styles.emptyDesc}>Find a skill and start chatting!</Text>
                    <Pressable style={styles.emptyBtn} onPress={() => router.push('/(tabs)/search')}>
                        <Text style={styles.emptyBtnText}>Browse Skills</Text>
                    </Pressable>
                </View>
            ) : (
                <FlatList
                    data={threads}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
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
    headerTitle: {
        fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3,
    },
    headerActions: { flexDirection: 'row', gap: Spacing.md },
    headerBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },

    list: { paddingBottom: 40 },

    // Chat item (WhatsApp-style)
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
    chatTopRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    chatName: {
        fontSize: 16, fontWeight: '700', color: AppColors.text, flex: 1, marginRight: 8,
    },
    chatTime: {
        fontSize: 12, color: AppColors.textMuted, fontWeight: '500',
    },
    chatBottomRow: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    chatPreview: {
        fontSize: 14, color: AppColors.textMuted, flex: 1, lineHeight: 20,
    },

    // Empty
    emptyWrap: {
        flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingBottom: 80,
    },
    emptyEmoji: { fontSize: 56 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: AppColors.text },
    emptyDesc: { fontSize: 14, color: AppColors.textMuted },
    emptyBtn: {
        backgroundColor: AppColors.primary, paddingHorizontal: 24, paddingVertical: 12,
        borderRadius: Radii.sm, marginTop: Spacing.md,
    },
    emptyBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
