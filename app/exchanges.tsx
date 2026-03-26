// app/exchanges.tsx — My Exchanges list (incoming + outgoing) — premium redesign

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator, Platform, Pressable, RefreshControl,
    ScrollView, StyleSheet, Text, View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, Radii, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getMyExchanges, SkillExchange } from '@/lib/api';

// ── Status config ─────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; bg: string; iconBg: string; icon: string; label: string }> = {
    REQUESTED: { color: '#D97706', bg: '#FFFBEB', iconBg: '#FEF3C7', icon: 'time-outline',             label: 'Pending'   },
    ACCEPTED:  { color: '#2563EB', bg: '#EFF6FF', iconBg: '#DBEAFE', icon: 'checkmark-circle-outline', label: 'Accepted'  },
    COMPLETED: { color: '#16A34A', bg: '#F0FDF4', iconBg: '#DCFCE7', icon: 'trophy-outline',           label: 'Completed' },
    CANCELLED: { color: '#6B7280', bg: '#F9FAFB', iconBg: '#F3F4F6', icon: 'close-circle-outline',     label: 'Cancelled' },
    DISPUTED:  { color: '#DC2626', bg: '#FEF2F2', iconBg: '#FEE2E2', icon: 'warning-outline',          label: 'Disputed'  },
};

function initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
    return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase();
}

// ── Exchange Card ─────────────────────────────────────────────────
function ExchangeCard({
    ex, userId, isIncoming, onPress,
}: { ex: SkillExchange; userId: string; isIncoming: boolean; onPress: () => void }) {
    const cfg      = STATUS_CONFIG[ex.status] ?? STATUS_CONFIG.REQUESTED;
    const otherName = isIncoming ? (ex.requesterName ?? 'Unknown') : (ex.providerName ?? 'Unknown');
    const direction = isIncoming ? `↙ from ${otherName}` : `↗ to ${otherName}`;
    const date      = new Date(ex.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <Pressable
            style={[styles.card, { backgroundColor: cfg.bg, borderLeftColor: cfg.color }]}
            onPress={onPress}
        >
            {/* Top row: icon + title + credit badge */}
            <View style={styles.cardTop}>
                <View style={[styles.statusIconCircle, { backgroundColor: cfg.iconBg }]}>
                    <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                </View>
                <Text style={styles.listingTitle} numberOfLines={2}>{ex.listingTitle}</Text>
                <View style={styles.creditBadge}>
                    <Text style={styles.creditBadgeText}>🪙 {ex.credits}</Text>
                </View>
            </View>

            {/* Bottom row: avatar + name + status badge + date */}
            <View style={styles.cardBottom}>
                <View style={styles.avatarRow}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{initials(otherName)}</Text>
                    </View>
                    <Text style={styles.directionText} numberOfLines={1}>{direction}</Text>
                </View>
                <View style={styles.cardMeta}>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.color + '18' }]}>
                        <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <Text style={styles.dateText}>{date}</Text>
                </View>
            </View>
        </Pressable>
    );
}

