import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useThemeColors } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function MyListingsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { listings, deleteListing, closeListing } = useData();
    const colors = useThemeColors();

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
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.statusSpacer} />
            <View style={styles.header}>
                <Pressable style={[styles.backBtn, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>My Listings</Text>
                <Pressable style={[styles.addBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/(tabs)/post')}>
                    <Ionicons name="add" size={22} color={colors.primary} />
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
                            <View style={[styles.card, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                                <View style={styles.cardTop}>
                                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{l.title}</Text>
                                    <Badge label={l.status} variant={STATUS_VARIANT[l.status] ?? 'subtle'} />
                                </View>
                                <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>{l.description}</Text>
                                <View style={styles.cardMeta}>
                                    <Text style={[styles.cardDate, { color: colors.textMuted }]}>
                                        {new Date(l.createdAt).toLocaleDateString()}
                                    </Text>
                                    <Text style={[styles.cardCredits, { color: colors.primary }]}>{l.credits} credit{l.credits !== 1 ? 's' : ''}</Text>
                                </View>

                                {/* Actions */}
                                <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
                                    {l.status === 'OPEN' && (
                                        <Pressable style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => handleClose(l.id, l.title)}>
                                            <Ionicons name="checkmark-circle-outline" size={16} color={colors.textSecondary} />
                                            <Text style={[styles.actionText, { color: colors.textSecondary }]}>Close</Text>
                                        </Pressable>
                                    )}
                                    <Pressable style={[styles.actionBtn, styles.deleteBtn, { borderColor: colors.error + '30', backgroundColor: colors.error + '10' }]} onPress={() => handleDelete(l.id, l.title)}>
                                        <Ionicons name="trash-outline" size={16} color={colors.error} />
                                        <Text style={[styles.actionText, styles.deleteText, { color: colors.error }]}>Delete</Text>
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
    container: { flex: 1 },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },
    addBtn: {
        width: 40, height: 40, borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40, gap: Spacing.md },
    card: {
        borderWidth: 1,
        borderRadius: Radii.lg, padding: Spacing.lg, gap: Spacing.sm,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
    cardDesc: { fontSize: 13, lineHeight: 20 },
    cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardDate: { fontSize: 11 },
    cardCredits: { fontSize: 12, fontWeight: '600' },
    actionsRow: {
        flexDirection: 'row', gap: Spacing.md,
        borderTopWidth: 1,
        paddingTop: Spacing.sm, marginTop: Spacing.xs,
    },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
        borderWidth: 1,
    },
    actionText: { fontSize: 12, fontWeight: '600' },
    deleteBtn: {},
    deleteText: {},
});
