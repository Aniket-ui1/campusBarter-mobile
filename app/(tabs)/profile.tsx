import { Avatar } from '@/components/ui/Avatar';
import { Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useThemeColors } from '@/context/ThemeContext';
import { triggerHaptic } from '@/hooks/useAnimations';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

function ChipList({ items, color }: { items: string[]; color: string }) {
    const colors = useThemeColors();
    if (!items || items.length === 0) return null;
    return (
        <View style={chipStyles.row}>
            {items.map((item) => (
                <View key={item} style={[chipStyles.chip, { backgroundColor: color + '12', borderColor: color + '25' }]}>
                    <Text style={[chipStyles.chipText, { color }]}>{item}</Text>
                </View>
            ))}
        </View>
    );
}

export default function ProfileScreen() {
    const { user, signOut } = useAuth();
    const { unreadCount, listings } = useData();
    const colors = useThemeColors();
    const router = useRouter();
    const myListings = listings.filter(l => l.userId === user?.id).length;

    type MenuItem = { icon: string; label: string; onPress: () => void; badge?: string };
    const MENU_ITEMS: MenuItem[] = [
        { icon: 'list-outline', label: 'My Listings', onPress: () => router.push('/my-listings') },
        { icon: 'git-pull-request-outline', label: 'My Requests', onPress: () => router.push('/my-requests') },
        { icon: 'time-outline', label: 'Time Credits', onPress: () => router.push('/credits' as any) },
        { icon: 'bookmark-outline', label: 'Drafts', onPress: () => router.push('/drafts') },
        { icon: 'star-outline', label: 'Reviews', onPress: () => router.push({ pathname: '/reviews/[userId]', params: { userId: user?.id ?? 'u1' } }) },
        { icon: 'notifications-outline', label: 'Notifications', onPress: () => router.push('/notifications'), badge: unreadCount > 0 ? String(unreadCount) : undefined },
        { icon: 'settings-outline', label: 'Settings', onPress: () => router.push('/settings') },
        ...((user as any)?.role === 'Admin' || (user as any)?.role === 'Moderator'
            ? [{ icon: 'shield-checkmark-outline', label: 'Admin Dashboard', onPress: () => router.push('/admin' as any) }]
            : []),
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>

            {/* Gradient header */}
            <View style={[styles.headerBg, { backgroundColor: colors.primaryDark }]}>
                <View style={styles.statusSpacer} />
                <View style={styles.headerActions}>
                    <View style={{ flex: 1 }} />
                    <Pressable style={styles.headerBtn} onPress={() => router.push('/edit-profile')}>
                        <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                    </Pressable>
                </View>
                <View style={styles.avatarSection}>
                    <View style={styles.avatarRing}>
                        <Avatar name={user?.displayName || ''} uri={user?.avatarUrl} size={80} />
                    </View>
                    <Text style={styles.name}>{user?.displayName}</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                </View>

                {/* Stats row */}
                <View style={styles.statsRow}>
                    <Pressable style={styles.statItem} onPress={() => router.push('/my-listings')}>
                        <Text style={styles.statNum}>{myListings}</Text>
                        <Text style={styles.statLabel}>Listings</Text>
                    </Pressable>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Text style={styles.statNum}>{user?.rating?.toFixed(1) || '—'}</Text>
                            <Ionicons name="star" size={12} color="#F59E0B" />
                        </View>
                        <Text style={styles.statLabel}>Rating</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNum}>{user?.reviewCount ?? 0}</Text>
                        <Text style={styles.statLabel}>Reviews</Text>
                    </View>
                </View>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Info badges */}
                {(user?.program || user?.major) && (
                    <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.infoPills}>
                        {user?.program && (
                            <View style={[styles.infoPill, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '20' }]}>
                                <Ionicons name="school-outline" size={14} color={colors.primary} />
                                <Text style={[styles.infoPillText, { color: colors.primary }]}>{user.program}</Text>
                            </View>
                        )}
                        {user?.major && (
                            <View style={[styles.infoPill, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '20' }]}>
                                <Ionicons name="book-outline" size={14} color={colors.primary} />
                                <Text style={[styles.infoPillText, { color: colors.primary }]}>{user.major}</Text>
                            </View>
                        )}
                        <View style={[styles.infoPill, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '20' }]}>
                            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                            <Text style={[styles.infoPillText, { color: colors.primary }]}>Semester {user?.semester ?? 1}</Text>
                        </View>
                    </Animated.View>
                )}

                {/* Bio */}
                {user?.bio ? (
                    <Animated.View entering={FadeInDown.delay(150).duration(400)} style={[styles.bioCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.bioText, { color: colors.textSecondary }]}>{user.bio}</Text>
                    </Animated.View>
                ) : null}

                {/* Skills, Interests, Weaknesses */}
                {((user?.skills?.length ?? 0) > 0 || (user?.interests?.length ?? 0) > 0 || (user?.weaknesses?.length ?? 0) > 0) && (
                    <Animated.View entering={FadeInDown.delay(200).duration(400)} style={[styles.detailsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {(user?.skills?.length ?? 0) > 0 && (
                            <View style={styles.detailSection}>
                                <Text style={[styles.detailLabel, { color: colors.text }]}>💪 Skills I Offer</Text>
                                <ChipList items={user!.skills!} color={colors.primary} />
                            </View>
                        )}
                        {(user?.interests?.length ?? 0) > 0 && (
                            <View style={styles.detailSection}>
                                <Text style={[styles.detailLabel, { color: colors.text }]}>✨ My Interests</Text>
                                <ChipList items={user!.interests!} color="#6366F1" />
                            </View>
                        )}
                        {(user?.weaknesses?.length ?? 0) > 0 && (
                            <View style={styles.detailSection}>
                                <Text style={[styles.detailLabel, { color: colors.text }]}>📚 Want to Learn</Text>
                                <ChipList items={user!.weaknesses!} color="#F59E0B" />
                            </View>
                        )}
                    </Animated.View>
                )}

                {/* Menu */}
                <Animated.View entering={FadeInDown.delay(300).duration(400)} style={[styles.menu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {MENU_ITEMS.map((item, i) => (
                        <Pressable key={i} style={({ pressed }) => [
                            styles.menuRow,
                            { borderBottomColor: colors.border },
                            pressed && { backgroundColor: colors.surface },
                            i === MENU_ITEMS.length - 1 && { borderBottomWidth: 0 },
                        ]} onPress={() => { triggerHaptic('light'); item.onPress(); }}>
                            <View style={[styles.menuIconWrap, { backgroundColor: colors.primary + '10' }]}>
                                <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                            </View>
                            <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                            <View style={{ flex: 1 }} />
                            {item.badge && (
                                <View style={[styles.menuBadge, { backgroundColor: colors.error }]}>
                                    <Text style={styles.menuBadgeText}>{item.badge}</Text>
                                </View>
                            )}
                            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                        </Pressable>
                    ))}
                </Animated.View>

                {/* Sign out */}
                <Animated.View entering={FadeInDown.delay(400).duration(400)}>
                    <Pressable style={styles.signOutBtn} onPress={signOut}>
                        <Ionicons name="log-out-outline" size={18} color={colors.error} />
                        <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
                    </Pressable>
                </Animated.View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: colors.textLight }]}>CampusBarter v1.0.0</Text>
                    <View style={styles.footerLinks}>
                        <Pressable onPress={() => router.push('/terms')}><Text style={[styles.footerLink, { color: colors.textLight }]}>Terms</Text></Pressable>
                        <Text style={[styles.footerDot, { color: colors.textLight }]}>·</Text>
                        <Pressable onPress={() => router.push('/privacy')}><Text style={[styles.footerLink, { color: colors.textLight }]}>Privacy</Text></Pressable>
                        <Text style={[styles.footerDot, { color: colors.textLight }]}>·</Text>
                        <Pressable onPress={() => router.push('/about')}><Text style={[styles.footerLink, { color: colors.textLight }]}>About</Text></Pressable>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const chipStyles = StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
        borderWidth: 1,
    },
    chipText: { fontSize: 12, fontWeight: '600' },
});

