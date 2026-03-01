import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { EmptyState } from '@/components/ui/EmptyState';

export default function MyRequestsScreen() {
    const router = useRouter();

    // Requests will be a Firestore collection in a future iteration.
    // For now, show an informational empty state.
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

            <View style={styles.center}>
                <EmptyState
                    icon="🤝"
                    title="No requests yet"
                    description="When you request a skill from someone, it will appear here."
                />
            </View>
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
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
});
