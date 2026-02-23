import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { MOCK_LISTINGS } from '@/data/mock';

export default function DraftsScreen() {
    const router = useRouter();
    const drafts = MOCK_LISTINGS.filter((l) => l.status === 'draft');

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={AppColors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Drafts</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {drafts.length === 0 ? (
                    <EmptyState icon="📝" title="No drafts" description="Your saved drafts will appear here." />
                ) : (
                    drafts.map((d) => (
                        <View key={d.id} style={styles.card}>
                            <Text style={styles.cardTitle}>{d.title}</Text>
                            <Text style={styles.cardDesc} numberOfLines={2}>{d.description}</Text>
                            <View style={styles.cardActions}>
                                <Badge label={d.category} variant="primary" />
                                <Pressable style={styles.publishBtn}>
                                    <Ionicons name="rocket-outline" size={14} color="#FFFFFF" />
                                    <Text style={styles.publishText}>Publish</Text>
                                </Pressable>
                            </View>
                        </View>
                    ))
                )}
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
    card: { backgroundColor: AppColors.surfaceLight, borderWidth: 1, borderColor: AppColors.border, borderRadius: Radii.lg, padding: Spacing.lg, gap: Spacing.sm },
    cardTitle: { fontSize: 16, fontWeight: '700', color: AppColors.text },
    cardDesc: { fontSize: 13, color: AppColors.textSecondary, lineHeight: 20 },
    cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    publishBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: AppColors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
    publishText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
});