const styles = StyleSheet.create({
    container: { flex: 1 },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },

    // Gradient header
    headerBg: {
        paddingBottom: Spacing.lg,
    },
    headerActions: {
        flexDirection: 'row', paddingHorizontal: Spacing.xl,
        marginBottom: Spacing.sm,
    },
    headerBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    avatarSection: { alignItems: 'center', marginBottom: Spacing.lg },
    avatarRing: {
        borderRadius: 44, borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.3)', padding: 2,
    },
    name: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginTop: Spacing.md, letterSpacing: -0.3 },
    email: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

    // Stats
    statsRow: {
        flexDirection: 'row', marginHorizontal: Spacing.xl,
        backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: Radii.md,
        paddingVertical: Spacing.md,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statNum: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
    statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginTop: 2 },
    statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 },

    scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: 40 },

    // Info pills
    infoPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.lg },
    infoPill: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7, borderRadius: Radii.full,
        borderWidth: 1,
    },
    infoPillText: { fontSize: 12, fontWeight: '600' },

    // Bio
    bioCard: {
        borderRadius: Radii.md,
        padding: Spacing.lg, marginBottom: Spacing.lg,
        borderWidth: 1,
    },
    bioText: { fontSize: 14, lineHeight: 21 },

    // Details
    detailsCard: {
        borderWidth: 1,
        borderRadius: Radii.lg, padding: Spacing.lg, marginBottom: Spacing.lg, gap: Spacing.lg,
    },
    detailSection: { gap: 8 },
    detailLabel: { fontSize: 14, fontWeight: '700' },

    // Menu
    menu: {
        borderWidth: 1,
        borderRadius: Radii.lg, overflow: 'hidden', marginBottom: Spacing.xl,
    },
    menuRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        paddingHorizontal: Spacing.lg, paddingVertical: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    menuIconWrap: {
        width: 32, height: 32, borderRadius: 8,
        alignItems: 'center', justifyContent: 'center',
    },
    menuLabel: { fontSize: 15, fontWeight: '500' },
    menuBadge: {
        minWidth: 20, height: 20, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 6, marginRight: 4,
    },
    menuBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },

    signOutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
        paddingVertical: 14, borderRadius: Radii.md,
        borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
        backgroundColor: 'rgba(239,68,68,0.04)', marginBottom: Spacing.xl,
    },
    signOutText: { fontSize: 15, fontWeight: '600' },

    footer: { alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md },
    footerText: { fontSize: 12 },
    footerLinks: { flexDirection: 'row', gap: Spacing.sm },
    footerLink: { fontSize: 12 },
    footerDot: { fontSize: 12 },
});
