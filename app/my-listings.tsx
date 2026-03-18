import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import React, { useCallback } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useFocusEffect } from '@react-navigation/native';

export default function MyListingsScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const { user } = useAuth();
    const { listings, deleteListing, closeListing } = useData();

    useFocusEffect(
        useCallback(() => {
            navigation.setOptions({
                headerShown: true,
            });
        }, [navigation])
    );

    // Filter to only this user's listings
    const myListings = listings.filter((l) => l.userId === user?.id);

    const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'subtle'> = {
        OPEN: 'success', CLOSED: 'subtle',
    };

    const handleDelete = (id: string, title: string) => {
        Alert.alert(
            'Delete Listing',
            `Are you sure you want to delete "${title}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteListing(id);
                        } catch {
                            Alert.alert('Error', 'Failed to delete listing.');
                        }
                    },
                },
            ]
        );
    };

    const handleClose = (id: string, title: string) => {
        Alert.alert(
            'Close Listing',
            `Mark "${title}" as closed? It will no longer be visible to others.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Close', style: 'default',
                    onPress: async () => {
                        try {
                            await closeListing(id);
                        } catch {
                            Alert.alert('Error', 'Failed to close listing.');
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
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

                                {/* Actions */}
                                <View style={styles.actionsRow}>
                                    {l.status === 'OPEN' && (
                                        <Pressable style={styles.actionBtn} onPress={() => handleClose(l.id, l.title)}>
                                            <Ionicons name="checkmark-circle-outline" size={16} color={AppColors.textSecondary} />
                                            <Text style={styles.actionText}>Close</Text>
                                        </Pressable>
                                    )}
                                    <Pressable style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(l.id, l.title)}>
                                        <Ionicons name="trash-outline" size={16} color={AppColors.error} />
                                        <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                                    </Pressable>
                                </View>
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
        flexDirection: 'row', gap: Spacing.md,
        borderTopWidth: 1, borderTopColor: AppColors.border,
        paddingTop: Spacing.sm, marginTop: Spacing.xs,
    },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
        backgroundColor: AppColors.surface, borderWidth: 1, borderColor: AppColors.border,
    },
    actionText: { fontSize: 12, fontWeight: '600', color: AppColors.textSecondary },
    deleteBtn: { borderColor: AppColors.error + '30', backgroundColor: AppColors.error + '10' },
    deleteText: { color: AppColors.error },
});
