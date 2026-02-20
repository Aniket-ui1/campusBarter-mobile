import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { MOCK_REQUESTS } from '@/data/mock';

const TABS = ['All', 'Pending', 'Accepted', 'Completed'] as const;
const STATUS_VARIANT: Record<string, 'warning' | 'success' | 'subtle' | 'error'> = {
    pending: 'warning', accepted: 'success', completed: 'subtle', declined: 'error',
};

export default function MyRequestsScreen() {
    const router = useRouter();
    const [tab, setTab] = useState<string>('All');
    const filtered = tab === 'All' ? MOCK_REQUESTS : MOCK_REQUESTS.filter((r) => r.status === tab.toLowerCase());

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={AppColors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>My Requests</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.tabs}>
                {TABS.map((t) => (
                    <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
                        <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
                    </Pressable>
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {filtered.map((req, i) => (
                    <Animated.View key={req.id} entering={FadeInDown.delay(i * 60).duration(400)}>
                        <View style={styles.card}>
                            <View style={styles.cardTop}>
                                <Text style={styles.cardTitle}>{req.listingTitle}</Text>
                                <Badge label={req.status} variant={STATUS_VARIANT[req.status]} />
                            </View>
                            <View style={styles.cardUser}>
                                <Avatar name={req.fromUserName} size={28} />
                                <Text style={styles.cardUserName}>{req.fromUserName}</Text>
                            </View>
                            <Text style={styles.cardDate}>{new Date(req.createdAt).toLocaleDateString()}</Text>
                        </View>
                    </Animated.View>
                ))}
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
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: AppColors.surface, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: AppColors.text },
    tabs: { flexDirection: 'row', paddingHorizontal: Spacing.xl, gap: 8, marginBottom: Spacing.lg },
    tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: AppColors.surface, borderWidth: 1, borderColor: AppColors.border },
    tabActive: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
    tabText: { fontSize: 13, color: AppColors.textSecondary, fontWeight: '500' },
    tabTextActive: { color: '#FFFFFF', fontWeight: '700' },
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40, gap: Spacing.md },
    card: { backgroundColor: AppColors.surfaceLight, borderWidth: 1, borderColor: AppColors.border, borderRadius: Radii.lg, padding: Spacing.lg, gap: Spacing.sm },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 15, fontWeight: '700', color: AppColors.text, flex: 1, marginRight: 8 },
    cardUser: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardUserName: { fontSize: 13, color: AppColors.textSecondary },
    cardDate: { fontSize: 11, color: AppColors.textMuted },
});
