import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AppColors, Spacing } from '@/constants/theme';
import { getUserById } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function RateScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const router = useRouter();
    const [userName, setUserName] = useState('');
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    useEffect(() => {
        if (!userId) return;
        getUserById(userId).then((p) => {
            if (p) setUserName(p.displayName || 'User');
        });
    }, [userId]);

    const handleSubmit = () => {
        if (rating === 0) { Alert.alert('Select a rating'); return; }
        Alert.alert('Review Submitted!', `Thank you for rating ${userName}.`);
        router.back();
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.label}>How was your experience with {userName || 'this user'}?</Text>
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
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40, gap: Spacing.xl },
    label: { fontSize: 16, color: AppColors.text, fontWeight: '600', textAlign: 'center' },
    stars: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
});
