import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { EmptyState } from '@/components/ui/EmptyState';

export default function MyRequestsScreen() {
    const router = useRouter();

    // Requests will be stored in Azure SQL in a future iteration.
    // For now, show an informational empty state.
    return (
        <View style={styles.container}>
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
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
});
