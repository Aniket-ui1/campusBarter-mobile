import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { StarRating } from '@/components/ui/StarRating';



export default function ProfileScreen() {
    const { user, signOut } = useAuth();
    const router = useRouter();

    type MenuItem = { icon: string; label: string; onPress: () => void; badge?: string };
    const MENU_ITEMS: MenuItem[] = [
        { icon: 'list-outline', label: 'My Listings', onPress: () => router.push('/my-listings') },
        { icon: 'git-pull-request-outline', label: 'My Requests', onPress: () => router.push('/my-requests') },
        { icon: 'bookmark-outline', label: 'Drafts', onPress: () => router.push('/drafts') },
        { icon: 'star-outline', label: 'Reviews', onPress: () => router.push({ pathname: '/reviews/[userId]', params: { userId: user?.id ?? 'u1' } }) },
        { icon: 'notifications-outline', label: 'Notifications', onPress: () => router.push('/notifications'), badge: '2' },
        { icon: 'settings-outline', label: 'Settings', onPress: () => router.push('/settings') },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Profile card */}
                <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.profileCard}>
                    <Avatar name={user?.displayName || ''} size={72} />
                    <Text style={styles.name}>{user?.displayName}</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                    <View style={styles.infoRow}>
                        <Badge label={user?.program || ''} variant="primary" />
                        <Badge label={`Sem ${user?.semester}`} variant="subtle" />
                    </View>
                    <StarRating rating={user?.rating || 0} size={16} />
                    <Text style={styles.reviewCount}>{user?.reviewCount} reviews</Text>
                    {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
                    <Pressable style={styles.editBtn} onPress={() => router.push('/edit-profile')}>
                        <Ionicons name="create-outline" size={16} color={AppColors.primary} />
                        <Text style={styles.editText}>Edit Profile</Text>
                    </Pressable>
                </Animated.View>

                {/* Menu */}
                <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.menu}>
                    {MENU_ITEMS.map((item, i) => (
                        <Pressable key={i} style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.8 }]}
                            onPress={item.onPress}>
                            <Ionicons name={item.icon as any} size={20} color={AppColors.textSecondary} />
                            <Text style={styles.menuLabel}>{item.label}</Text>
                            <View style={{ flex: 1 }} />
                            {item.badge && (
                                <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{item.badge}</Text></View>
                            )}
                            <Ionicons name="chevron-forward" size={16} color={AppColors.textMuted} />
                        </Pressable>
                    ))}
                </Animated.View>

                {/* Sign out */}
                <Animated.View entering={FadeInDown.delay(450).duration(400)}>
                    <Pressable style={styles.signOutBtn} onPress={signOut}>
                        <Ionicons name="log-out-outline" size={20} color={AppColors.error} />
                        <Text style={styles.signOutText}>Sign Out</Text>
                    </Pressable>
                </Animated.View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>CampusBarter v1.0.0</Text>
                    <View style={styles.footerLinks}>
                        <Pressable onPress={() => router.push('/terms')}><Text style={styles.footerLink}>Terms</Text></Pressable>
                        <Text style={styles.footerDot}>·</Text>
                        <Pressable onPress={() => router.push('/privacy')}><Text style={styles.footerLink}>Privacy</Text></Pressable>
                        <Text style={styles.footerDot}>·</Text>
                        <Pressable onPress={() => router.push('/about')}><Text style={styles.footerLink}>About</Text></Pressable>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppColors.background },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },

    profileCard: {
        alignItems: 'center', gap: Spacing.sm,
        backgroundColor: AppColors.surfaceLight, borderWidth: 1, borderColor: AppColors.border,
        borderRadius: Radii.xl, padding: Spacing['2xl'], marginBottom: Spacing.xl,
    },
    name: { fontSize: 22, fontWeight: '900', color: AppColors.text, marginTop: Spacing.sm },
    email: { fontSize: 13, color: AppColors.textSecondary },
    infoRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
    reviewCount: { fontSize: 12, color: AppColors.textSecondary, marginTop: -2 },
    bio: { fontSize: 13, color: AppColors.textSecondary, textAlign: 'center', lineHeight: 20, marginTop: Spacing.sm },
    editBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginTop: Spacing.md,
        paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: Radii.sm, borderWidth: 1, borderColor: AppColors.primary,
    },
    editText: { color: AppColors.primary, fontSize: 13, fontWeight: '600' },

    menu: {
        backgroundColor: AppColors.surfaceLight, borderWidth: 1, borderColor: AppColors.border,
        borderRadius: Radii.lg, overflow: 'hidden', marginBottom: Spacing.xl,
    },
    menuRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg,
        borderBottomWidth: 1, borderBottomColor: AppColors.border,
    },
    menuLabel: { fontSize: 15, color: AppColors.text, fontWeight: '500' },
    menuBadge: {
        minWidth: 20, height: 20, borderRadius: 10,
        backgroundColor: AppColors.error, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 6, marginRight: 4,
    },
    menuBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },

    signOutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
        paddingVertical: Spacing.lg, borderRadius: Radii.md,
        borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
        backgroundColor: 'rgba(239,68,68,0.06)', marginBottom: Spacing.xl,
    },
    signOutText: { color: AppColors.error, fontSize: 15, fontWeight: '600' },

    footer: { alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md },
    footerText: { fontSize: 12, color: AppColors.textMuted },
    footerLinks: { flexDirection: 'row', gap: Spacing.sm },
    footerLink: { fontSize: 12, color: AppColors.textMuted },
    footerDot: { fontSize: 12, color: AppColors.textMuted },
});