// ── Empty State ───────────────────────────────────────────────────
function EmptyState({ tab, onBrowse }: { tab: 'incoming' | 'outgoing'; onBrowse: () => void }) {
    const isIncoming = tab === 'incoming';
    return (
        <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{isIncoming ? '🎯' : '🚀'}</Text>
            <Text style={styles.emptyTitle}>{isIncoming ? 'No requests yet' : 'No outgoing requests'}</Text>
            <Text style={styles.emptySubtitle}>
                {isIncoming
                    ? 'When someone wants to learn from you, their request will appear here.'
                    : "Browse skills and tap 'Request This Skill' to start an exchange."}
            </Text>
            <Pressable style={styles.emptyBtn} onPress={onBrowse}>
                <Ionicons name="search-outline" size={15} color="#FFF" />
                <Text style={styles.emptyBtnText}>Browse Skills</Text>
            </Pressable>
        </View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────
export default function ExchangesScreen() {
    const router   = useRouter();
    const { user } = useAuth();
    const [exchanges, setExchanges]   = useState<SkillExchange[]>([]);
    const [loading, setLoading]       = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tab, setTab]               = useState<'incoming' | 'outgoing'>('incoming');

    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true); else setLoading(true);
        try {
            const data = await getMyExchanges();
            setExchanges(data);
        } catch { /* silent */ } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { void load(); }, [load]));

    const incoming  = exchanges.filter(e => e.providerId  === user?.id);
    const outgoing  = exchanges.filter(e => e.requesterId === user?.id);
    const pool      = tab === 'incoming' ? incoming : outgoing;

    const active    = pool.filter(e => e.status === 'REQUESTED' || e.status === 'ACCEPTED' || e.status === 'DISPUTED');
    const completed = pool.filter(e => e.status === 'COMPLETED');
    const cancelled = pool.filter(e => e.status === 'CANCELLED');

    // Summary stats (all unique exchanges)
    const allUnique   = exchanges;
    const pendingCount    = allUnique.filter(e => e.status === 'REQUESTED' || e.status === 'ACCEPTED').length;
    const completedCount  = allUnique.filter(e => e.status === 'COMPLETED').length;
    const completedCredits = allUnique.filter(e => e.status === 'COMPLETED').reduce((s, e) => s + (e.credits ?? 0), 0);

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color="#FFF" />
                </Pressable>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>My Exchanges</Text>
                    <Text style={styles.headerSub}>Track your skill trades</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Summary Banner */}
            <View style={styles.banner}>
                <View style={styles.bannerPill}>
                    <Text style={styles.bannerNum}>{pendingCount}</Text>
                    <Text style={styles.bannerLabel}>Pending</Text>
                </View>
                <View style={styles.bannerDivider} />
                <View style={styles.bannerPill}>
                    <Text style={styles.bannerNum}>{completedCount}</Text>
                    <Text style={styles.bannerLabel}>Completed</Text>
                </View>
                <View style={styles.bannerDivider} />
                <View style={styles.bannerPill}>
                    <Text style={styles.bannerNum}>🪙 {completedCredits}</Text>
                    <Text style={styles.bannerLabel}>Credits Traded</Text>
                </View>
            </View>

            {/* Segmented Tabs */}
            <View style={styles.segmentWrapper}>
                <View style={styles.segment}>
                    <Pressable
                        style={[styles.segBtn, tab === 'incoming' && styles.segBtnActive]}
                        onPress={() => setTab('incoming')}
                    >
                        <Text style={[styles.segBtnText, tab === 'incoming' && styles.segBtnTextActive]}>
                            Incoming
                        </Text>
                        {incoming.length > 0 && (
                            <View style={[styles.segCount, tab === 'incoming' && styles.segCountActive]}>
                                <Text style={[styles.segCountText, tab === 'incoming' && styles.segCountTextActive]}>
                                    {incoming.length}
                                </Text>
                            </View>
                        )}
                    </Pressable>
                    <Pressable
                        style={[styles.segBtn, tab === 'outgoing' && styles.segBtnActive]}
                        onPress={() => setTab('outgoing')}
                    >
                        <Text style={[styles.segBtnText, tab === 'outgoing' && styles.segBtnTextActive]}>
                            Outgoing
                        </Text>
                        {outgoing.length > 0 && (
                            <View style={[styles.segCount, tab === 'outgoing' && styles.segCountActive]}>
                                <Text style={[styles.segCountText, tab === 'outgoing' && styles.segCountTextActive]}>
                                    {outgoing.length}
                                </Text>
                            </View>
                        )}
                    </Pressable>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={AppColors.primary} />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={AppColors.primary} />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    {pool.length === 0 ? (
                        <EmptyState tab={tab} onBrowse={() => router.push('/(tabs)/search' as any)} />
                    ) : (
                        <>
                            {active.map((ex, i) => (
                                <Animated.View key={ex.id} entering={FadeInDown.delay(i * 55).duration(320)}>
                                    <ExchangeCard
                                        ex={ex}
                                        userId={user?.id ?? ''}
                                        isIncoming={tab === 'incoming'}
                                        onPress={() => router.push({ pathname: '/exchange/[id]' as any, params: { id: ex.id } })}
                                    />
                                </Animated.View>
                            ))}

                            {completed.length > 0 && (
                                <>
                                    <View style={styles.sectionDivider}>
                                        <View style={styles.sectionDividerLine} />
                                        <Text style={styles.sectionDividerLabel}>✅ Completed</Text>
                                        <View style={styles.sectionDividerLine} />
                                    </View>
                                    {completed.map((ex, i) => (
                                        <Animated.View key={ex.id} entering={FadeInDown.delay((active.length + i) * 55).duration(320)}>
                                            <ExchangeCard
                                                ex={ex}
                                                userId={user?.id ?? ''}
                                                isIncoming={tab === 'incoming'}
                                                onPress={() => router.push({ pathname: '/exchange/[id]' as any, params: { id: ex.id } })}
                                            />
                                        </Animated.View>
                                    ))}
                                </>
                            )}

                            {cancelled.length > 0 && (
                                <>
                                    <View style={styles.sectionDivider}>
                                        <View style={styles.sectionDividerLine} />
                                        <Text style={styles.sectionDividerLabel}>🚫 Cancelled</Text>
                                        <View style={styles.sectionDividerLine} />
                                    </View>
                                    {cancelled.map((ex, i) => (
                                        <Animated.View key={ex.id} entering={FadeInDown.delay((active.length + completed.length + i) * 55).duration(320)}>
                                            <ExchangeCard
                                                ex={ex}
                                                userId={user?.id ?? ''}
                                                isIncoming={tab === 'incoming'}
                                                onPress={() => router.push({ pathname: '/exchange/[id]' as any, params: { id: ex.id } })}
                                            />
                                        </Animated.View>
                                    ))}
                                </>
                            )}
                        </>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container:    { flex: 1, backgroundColor: AppColors.background },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36, backgroundColor: AppColors.primaryDark },
    center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // Header
    header: {
        backgroundColor: AppColors.primaryDark,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, paddingBottom: Spacing.lg,
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: '#FFF' },
    headerSub:   { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 },

    // Summary Banner
    banner: {
        backgroundColor: AppColors.primaryDark,
        flexDirection: 'row',
        paddingBottom: Spacing.lg,
        paddingHorizontal: Spacing.xl,
    },
    bannerPill:    { flex: 1, alignItems: 'center' },
    bannerNum:     { fontSize: 18, fontWeight: '900', color: '#FFF' },
    bannerLabel:   { fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2, fontWeight: '600' },
    bannerDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 },

    // Segmented Control
    segmentWrapper: {
        backgroundColor: AppColors.primaryDark,
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.lg,
    },
    segment: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: Radii.full,
        padding: 4,
    },
    segBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 9, borderRadius: Radii.full, gap: 6,
    },
    segBtnActive: {
        backgroundColor: '#FFF',
        ...(Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4 },
            android: { elevation: 3 },
            default: {},
        }) as any),
    },
    segBtnText:       { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.65)' },
    segBtnTextActive: { color: AppColors.primaryDark },
    segCount: {
        minWidth: 18, height: 18, borderRadius: 9,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    },
    segCountActive:     { backgroundColor: AppColors.primaryDark + '20' },
    segCountText:       { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.9)' },
    segCountTextActive: { color: AppColors.primaryDark },

    // List
    list: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: 48 },

    // Card
    card: {
        borderRadius: Radii.lg,
        borderLeftWidth: 4,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        gap: Spacing.md,
        ...(Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
            android: { elevation: 2 },
            default: {},
        }) as any),
    },
    cardTop: {
        flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    },
    statusIconCircle: {
        width: 36, height: 36, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    listingTitle: {
        flex: 1, fontSize: 15, fontWeight: '800', color: AppColors.text, lineHeight: 20,
    },
    creditBadge: {
        backgroundColor: AppColors.primaryDark,
        borderRadius: Radii.full,
        paddingHorizontal: 10, paddingVertical: 5,
        flexShrink: 0,
    },
    creditBadgeText: { fontSize: 12, fontWeight: '800', color: '#FFF' },

    cardBottom: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    avatarRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    avatarCircle: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: AppColors.surface,
        borderWidth: 1.5, borderColor: AppColors.border,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText:    { fontSize: 10, fontWeight: '800', color: AppColors.primary },
    directionText: { fontSize: 12, color: AppColors.textSecondary, fontWeight: '600', flex: 1 },
    cardMeta:      { alignItems: 'flex-end', gap: 4 },
    statusBadge: {
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radii.full,
    },
    statusBadgeText: { fontSize: 10, fontWeight: '800' },
    dateText:        { fontSize: 10, color: AppColors.textMuted },

    // Section divider
    sectionDivider: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        marginTop: Spacing.sm, marginBottom: Spacing.xs,
    },
    sectionDividerLine:  { flex: 1, height: 1, backgroundColor: AppColors.border },
    sectionDividerLabel: { fontSize: 11, fontWeight: '700', color: AppColors.textMuted },

    // Empty state
    empty: { alignItems: 'center', paddingTop: 56, paddingHorizontal: Spacing['2xl'], gap: Spacing.md },
    emptyIcon:     { fontSize: 64 },
    emptyTitle:    { fontSize: 18, fontWeight: '800', color: AppColors.text, textAlign: 'center' },
    emptySubtitle: { fontSize: 13, color: AppColors.textMuted, textAlign: 'center', lineHeight: 19 },
    emptyBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: AppColors.primary,
        paddingHorizontal: 20, paddingVertical: 11, borderRadius: Radii.full,
        marginTop: Spacing.sm,
    },
    emptyBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
});
