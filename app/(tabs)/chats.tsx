import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useThemeColors } from '@/context/ThemeContext';
import { triggerHaptic } from '@/hooks/useAnimations';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

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
    const { user } = useAuth();
    const router = useRouter();
    const { chats } = useData();
    const colors = useThemeColors();

    const renderItem = ({ item, index }: { item: typeof chats[0]; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
            <Pressable
                style={({ pressed }) => [styles.chatItem, { borderBottomColor: colors.border }, pressed && { backgroundColor: colors.surface }]}
                onPress={() => { triggerHaptic('light'); router.push({ pathname: '/chat/[id]' as any, params: { id: item.id } }); }}
            >
                <View style={styles.avatarWrap}>
                    <Avatar name={item.listingTitle ?? 'Chat'} size={52} />
                </View>
                <View style={styles.chatInfo}>
                    <View style={styles.chatTopRow}>
                        <Text style={[styles.chatName, { color: colors.text }]} numberOfLines={1}>
                            {item.listingTitle ?? 'Conversation'}
                        </Text>
                        <Text style={[styles.chatTime, { color: colors.textMuted }]}>{formatTime(item.lastMessageAt)}</Text>
                    </View>
                    <View style={styles.chatBottomRow}>
                        <Text style={[styles.chatPreview, { color: colors.textMuted }]} numberOfLines={1}>
                            {item.lastMessage || `💬 New conversation`}
                        </Text>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.statusSpacer} />

            {/* WhatsApp-style header */}
            <View style={[styles.headerBar, { backgroundColor: colors.primaryDark }]}>
                <Text style={styles.headerTitle}>Chats</Text>
                <View style={styles.headerActions}>
                    <Pressable style={styles.headerBtn}>
                        <Ionicons name="search-outline" size={20} color="#FFFFFF" />
                    </Pressable>
                </View>
            </View>

            {chats.length === 0 ? (
                <EmptyState
                    icon="💬"
                    title="No conversations yet"
                    description="Find a skill and start chatting!"
                    actionLabel="Browse Skills"
                    onAction={() => router.push('/(tabs)/search')}
                />
            ) : (
                <FlatList
                    data={chats}
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
    container: { flex: 1 },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },

    // WhatsApp-style header
    headerBar: {
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
    },
    avatarWrap: { position: 'relative' },
    chatInfo: { flex: 1, gap: 4 },
    chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chatName: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
    chatTime: { fontSize: 12, fontWeight: '500' },
    chatBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    chatPreview: { fontSize: 14, flex: 1, lineHeight: 20 },

});
