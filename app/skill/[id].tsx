import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { CATEGORY_COLORS, CATEGORY_EMOJIS, Radii, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useThemeColors } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function SkillDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const { getListingById, startChat, addNotification } = useData();
    const colors = useThemeColors();
    const listing = getListingById(id);

    if (!listing) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}><View style={styles.statusSpacer} />
                <View style={styles.header}>
                    <Pressable style={[styles.backBtn, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={colors.text} />
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Skill Detail</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyEmoji}>🔍</Text>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>Listing not found</Text>
                    <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>This listing may have been deleted or closed.</Text>
                    <Button title="Go Back" onPress={() => router.back()} variant="secondary" />
                </View>
            </View>
        );
    }

    const isOwner = listing.userId === user?.id;
    const catColor = CATEGORY_COLORS[(listing as any).category ?? ''] ?? colors.primary;
    const catEmoji = CATEGORY_EMOJIS[(listing as any).category ?? ''] ?? '✨';

    const handleRequest = async () => {
        if (!user) return;
        try {
            await addNotification();
            const chatId = await startChat(listing.id, listing.title, [user.id, listing.userId]);
            Alert.alert(
                'Request Sent! 🎉',
                `Your request for "${listing.title}" has been sent to ${listing.userName}. A chat has been started.`,
                [
                    { text: 'View Chat', onPress: () => router.push({ pathname: '/chat/[id]' as any, params: { id: chatId } }) },
                    { text: 'OK', style: 'cancel' },
                ]
            );
        } catch {
            Alert.alert('Error', 'Could not send request. Please try again.');
        }
    };

    const handleMessage = async () => {
        if (!user) return;
        try {
            const chatId = await startChat(listing.id, listing.title, [user.id, listing.userId]);
            router.push({ pathname: '/chat/[id]' as any, params: { id: chatId } });
        } catch {
            Alert.alert('Error', 'Could not start chat.');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Colored accent header */}
            <View style={[styles.accentHeader, { backgroundColor: catColor }]}>
                <View style={styles.statusSpacer} />
                <View style={styles.header}>
                    <Pressable style={styles.backBtnLight} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </Pressable>
                    <Text style={styles.headerTitleLight}>Skill Detail</Text>
                    <Pressable style={styles.backBtnLight}>
                        <Ionicons name="share-outline" size={20} color="#FFFFFF" />
                    </Pressable>
                </View>
                <View style={styles.heroStrip}>
                    <Text style={styles.heroEmoji}>{catEmoji}</Text>
                    <Text style={styles.heroTitle} numberOfLines={2}>{listing.title}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Quick info */}
                <Animated.View entering={FadeInDown.delay(80).duration(350)} style={[styles.quickRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.quickItem}>
                        <Text style={styles.quickIcon}>🪙</Text>
                        <Text style={[styles.quickLabel, { color: colors.textSecondary }]}>{listing.credits} credit{listing.credits !== 1 ? 's' : ''}</Text>
                    </View>
                    <View style={[styles.quickDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.quickItem}>
                        <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                        <Text style={[styles.quickLabel, { color: colors.textSecondary }]}>
                            {new Date(listing.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                    </View>
                    <View style={[styles.quickDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.quickItem}>
                        <View style={[styles.statusDot, { backgroundColor: listing.status === 'OPEN' ? colors.success : colors.textMuted }]} />
                        <Text style={[styles.quickLabel, { color: colors.textSecondary }]}>{listing.status}</Text>
                    </View>
                </Animated.View>

                {/* Description */}
                <Animated.View entering={FadeInDown.delay(150).duration(350)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>📝 Description</Text>
                    <Text style={[styles.description, { color: colors.textSecondary }]}>{listing.description}</Text>
                </Animated.View>

                {/* About the Tutor */}
                <Animated.View entering={FadeInDown.delay(250).duration(350)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>👤 About the Tutor</Text>
                    <Pressable
                        style={styles.tutorRow}
                        onPress={() => router.push({ pathname: '/user/[id]' as any, params: { id: listing.userId } })}
                    >
                        <Avatar name={listing.userName} size={50} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.tutorName, { color: colors.text }]}>{listing.userName}</Text>
                            <Text style={[styles.tutorSub, { color: colors.primary }]}>Tap to view full profile</Text>
                        </View>
                        <View style={[styles.profileArrow, { backgroundColor: colors.primary + '12' }]}>
                            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                        </View>
                    </Pressable>
                </Animated.View>

                {/* CTA */}
                {!isOwner && (
                    <Animated.View entering={FadeInDown.delay(350).duration(350)} style={styles.ctaSection}>
                        <Pressable style={[styles.ctaBtn, { backgroundColor: catColor }]} onPress={handleRequest}>
                            <Ionicons name="hand-left-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.ctaBtnText}>Request This Skill</Text>
                        </Pressable>
                        <Pressable style={[styles.msgBtn, { borderColor: colors.primary, backgroundColor: colors.card }]} onPress={handleMessage}>
                            <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                            <Text style={[styles.msgBtnText, { color: colors.primary }]}>Send a Message</Text>
                        </Pressable>
                    </Animated.View>
                )}

                {isOwner && (
                    <Animated.View entering={FadeInDown.delay(350).duration(350)} style={[styles.ownerBanner, { backgroundColor: colors.primary + '10' }]}>
                        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                        <Text style={[styles.ownerText, { color: colors.primary }]}>This is your listing</Text>
                    </Animated.View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },

    // Accent header
    accentHeader: { paddingBottom: Spacing.lg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },
    backBtnLight: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    headerTitleLight: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
    heroStrip: {
        paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, paddingBottom: Spacing.sm,
        gap: Spacing.sm,
    },
    heroEmoji: { fontSize: 32 },
    heroTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5, lineHeight: 32 },

    scroll: { padding: Spacing.xl, paddingBottom: 40 },

    // Quick info row
    quickRow: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: Radii.lg,
        padding: Spacing.lg, marginBottom: Spacing.lg,
        borderWidth: 1,
        ...Shadows.sm,
    } as any,
    quickItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
    quickIcon: { fontSize: 16 },
    quickLabel: { fontSize: 13, fontWeight: '600' },
    quickDivider: { width: 1, height: 20 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },

    // Cards
    card: {
        borderRadius: Radii.lg,
        padding: Spacing.lg, marginBottom: Spacing.lg,
        borderWidth: 1,
        gap: Spacing.md,
    },
    cardTitle: { fontSize: 15, fontWeight: '700' },
    description: { fontSize: 15, lineHeight: 23 },

    // Tutor
    tutorRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    },
    tutorName: { fontSize: 16, fontWeight: '700' },
    tutorSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
    profileArrow: {
        width: 32, height: 32, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
    },

    // CTA
    ctaSection: { gap: Spacing.md, marginTop: Spacing.sm },
    ctaBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 16, borderRadius: Radii.md,
        ...Shadows.sm,
    } as any,
    ctaBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
    msgBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 14, borderRadius: Radii.md,
        borderWidth: 1.5,
    },
    msgBtnText: { fontSize: 15, fontWeight: '700' },

    // Owner
    ownerBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md, borderRadius: Radii.md,
    },
    ownerText: { fontSize: 14, fontWeight: '600' },

    // Empty
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: Spacing.md },
    emptyEmoji: { fontSize: 48 },
    emptyTitle: { fontSize: 20, fontWeight: '700' },
    emptyDesc: { fontSize: 14, textAlign: 'center' },
});
