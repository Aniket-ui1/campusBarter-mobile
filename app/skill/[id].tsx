import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { StarRating } from '@/components/ui/StarRating';
import { Button } from '@/components/ui/Button';
import { MOCK_LISTINGS, MOCK_USERS, MOCK_CHAT_THREADS } from '@/data/mock';

const AVAIL_MAP: Record<string, { label: string; color: string }> = {
    available: { label: 'Available', color: AppColors.success },
    busy: { label: 'Busy', color: AppColors.warning },
    offline: { label: 'Offline', color: AppColors.error },
};

export default function SkillDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const listing = MOCK_LISTINGS.find((l) => l.id === id);
    const poster = MOCK_USERS.find((u) => u.id === listing?.userId);

    if (!listing || !poster) {
        return (
            <View style={styles.container}><View style={styles.statusSpacer} />
                <Text style={{ color: AppColors.text, padding: 20 }}>Listing not found.</Text>
            </View>
        );
    }

    const avail = AVAIL_MAP[listing.availability];

    const handleRequest = () => {
        Alert.alert('Request Sent!', `Your request to ${poster.displayName} for "${listing.title}" has been sent.`);
    };

    const handleMessage = () => {
        // Find the thread that contains the poster's userId
        const thread = MOCK_CHAT_THREADS.find((t) => t.participantIds.includes(poster.id));
        const chatId = thread?.id ?? MOCK_CHAT_THREADS[0]?.id ?? 'c1';
        router.push({ pathname: '/chat/[id]', params: { id: chatId } });
    };

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={AppColors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Skill Detail</Text>
                <Pressable style={styles.backBtn} onPress={() => router.push('/report')}>
                    <Ionicons name="flag-outline" size={20} color={AppColors.textMuted} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Title section */}
                <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                    <View style={styles.titleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>{listing.title}</Text>
                            <View style={styles.metaRow}>
                                <Badge label={listing.category} variant="primary" />
                                <View style={styles.availRow}>
                                    <View style={[styles.availDot, { backgroundColor: avail.color }]} />
                                    <Text style={[styles.availText, { color: avail.color }]}>{avail.label}</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.creditBox}>
                            <Text style={styles.creditNum}>{listing.credits}</Text>
                            <Text style={styles.creditLabel}>credit</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Description */}
                <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
                    <Text style={styles.sectionLabel}>DESCRIPTION</Text>
                    <Text style={styles.description}>{listing.description}</Text>
                </Animated.View>

                {/* Details */}
                <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.details}>
                    <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={18} color={AppColors.textSecondary} />
                        <Text style={styles.detailText}>{listing.location === 'online' ? 'Online' : listing.location === 'campus' ? 'On Campus' : 'Online & Campus'}</Text>
                    </View>
                    {listing.tags.length > 0 && (
                        <View style={styles.detailRow}>
                            <Ionicons name="pricetags-outline" size={18} color={AppColors.textSecondary} />
                            <View style={styles.tagsRow}>
                                {listing.tags.map((t) => (
                                    <View key={t} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
                                ))}
                            </View>
                        </View>
                    )}
                    {listing.rating > 0 && (
                        <View style={styles.detailRow}>
                            <Ionicons name="star-outline" size={18} color={AppColors.textSecondary} />
                            <StarRating rating={listing.rating} size={14} />
                        </View>
                    )}
                </Animated.View>

                {/* Poster profile */}
                <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.posterCard}>
                    <Text style={styles.sectionLabel}>POSTED BY</Text>
                    <View style={styles.posterRow}>
                        <Avatar name={poster.displayName} size={48} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.posterName}>{poster.displayName}</Text>
                            <Text style={styles.posterInfo}>{poster.program} · Sem {poster.semester}</Text>
                            <StarRating rating={poster.rating} size={12} />
                        </View>
                        <Pressable style={styles.profileBtn} onPress={() => router.push({ pathname: '/reviews/[userId]', params: { userId: poster.id } })}>
                            <Text style={styles.profileBtnText}>View</Text>
                        </Pressable>
                    </View>
                </Animated.View>

                {/* CTA */}
                <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.ctaSection}>
                    <Button title="Request This Skill" onPress={handleRequest} fullWidth size="lg"
                        icon={<Ionicons name="hand-left-outline" size={20} color="#FFFFFF" />} />
                    <Button title="Message" onPress={handleMessage} variant="secondary" fullWidth
                        icon={<Ionicons name="chatbubble-outline" size={18} color={AppColors.primary} />} />
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppColors.background },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: AppColors.surface, alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: AppColors.text },
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
    titleRow: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.xl },
    title: { fontSize: 24, fontWeight: '900', color: AppColors.text, letterSpacing: -0.5, marginBottom: Spacing.sm },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    availRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    availDot: { width: 6, height: 6, borderRadius: 3 },
    availText: { fontSize: 12, fontWeight: '600' },
    creditBox: {
        backgroundColor: AppColors.surface, borderWidth: 1, borderColor: AppColors.border,
        borderRadius: Radii.lg, padding: Spacing.lg, alignItems: 'center', justifyContent: 'center',
        minWidth: 64,
    },
    creditNum: { fontSize: 24, fontWeight: '900', color: AppColors.primary },
    creditLabel: { fontSize: 11, color: AppColors.textSecondary, fontWeight: '500' },
    section: { marginBottom: Spacing.xl },
    sectionLabel: { fontSize: 11, color: AppColors.textMuted, fontWeight: '600', letterSpacing: 1.5, marginBottom: Spacing.sm },
    description: { fontSize: 15, color: AppColors.textSecondary, lineHeight: 24 },
    details: {
        backgroundColor: AppColors.surfaceLight, borderWidth: 1, borderColor: AppColors.border,
        borderRadius: Radii.lg, padding: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.xl,
    },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    detailText: { fontSize: 14, color: AppColors.textSecondary },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    tag: { backgroundColor: AppColors.surface, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    tagText: { fontSize: 12, color: AppColors.textSecondary },
    posterCard: {
        backgroundColor: AppColors.surfaceLight, borderWidth: 1, borderColor: AppColors.border,
        borderRadius: Radii.lg, padding: Spacing.lg, marginBottom: Spacing.xl, gap: Spacing.md,
    },
    posterRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    posterName: { fontSize: 16, fontWeight: '700', color: AppColors.text },
    posterInfo: { fontSize: 12, color: AppColors.textSecondary, marginBottom: 4 },
    profileBtn: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radii.sm,
        borderWidth: 1, borderColor: AppColors.primary,
    },
    profileBtnText: { color: AppColors.primary, fontSize: 13, fontWeight: '600' },
    ctaSection: { gap: Spacing.md },
});
