// app/leaderboard.tsx — Weekly Credits Leaderboard (Task 4)

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { AppColors, Radii, Shadows, Spacing } from '@/constants/theme';
import { Avatar } from '@/components/ui/Avatar';
import { getApiToken } from '@/lib/api';

const API_BASE = process.env.EXPO_PUBLIC_API_URL
    ?? 'https://campusbarter-api-f3b4ascaemgthae3.canadacentral-01.azurewebsites.net';

interface LeaderEntry {
    id: string;
    displayName: string;
    avatarUrl?: string;
    weeklyCredits: number;
}

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const RANK_EMOJI = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
    const router = useRouter();
    const [data, setData] = useState<LeaderEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const token = getApiToken();
                const res = await fetch(`${API_BASE}/api/v1/insights/leaderboard`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (res.ok) setData(await res.json());
            } catch (e) {
                console.warn('[Leaderboard] Error:', e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color="#FFF" />
                </Pressable>
                <View>
                    <Text style={styles.headerTitle}>🏆 Leaderboard</Text>
                    <Text style={styles.headerSub}>Top helpers this week</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={AppColors.primary} /></View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                    {/* Top 3 podium */}
                    {data.length >= 3 && (
                        <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.podium}>
                            {[1, 0, 2].map((idx) => {
                                const entry = data[idx];
                                const isFirst = idx === 0;
                                return (
                                    <View key={entry.id} style={[styles.podiumSlot, isFirst && styles.podiumFirst]}>
                                        <Text style={styles.podiumEmoji}>{RANK_EMOJI[idx]}</Text>
                                        <View style={[styles.podiumAvatar, { borderColor: RANK_COLORS[idx] }]}>
                                            <Avatar name={entry.displayName} size={isFirst ? 56 : 44} />
                                        </View>
                                        <Text style={styles.podiumName} numberOfLines={1}>
                                            {entry.displayName.split(' ')[0]}
                                        </Text>
                                        <View style={[styles.podiumBadge, { backgroundColor: RANK_COLORS[idx] }]}>
                                            <Text style={styles.podiumCredits}>{entry.weeklyCredits}⏱️</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </Animated.View>
                    )}

                    {/* Full list */}
                    {data.map((entry, i) => (
                        <Animated.View key={entry.id} entering={FadeInDown.delay(200 + i * 50).duration(300)}>
                            <View style={styles.row}>
                                <View style={[styles.rankCircle, i < 3 && { backgroundColor: RANK_COLORS[i] }]}>
                                    <Text style={[styles.rankNum, i < 3 && { color: '#FFF' }]}>{i + 1}</Text>
                                </View>
                                <Avatar name={entry.displayName} size={40} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.name}>{entry.displayName}</Text>
                                    <Text style={styles.subtitle}>Top helper</Text>
                                </View>
                                <View style={styles.creditsBadge}>
                                    <Text style={styles.creditsText}>{entry.weeklyCredits}⏱️</Text>
                                </View>
                            </View>
                        </Animated.View>
                    ))}

                    {data.length === 0 && (
                        <View style={styles.emptyWrap}>
                            <Text style={{ fontSize: 48 }}>🏆</Text>
                            <Text style={styles.emptyText}>No activity this week yet</Text>
                            <Text style={styles.emptyHint}>Help someone to top the leaderboard!</Text>
                        </View>
                    )}

                    <View style={styles.resetNote}>
                        <Ionicons name="refresh-circle-outline" size={16} color={AppColors.textMuted} />
                        <Text style={styles.resetText}>Resets every Monday at 12:00 AM UTC</Text>
                    </View>
                </ScrollView>
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

    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 48, paddingTop: Spacing.xl },

    // Podium
    podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 12, marginBottom: Spacing['2xl'] },
    podiumSlot: { alignItems: 'center', gap: 6 },
    podiumFirst: { marginBottom: 16 },
    podiumEmoji: { fontSize: 24 },
    podiumAvatar: { borderWidth: 3, borderRadius: 50, padding: 2 },
    podiumName: { fontSize: 13, fontWeight: '700', color: AppColors.text, maxWidth: 80, textAlign: 'center' },
    podiumBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    podiumCredits: { fontSize: 12, fontWeight: '800', color: '#FFF' },

    // List
    row: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        backgroundColor: '#FFF', borderRadius: Radii.lg,
        padding: Spacing.lg, marginBottom: 8,
        borderWidth: 1, borderColor: AppColors.border,
    },
    rankCircle: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: AppColors.surface, alignItems: 'center', justifyContent: 'center',
    },
    rankNum: { fontSize: 13, fontWeight: '800', color: AppColors.textMuted },
    name: { fontSize: 14, fontWeight: '700', color: AppColors.text },
    subtitle: { fontSize: 11, color: AppColors.textMuted },
    creditsBadge: { backgroundColor: AppColors.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radii.sm },
    creditsText: { fontSize: 14, fontWeight: '800', color: AppColors.primary },

    emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyText: { fontSize: 16, fontWeight: '700', color: AppColors.text },
    emptyHint: { fontSize: 13, color: AppColors.textMuted },

    resetNote: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: Spacing.xl },
    resetText: { fontSize: 12, color: AppColors.textMuted },
});
