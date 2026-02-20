import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Avatar } from '@/components/ui/Avatar';
import { StarRating } from '@/components/ui/StarRating';
import { MOCK_REVIEWS, MOCK_USERS } from '@/data/mock';

export default function ReviewsScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const router = useRouter();
    const reviews = MOCK_REVIEWS.filter((r) => r.toUserId === userId);
    const user = MOCK_USERS.find((u) => u.id === userId);

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={AppColors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Reviews</Text>
                <View style={{ width: 40 }} />
            </View>

            {user && (
                <View style={styles.summary}>
                    <Text style={styles.summaryRating}>{user.rating.toFixed(1)}</Text>
                    <StarRating rating={user.rating} size={18} showValue={false} />
                    <Text style={styles.summaryCount}>{user.reviewCount} reviews</Text>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {reviews.map((rev, i) => (
                    <Animated.View key={rev.id} entering={FadeInDown.delay(i * 80).duration(400)}>
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Avatar name={rev.fromUserName} size={36} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.reviewerName}>{rev.fromUserName}</Text>
                                    <Text style={styles.reviewDate}>{rev.createdAt}</Text>
                                </View>
                                <StarRating rating={rev.rating} size={12} />
                            </View>
                            <Text style={styles.reviewText}>{rev.comment}</Text>
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: AppColors.surface, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: AppColors.text },
    summary: { alignItems: 'center', gap: 4, marginBottom: Spacing.xl },
    summaryRating: { fontSize: 40, fontWeight: '900', color: AppColors.text },
    summaryCount: { fontSize: 13, color: AppColors.textSecondary },
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40, gap: Spacing.md },
    card: { backgroundColor: AppColors.surfaceLight, borderWidth: 1, borderColor: AppColors.border, borderRadius: Radii.lg, padding: Spacing.lg, gap: Spacing.md },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    reviewerName: { fontSize: 14, fontWeight: '700', color: AppColors.text },
    reviewDate: { fontSize: 11, color: AppColors.textMuted },
    reviewText: { fontSize: 14, color: AppColors.textSecondary, lineHeight: 22 },
});
