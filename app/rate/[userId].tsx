import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppColors, Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MOCK_USERS } from '@/data/mock';

export default function RateScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const router = useRouter();
    const user = MOCK_USERS.find((u) => u.id === userId);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    const handleSubmit = () => {
        if (rating === 0) { Alert.alert('Select a rating'); return; }
        Alert.alert('Review Submitted!', `Thank you for rating ${user?.displayName}.`);
        router.back();
    };

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="close" size={22} color={AppColors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Rate & Review</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.label}>How was your experience with {user?.displayName}?</Text>
                <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map((s) => (
                        <Pressable key={s} onPress={() => setRating(s)}>
                            <Ionicons name={s <= rating ? 'star' : 'star-outline'} size={40} color="#FACC15" />
                        </Pressable>
                    ))}
                </View>
                <Input label="Comment (optional)" placeholder="Share your experience..." value={comment}
                    onChangeText={setComment} multiline numberOfLines={4}
                    style={{ minHeight: 100, textAlignVertical: 'top' }} />
                <Button title="Submit Review" onPress={handleSubmit} fullWidth size="lg" />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppColors.background },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: AppColors.surface, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: AppColors.text },
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40, gap: Spacing.xl },
    label: { fontSize: 16, color: AppColors.text, fontWeight: '600', textAlign: 'center' },
    stars: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
});
