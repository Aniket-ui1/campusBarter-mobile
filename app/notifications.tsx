import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { MOCK_NOTIFICATIONS } from '@/data/mock';

const ICON_MAP: Record<string, { name: string; color: string }> = {
    request: { name: 'hand-left-outline', color: AppColors.primary },
    accepted: { name: 'checkmark-circle-outline', color: AppColors.success },
    message: { name: 'chatbubble-outline', color: AppColors.secondary },
    review: { name: 'star-outline', color: '#FACC15' },
};

export default function NotificationsScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={AppColors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {MOCK_NOTIFICATIONS.map((n, i) => {
                    const icon = ICON_MAP[n.type];
                    return (
                        <Animated.View key={n.id} entering={FadeInDown.delay(i * 60).duration(400)}>
                            <View style={[styles.card, !n.read && styles.cardUnread]}>
                                <View style={[styles.iconCircle, { backgroundColor: icon.color + '20' }]}>
                                    <Ionicons name={icon.name as any} size={20} color={icon.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.title}>{n.title}</Text>
                                    <Text style={styles.body}>{n.body}</Text>
                                    <Text style={styles.time}>{new Date(n.createdAt).toLocaleString()}</Text>
                                </View>
                                {!n.read && <View style={styles.unreadDot} />}
                            </View>
                        </Animated.View>
                    );
                })}
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
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40, gap: Spacing.sm },
    card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: Radii.lg, backgroundColor: AppColors.surfaceLight, borderWidth: 1, borderColor: AppColors.border },
    cardUnread: { borderColor: AppColors.primary + '40' },
    iconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 14, fontWeight: '700', color: AppColors.text, marginBottom: 2 },
    body: { fontSize: 13, color: AppColors.textSecondary, lineHeight: 18 },
    time: { fontSize: 11, color: AppColors.textMuted, marginTop: 4 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: AppColors.primary },
});
