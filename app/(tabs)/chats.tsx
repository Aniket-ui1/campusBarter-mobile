import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { MOCK_CHAT_THREADS } from '@/data/mock';

function formatTime(isoString: string): string {
    const d = new Date(isoString);
    const now = new Date();
    const diffH = Math.floor((now.getTime() - d.getTime()) / 3600000);
    if (diffH < 1) return 'Just now';
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ChatsScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Messages</Text>
                <Badge label={`${MOCK_CHAT_THREADS.reduce((a, t) => a + t.unreadCount, 0)} unread`} variant="primary" />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {MOCK_CHAT_THREADS.length === 0 ? (
                    <EmptyState icon="💬" title="No conversations yet" description="Start chatting by connecting with a student." />
                ) : (
                    MOCK_CHAT_THREADS.map((thread, i) => (
                        <Animated.View key={thread.id} entering={FadeInDown.delay(i * 60).duration(400)}>
                            <Pressable
                                style={({ pressed }) => [styles.chatRow, pressed && { opacity: 0.85 }]}
                                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: thread.id } })}
                            >
                                <Avatar name={thread.participantName} size={48} />
                                <View style={styles.chatInfo}>
                                    <View style={styles.chatTopRow}>
                                        <Text style={styles.chatName}>{thread.participantName}</Text>
                                        <Text style={styles.chatTime}>{formatTime(thread.lastMessageAt)}</Text>
                                    </View>
                                    <Text style={[styles.chatPreview, thread.unreadCount > 0 && styles.chatPreviewUnread]} numberOfLines={1}>
                                        {thread.lastMessage}
                                    </Text>
                                </View>
                                {thread.unreadCount > 0 && (
                                    <View style={styles.unreadBadge}>
                                        <Text style={styles.unreadText}>{thread.unreadCount}</Text>
                                    </View>
                                )}
                            </Pressable>
                        </Animated.View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppColors.background },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg,
    },
    headerTitle: { fontSize: 28, fontWeight: '900', color: AppColors.text, letterSpacing: -0.5 },
    content: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
    chatRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: AppColors.border,
    },
    chatInfo: { flex: 1 },
    chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    chatName: { fontSize: 15, fontWeight: '700', color: AppColors.text },
    chatTime: { fontSize: 12, color: AppColors.textMuted },
    chatPreview: { fontSize: 13, color: AppColors.textSecondary, lineHeight: 18 },
    chatPreviewUnread: { color: AppColors.text, fontWeight: '600' },
    unreadBadge: {
        minWidth: 22, height: 22, borderRadius: 11,
        backgroundColor: AppColors.primary, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 6,
    },
    unreadText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
});
