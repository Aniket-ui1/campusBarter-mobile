import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppColors, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

export default function DraftsScreen() {
    const router = useRouter();
    const navigation = useNavigation();

    useFocusEffect(
        useCallback(() => {
            navigation.setOptions({
                headerShown: true,
            });
        }, [navigation])
    );

    // Drafts are a client-side feature — we can implement local storage later.
    // For now, this screen shows an empty state with a CTA to create a new post.
    return (
        <View style={styles.container}>
            <View style={styles.center}>
                <EmptyState
                    icon="📝"
                    title="No drafts"
                    description="Your saved drafts will appear here. Start posting to create one!"
                />
                <Button
                    title="Create a Post"
                    onPress={() => router.push('/(tabs)/post')}
                    icon={<Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppColors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.lg },
});
