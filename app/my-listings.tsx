import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';

export default function MyListingsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { listings, closeListing } = useData();

    // Which listing id is awaiting delete confirmation
    const [confirmId, setConfirmId] = useState<string | null>(null);

    const myListings = listings.filter((l) => l.userId === user?.id);

    const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'subtle'> = {
        OPEN: 'success', CLOSED: 'subtle',
    };

    const handleDelete = async (id: string) => {
        setConfirmId(null);
        try {
            await closeListing(id);
        } catch {
            Alert.alert('Error', 'Failed to delete listing.');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={AppColors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>My Listings</Text>
                <Pressable style={styles.addBtn} onPress={() => router.push('/(tabs)/post')}>
                    <Ionicons name="add" size={22} color={AppColors.primary} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {myListings.length === 0 ? (
                    <EmptyState
                        icon="📝"
                        title="No listings yet"
                        description="Post a skill to get started!"
                    />
                ) : (
                    myListings.map((l, i) => (
                        <Animated.View key={l.id} entering={FadeInDown.delay(i * 60).duration(400)}>
                            <View style={styles.card}>
                                <View style={styles.cardTop}>
                                    <Text style={styles.cardTitle} numberOfLines={1}>{l.title}</Text>
                                    <Badge label={l.status} variant={STATUS_VARIANT[l.status] ?? 'subtle'} />
                                </View>
                                <Text style={styles.cardDesc} numberOfLines={2}>{l.description}</Text>
                                <View style={styles.cardMeta}>
                                    <Text style={styles.cardDate}>
                                        {new Date(l.createdAt).toLocaleDateString()}
                                    </Text>
                                    <Text style={styles.cardCredits}>{l.credits} credit{l.credits !== 1 ? 's' : ''}</Text>
                                </View>

                                {/* Actions — only for OPEN listings */}
                                {l.status === 'OPEN' && <View style={styles.actionsRow}>
                                    {confirmId === l.id ? (
                                        // Inline confirmation
                                        <View style={styles.confirmRow}>
                                            <Ionicons name="warning-outline" size={15} color={AppColors.error} />
                                            <Text style={styles.confirmText}>This cannot be undone.</Text>
                                            <View style={styles.confirmBtns}>
                                                <Pressable style={styles.cancelConfirmBtn} onPress={() => setConfirmId(null)}>
                                                    <Text style={styles.cancelConfirmText}>Cancel</Text>
                                                </Pressable>
                                                <Pressable style={styles.confirmDeleteBtn} onPress={() => handleDelete(l.id)}>
                                                    <Ionicons name="trash-outline" size={13} color="#FFF" />
                                                    <Text style={styles.confirmDeleteText}>Yes, Delete</Text>
                                                </Pressable>
                                            </View>
                                        </View>
                                    ) : (
                                        <Pressable
                                            style={[styles.actionBtn, styles.deleteBtn]}
                                            onPress={() => setConfirmId(l.id)}
                                        >
                                            <Ionicons name="trash-outline" size={16} color={AppColors.error} />
                                            <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                                        </Pressable>
                                    )}
                                </View>}
                            </View>
                        </Animated.View>
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
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: AppColors.surface, alignItems: 'center', justifyContent: 'center',
    },
    addBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: AppColors.surface, borderWidth: 1, borderColor: AppColors.border,
        alignItems: 'center', justifyContent: 'center',
    },
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
    cardCredits: { fontSize: 12, color: AppColors.primary, fontWeight: '600' },
    actionsRow: {
        borderTopWidth: 1, borderTopColor: AppColors.border,
        paddingTop: Spacing.sm, marginTop: Spacing.xs,
    },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
        backgroundColor: AppColors.surface, borderWidth: 1, borderColor: AppColors.border,
        alignSelf: 'flex-start',
    },
    actionText: { fontSize: 12, fontWeight: '600', color: AppColors.textSecondary },
    deleteBtn: { borderColor: AppColors.error + '30', backgroundColor: AppColors.error + '10' },
    deleteText: { color: AppColors.error },

    // Inline confirmation
    confirmRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap',
        backgroundColor: AppColors.error + '08',
        borderRadius: Radii.sm, padding: Spacing.sm,
        borderWidth: 1, borderColor: AppColors.error + '25',
    },
    confirmText: { fontSize: 12, color: AppColors.error, fontWeight: '600', flex: 1 },
    confirmBtns: { flexDirection: 'row', gap: 6 },
    cancelConfirmBtn: {
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
        backgroundColor: AppColors.surface, borderWidth: 1, borderColor: AppColors.border,
    },
    cancelConfirmText: { fontSize: 12, fontWeight: '600', color: AppColors.textSecondary },
    confirmDeleteBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
        backgroundColor: AppColors.error,
    },
    confirmDeleteText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
});
