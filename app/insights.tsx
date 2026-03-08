// app/insights.tsx — Market Insights Dashboard (Task 7)

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, Radii, Shadows, Spacing } from '@/constants/theme';
import { getApiToken } from '@/lib/api';

const API_BASE = process.env.EXPO_PUBLIC_API_URL
    ?? 'https://campusbarter-api-f3b4ascaemgthae3.canadacentral-01.azurewebsites.net';

interface InsightsData {
    trendingThisWeek: { id: string; type: string; title: string; credits: number; userName: string; createdAt: string }[];
    mostWantedCategories: { category: string; count: number }[];
    avgCreditsByType: { type: string; avgCredits: number; count: number }[];
    totalListings: number;
    totalExchanges: number;
}

const CAT_EMOJIS: Record<string, string> = {
    Mathematics: '📐', Programming: '💻', Tutoring: '📚',
    'Study Materials': '📝', Design: '🎨', Other: '📦',
};

const BAR_COLORS = [AppColors.primary, '#6366F1', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];

export default function InsightsScreen() {
    const router = useRouter();
    const [data, setData] = useState<InsightsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const token = getApiToken();
                const res = await fetch(`${API_BASE}/api/v1/insights/market`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (res.ok) setData(await res.json());
            } catch (e) {
                console.warn('[Insights] Error:', e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const maxCat = data?.mostWantedCategories?.[0]?.count ?? 1;

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />

            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color="#FFF" />
                </Pressable>
                <View>
                    <Text style={styles.headerTitle}>📊 Market Insights</Text>
                    <Text style={styles.headerSub}>What&apos;s hot on campus this week</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={AppColors.primary} /></View>
            ) : data ? (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                    {/* Stats cards */}
                    <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.statsRow}>
                        <View style={[styles.statCard, { backgroundColor: AppColors.primary }]}>
                            <Text style={styles.statNum}>{data.totalListings}</Text>
                            <Text style={styles.statLabel}>Total Listings</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: '#6366F1' }]}>
                            <Text style={styles.statNum}>{data.totalExchanges}</Text>
                            <Text style={styles.statLabel}>Exchanges</Text>
                        </View>
                    </Animated.View>

                    {/* Average credits */}
                    <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.card}>
                        <Text style={styles.sectionTitle}>💰 Avg Credits by Type</Text>
                        <View style={styles.avgRow}>
                            {data.avgCreditsByType.map((item) => (
                                <View key={item.type} style={styles.avgCard}>
                                    <Text style={styles.avgType}>{item.type}</Text>
                                    <Text style={styles.avgNum}>{Math.round(item.avgCredits)}⏱️</Text>
                                    <Text style={styles.avgCount}>{item.count} listings</Text>
                                </View>
                            ))}
                        </View>
                    </Animated.View>

                    {/* Most wanted categories (bar chart) */}
                    <Animated.View entering={FadeInDown.delay(220).duration(400)} style={styles.card}>
                        <Text style={styles.sectionTitle}>🔥 Most Wanted Categories</Text>
                        {data.mostWantedCategories.length === 0 ? (
                            <Text style={styles.emptyText}>No data yet</Text>
                        ) : (
                            data.mostWantedCategories.map((cat, i) => (
                                <Animated.View key={cat.category} entering={FadeInDown.delay(280 + i * 60).duration(300)}>
                                    <View style={styles.barRow}>
                                        <Text style={styles.barEmoji}>{CAT_EMOJIS[cat.category] ?? '📦'}</Text>
                                        <View style={{ flex: 1 }}>
                                            <View style={styles.barLabelRow}>
                                                <Text style={styles.barLabel}>{cat.category}</Text>
                                                <Text style={styles.barCount}>{cat.count}</Text>
                                            </View>
                                            <View style={styles.barBg}>
                                                <Animated.View
                                                    style={[styles.barFill, {
                                                        width: `${Math.max(8, (cat.count / maxCat) * 100)}%`,
                                                        backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                                                    }]}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                </Animated.View>
                            ))
                        )}
                    </Animated.View>

                    {/* Trending this week */}
                    <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                        <Text style={styles.sectionTitle}>📈 Trending This Week</Text>
                        {data.trendingThisWeek.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyText}>No new listings this week</Text>
                            </View>
                        ) : (
                            data.trendingThisWeek.map((item, i) => (
                                <Animated.View key={item.id} entering={FadeInDown.delay(360 + i * 40).duration(300)}>
                                    <View style={styles.trendRow}>
                                        <View style={[styles.typePill, { backgroundColor: item.type === 'OFFER' ? AppColors.success + '15' : AppColors.primary + '15' }]}>
                                            <Text style={[styles.typeText, { color: item.type === 'OFFER' ? AppColors.success : AppColors.primary }]}>
                                                {item.type}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.trendTitle} numberOfLines={1}>{item.title}</Text>
                                            <Text style={styles.trendMeta}>by {item.userName} · {item.credits}⏱️</Text>
                                        </View>
                                    </View>
                                </Animated.View>
                            ))
                        )}
                    </Animated.View>
                </ScrollView>
            ) : (
                <View style={styles.center}>
                    <Text style={styles.emptyText}>Failed to load insights</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppColors.background },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36, backgroundColor: AppColors.primaryDark },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: {
        backgroundColor: AppColors.primaryDark,
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 48, paddingTop: Spacing.xl, gap: Spacing.xl },

    // Stats
    statsRow: { flexDirection: 'row', gap: 12 },
    statCard: {
        flex: 1, borderRadius: Radii.xl, padding: Spacing.lg,
        alignItems: 'center', gap: 4, ...(Shadows.md as any),
    },
    statNum: { fontSize: 36, fontWeight: '900', color: '#FFF' },
    statLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },

    card: {
        backgroundColor: '#FFF', borderRadius: Radii.lg,
        padding: Spacing.lg, borderWidth: 1, borderColor: AppColors.border, gap: Spacing.md,
    },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: AppColors.text, letterSpacing: -0.3 },

    // Avg credits
    avgRow: { flexDirection: 'row', gap: 12 },
    avgCard: {
        flex: 1, backgroundColor: AppColors.surface, borderRadius: Radii.md,
        padding: Spacing.md, alignItems: 'center', gap: 4,
    },
    avgType: { fontSize: 11, fontWeight: '700', color: AppColors.textSecondary },
    avgNum: { fontSize: 22, fontWeight: '900', color: AppColors.text },
    avgCount: { fontSize: 10, color: AppColors.textMuted },

    // Bar chart
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    barEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
    barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    barLabel: { fontSize: 13, fontWeight: '600', color: AppColors.text },
    barCount: { fontSize: 13, fontWeight: '800', color: AppColors.primary },
    barBg: { height: 8, borderRadius: 4, backgroundColor: AppColors.surface, overflow: 'hidden' },
    barFill: { height: 8, borderRadius: 4 },

    // Trending
    trendRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#FFF', borderRadius: Radii.md,
        padding: Spacing.md, marginBottom: 6,
        borderWidth: 1, borderColor: AppColors.border,
    },
    typePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    typeText: { fontSize: 10, fontWeight: '800' },
    trendTitle: { fontSize: 14, fontWeight: '700', color: AppColors.text },
    trendMeta: { fontSize: 12, color: AppColors.textMuted, marginTop: 2 },

    emptyCard: { backgroundColor: AppColors.surface, borderRadius: Radii.md, padding: Spacing.xl, alignItems: 'center' },
    emptyText: { fontSize: 14, color: AppColors.textMuted },
});
