import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { MOCK_LISTINGS } from '@/data/mock';

export default function MyListingsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const listings = MOCK_LISTINGS.filter((l) => l.userId === user?.id);

    const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'subtle'> = {
        active: 'success', draft: 'warning', completed: 'subtle',
    };

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={AppColors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>My Listings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {listings.map((l, i) => (
                    <Animated.View key={l.id} entering={FadeInDown.delay(i * 60).duration(400)}>
                        <Pressable style={styles.card} onPress={() => router.push({ pathname: '/skill/[id]', params: { id: l.id } })}>
                            <View style={styles.cardTop}>
                                <Text style={styles.cardTitle}>{l.title}</Text>
                                <Badge label={l.status} variant={STATUS_VARIANT[l.status]} />
                            </View>
                            <Text style={styles.cardDesc} numberOfLines={2}>{l.description}</Text>
                            <View style={styles.cardMeta}>
                                <Badge label={l.category} variant="primary" />
                                <Text style={styles.cardDate}>{l.createdAt}</Text>
                            </View>
                        </Pressable>
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
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40, gap: Spacing.md },
    card: {
        backgroundColor: AppColors.surfaceLight, borderWidth: 1, borderColor: AppColors.border,
        borderRadius: Radii.lg, padding: Spacing.lg, gap: Spacing.sm,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '700', color: AppColors.text, flex: 1, marginRight: 8 },
    cardDesc: { fontSize: 13, color: AppColors.textSecondary, lineHeight: 20 },
    cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardDate: { fontSize: 11, color: AppColors.textMuted },
});
