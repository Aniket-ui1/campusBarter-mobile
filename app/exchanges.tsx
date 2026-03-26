// app/exchanges.tsx — My Exchanges list (incoming + outgoing)

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

const STATUS_COLOR: Record<string, string> = {
    REQUESTED: '#F59E0B',
    ACCEPTED:  '#3B82F6',
    COMPLETED: '#22C55E',
    CANCELLED: '#6B7280',
    DISPUTED:  '#EF4444',
};

const STATUS_LABEL: Record<string, string> = {
    REQUESTED: 'Pending',
    ACCEPTED:  'Accepted',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    DISPUTED:  'Disputed',
};

function ExchangeCard({ ex, userId, onPress }: { ex: SkillExchange; userId: string; onPress: () => void }) {
    const isRequester = ex.requesterId === userId;
    const otherName   = isRequester ? ex.providerName : ex.requesterName;
    const color       = STATUS_COLOR[ex.status] ?? AppColors.textMuted;
    const date        = new Date(ex.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
        <Pressable style={styles.card} onPress={onPress}>
            <View style={styles.cardLeft}>
                <View style={[styles.statusDot, { backgroundColor: color }]} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.listingTitle} numberOfLines={1}>{ex.listingTitle}</Text>
                    <Text style={styles.otherUser}>{isRequester ? 'Provider' : 'Requester'}: {otherName}</Text>
                </View>
            </View>
            <View style={styles.cardRight}>
                <Text style={styles.credits}>🪙 {ex.credits}</Text>
                <View style={[styles.badge, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.badgeText, { color }]}>{STATUS_LABEL[ex.status]}</Text>
                </View>
                <Text style={styles.date}>{date}</Text>
            </View>
        </Pressable>
    );
}

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
    const displayed = tab === 'incoming' ? incoming : outgoing;

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color="#FFF" />
                </Pressable>
                <Text style={styles.headerTitle}>My Exchanges</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.tabs}>
                <Pressable
                    style={[styles.tab, tab === 'incoming' && styles.tabActive]}
                    onPress={() => setTab('incoming')}
                >
                    <Text style={[styles.tabText, tab === 'incoming' && styles.tabTextActive]}>
                        Incoming {incoming.length > 0 ? `(${incoming.length})` : ''}
                    </Text>
                </Pressable>
                <Pressable
                    style={[styles.tab, tab === 'outgoing' && styles.tabActive]}
                    onPress={() => setTab('outgoing')}
                >
                    <Text style={[styles.tabText, tab === 'outgoing' && styles.tabTextActive]}>
                        Outgoing {outgoing.length > 0 ? `(${outgoing.length})` : ''}
                    </Text>
                </Pressable>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={AppColors.primary} />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
                    showsVerticalScrollIndicator={false}
                >
                    {displayed.length === 0 ? (
                        <View style={styles.empty}>
                            <Text style={styles.emptyEmoji}>{tab === 'incoming' ? '📭' : '📤'}</Text>
                            <Text style={styles.emptyText}>
                                {tab === 'incoming' ? 'No one has requested your skills yet' : 'You have no outgoing requests'}
                            </Text>
                        </View>
                    ) : (
                        displayed.map((ex, i) => (
                            <Animated.View key={ex.id} entering={FadeInDown.delay(i * 50).duration(300)}>
                                <ExchangeCard
                                    ex={ex}
                                    userId={user?.id ?? ''}
                                    onPress={() => router.push({ pathname: '/exchange/[id]' as any, params: { id: ex.id } })}
                                />
                            </Animated.View>
                        ))
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container:    { flex: 1, backgroundColor: AppColors.background },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36, backgroundColor: AppColors.primaryDark },
    center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: {
        backgroundColor: AppColors.primaryDark,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    },
    backBtn:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: '#FFF' },

    tabs: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderBottomWidth: 1, borderBottomColor: AppColors.border,
    },
    tab: {
        flex: 1, paddingVertical: 14, alignItems: 'center',
        borderBottomWidth: 2, borderBottomColor: 'transparent',
    },
    tabActive:     { borderBottomColor: AppColors.primary },
    tabText:       { fontSize: 14, fontWeight: '600', color: AppColors.textMuted },
    tabTextActive: { color: AppColors.primary },

    list: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: 40 },

    card: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#FFF', borderRadius: Radii.lg,
        padding: Spacing.lg, borderWidth: 1, borderColor: AppColors.border,
        ...(Shadows.sm as any),
    },
    cardLeft:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 8 },
    cardRight: { alignItems: 'flex-end', gap: 4 },
    statusDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },

    listingTitle: { fontSize: 14, fontWeight: '700', color: AppColors.text },
    otherUser:    { fontSize: 12, color: AppColors.textMuted, marginTop: 2 },
    credits:      { fontSize: 13, fontWeight: '700', color: AppColors.text },
    badge: {
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radii.full,
    },
    badgeText: { fontSize: 11, fontWeight: '700' },
    date:      { fontSize: 11, color: AppColors.textMuted },

    empty:      { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyEmoji: { fontSize: 48 },
    emptyText:  { fontSize: 15, color: AppColors.textMuted, textAlign: 'center' },
});


