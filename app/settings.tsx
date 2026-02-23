import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

type SettingItem = { icon: string; label: string; type: 'toggle' | 'nav'; key: string };

const SETTINGS: SettingItem[] = [
    { icon: 'notifications-outline', label: 'Push Notifications', type: 'toggle', key: 'push' },
    { icon: 'chatbubble-outline', label: 'Message Notifications', type: 'toggle', key: 'chat' },
    { icon: 'moon-outline', label: 'Dark Mode', type: 'toggle', key: 'dark' },
    { icon: 'shield-checkmark-outline', label: 'Privacy Policy', type: 'nav', key: 'privacy' },
    { icon: 'document-text-outline', label: 'Terms of Service', type: 'nav', key: 'terms' },
    { icon: 'information-circle-outline', label: 'About', type: 'nav', key: 'about' },
];

export default function SettingsScreen() {
    const router = useRouter();
    const { signOut } = useAuth();
    const [toggles, setToggles] = useState<Record<string, boolean>>({ push: true, chat: true, dark: true });

    const handleNav = (key: string) => {
        router.push(`/${key}` as any);
    };

    const handleDeleteAccount = () => {
        Alert.alert('Delete Account', 'This will permanently delete your account and all your data. This action cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: signOut },
        ]);
    };

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={AppColors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    {SETTINGS.map((s, i) => (
                        <Pressable key={s.key} style={styles.row}
                            onPress={() => s.type === 'nav' && handleNav(s.key)}>
                            <Ionicons name={s.icon as any} size={20} color={AppColors.textSecondary} />
                            <Text style={styles.rowLabel}>{s.label}</Text>
                            <View style={{ flex: 1 }} />
                            {s.type === 'toggle' ? (
                                <Switch
                                    value={toggles[s.key]}
                                    onValueChange={(v) => setToggles({ ...toggles, [s.key]: v })}
                                    trackColor={{ true: AppColors.primary, false: AppColors.border }}
                                    thumbColor="#FFFFFF"
                                />
                            ) : (
                                <Ionicons name="chevron-forward" size={16} color={AppColors.textMuted} />
                            )}
                        </Pressable>
                    ))}
                </View>

                <Pressable style={styles.dangerBtn} onPress={handleDeleteAccount}>
                    <Ionicons name="trash-outline" size={18} color={AppColors.error} />
                    <Text style={styles.dangerText}>Delete Account</Text>
                </Pressable>
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
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
    section: { backgroundColor: AppColors.surfaceLight, borderWidth: 1, borderColor: AppColors.border, borderRadius: Radii.lg, overflow: 'hidden', marginBottom: Spacing.xl },
    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: AppColors.border },
    rowLabel: { fontSize: 15, color: AppColors.text, fontWeight: '500' },
    dangerBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: Spacing.lg, borderRadius: Radii.md,
        borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)',
    },
    dangerText: { color: AppColors.error, fontSize: 15, fontWeight: '600' },
});
