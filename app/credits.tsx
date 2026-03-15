// app/credits.tsx — Time Credits Screen (Task 7)

import { AppColors, Radii, Shadows, Spacing } from '@/constants/theme';
import { getCreditsBalance } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface CreditTransaction {
    id: string;
    type: 'EARNED' | 'SPENT';
    amount: number;
    reason: string;
    createdAt: string;
}

export default function CreditsScreen() {
    const router = useRouter();
    const [balance, setBalance] = useState<number | null>(null);
    const [history, setHistory] = useState<CreditTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [bal, hist] = await Promise.all([
                    getCreditsBalance(),
                    fetch_history(),
                ]);
                setBalance(bal);
                setHistory(hist);
            } catch (e) {
                console.warn('[Credits] Load error:', e);
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
                    <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                </Pressable>
                <Text style={styles.headerTitle}>Time Credits</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={AppColors.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                    {/* Balance Card */}
                    <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.balanceCard}>
                        <Text style={styles.balanceLabel}>Your Balance</Text>
                        <View style={styles.balanceRow}>
                            <Text style={styles.balanceNum}>{balance ?? 0}</Text>
                            <Text style={styles.balanceCoin}>⏱️</Text>
                        </View>
                        <Text style={styles.balanceHint}>Credits are earned by helping others</Text>
                    </Animated.View>

                    {/* How it works */}
                    <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.howCard}>
                        <Text style={styles.sectionTitle}>How it works</Text>
                        {[
                            { icon: '🎓', text: 'Teach a skill → Earn 1–5 credits' },
                            { icon: '📚', text: 'Learn a skill → Spend 1–5 credits' },
                            { icon: '⭐', text: 'Get a 5-star review → Bonus credit' },
                            { icon: '🆕', text: 'Welcome bonus → 3 free credits' },
                        ].map((item, i) => (
                            <View key={i} style={styles.howRow}>
                                <Text style={styles.howEmoji}>{item.icon}</Text>
                                <Text style={styles.howText}>{item.text}</Text>
                            </View>
                        ))}
                    </Animated.View>

                    {/* Transaction history */}
                    <Animated.View entering={FadeInDown.delay(220).duration(400)}>
                        <Text style={styles.sectionTitle}>Transaction History</Text>
                        {history.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyEmoji}>📋</Text>
                                <Text style={styles.emptyText}>No transactions yet</Text>
                                <Text style={styles.emptyHint}>Complete your first exchange to see history here</Text>
                            </View>
                        ) : (
                            history.map((tx, i) => (
                                <Animated.View key={tx.id} entering={FadeInDown.delay(280 + i * 50).duration(400)}>
                                    <View style={styles.txRow}>
                                        <View style={[styles.txIcon, { backgroundColor: tx.type === 'EARNED' ? AppColors.success + '15' : AppColors.error + '15' }]}>
                                            <Ionicons
                                                name={tx.type === 'EARNED' ? 'arrow-down-circle' : 'arrow-up-circle'}
                                                size={20}
                                                color={tx.type === 'EARNED' ? AppColors.success : AppColors.error}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.txReason}>{tx.reason}</Text>
                                            <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
                                        </View>
                                        <Text style={[styles.txAmount, { color: tx.type === 'EARNED' ? AppColors.success : AppColors.error }]}>
                                            {tx.type === 'EARNED' ? '+' : '-'}{tx.amount}⏱️
                                        </Text>
                                    </View>
                                </Animated.View>
                            ))
                        )}
                    </Animated.View>
                </ScrollView>
            )}
        </View>
    );
}

// Internal helper — not exported from api.ts to keep it clean
async function fetch_history(): Promise<CreditTransaction[]> {
    try {
        const { resolveAuthToken, getApiBase } = await import('@/lib/api');
        const token = resolveAuthToken();
        const res = await fetch(`${getApiBase()}/api/credits/history`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return [];
        return res.json();
    } catch { return []; }
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppColors.background },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36, backgroundColor: AppColors.primaryDark },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: {
        backgroundColor: AppColors.primaryDark,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 48, paddingTop: Spacing.xl, gap: Spacing.xl },

    balanceCard: {
        backgroundColor: AppColors.primaryDark, borderRadius: Radii.xl,
        padding: Spacing['2xl'], alignItems: 'center', ...(Shadows.lg as any),
    },
    balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', marginBottom: 8 },
    balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    balanceNum: { fontSize: 64, fontWeight: '900', color: '#FFFFFF', letterSpacing: -2 },
    balanceCoin: { fontSize: 36 },
    balanceHint: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 8 },

    sectionTitle: { fontSize: 18, fontWeight: '800', color: AppColors.text, marginBottom: Spacing.md, letterSpacing: -0.3 },

    howCard: {
        backgroundColor: '#FFFFFF', borderRadius: Radii.lg,
        padding: Spacing.lg, borderWidth: 1, borderColor: AppColors.border, gap: 12,
    },
    howRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    howEmoji: { fontSize: 18, width: 28, textAlign: 'center' },
    howText: { fontSize: 14, color: AppColors.textSecondary, flex: 1 },

    emptyCard: {
        backgroundColor: '#FFFFFF', borderRadius: Radii.lg,
        padding: Spacing['2xl'], alignItems: 'center', gap: 8,
        borderWidth: 1, borderColor: AppColors.border,
    },
    emptyEmoji: { fontSize: 40 },
    emptyText: { fontSize: 16, fontWeight: '700', color: AppColors.text },
    emptyHint: { fontSize: 13, color: AppColors.textMuted, textAlign: 'center' },

    txRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        backgroundColor: '#FFFFFF', borderRadius: Radii.md,
        padding: Spacing.lg, borderWidth: 1, borderColor: AppColors.border, marginBottom: 8,
    },
    txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    txReason: { fontSize: 14, fontWeight: '600', color: AppColors.text },
    txDate: { fontSize: 12, color: AppColors.textMuted, marginTop: 2 },
    txAmount: { fontSize: 16, fontWeight: '800' },
});
