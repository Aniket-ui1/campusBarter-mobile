import { useToast } from '@/components/ui/Toast';
import { Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { triggerHaptic, triggerSuccessHaptic } from '@/hooks/useAnimations';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function SettingsScreen() {
    const router = useRouter();
    const { signOut } = useAuth();
    const { mode, setMode, colors } = useTheme();
    const { showToast } = useToast();

    const toggleDark = (v: boolean) => {
        if (v) {
            setMode('dark');
            triggerSuccessHaptic();
            showToast('Dark mode enabled 🌙', 'success');
        } else if (mode === 'dark') {
            setMode('light');
            triggerHaptic('light');
            showToast('Light mode enabled ☀️', 'info');
        }
    };

    const toggleSait = (v: boolean) => {
        if (v) {
            setMode('sait');
            triggerSuccessHaptic();
            showToast('SAIT Mode activated! 🔴🔵', 'success');
        } else if (mode === 'sait') {
            setMode('light');
            triggerHaptic('light');
            showToast('Default theme restored 🌿', 'info');
        }
    };

    const handleNav = (key: string) => {
        router.push(`/${key}` as any);
    };

    const handleDeleteAccount = () => {
        Alert.alert('Delete Account', 'This will permanently delete your account and all your data. This action cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: signOut },
        ]);
    };

    type SettingItem = { icon: string; label: string; type: 'toggle' | 'nav'; key: string; description?: string };

    const SETTINGS: SettingItem[] = [
        { icon: 'notifications-outline', label: 'Push Notifications', type: 'toggle', key: 'push' },
        { icon: 'chatbubble-outline', label: 'Message Notifications', type: 'toggle', key: 'chat' },
    ];

    const APPEARANCE: { icon: string; label: string; key: string; description: string; value: boolean; onToggle: (v: boolean) => void }[] = [
        { icon: 'moon-outline', label: 'Dark Mode', key: 'dark', description: 'Easy on the eyes at night', value: mode === 'dark', onToggle: toggleDark },
        { icon: 'school-outline', label: 'SAIT Mode', key: 'sait', description: 'Red & blue SAIT theme', value: mode === 'sait', onToggle: toggleSait },
    ];

    const NAV_ITEMS: { icon: string; label: string; key: string }[] = [
        { icon: 'shield-checkmark-outline', label: 'Privacy Policy', key: 'privacy' },
        { icon: 'document-text-outline', label: 'Terms of Service', key: 'terms' },
        { icon: 'information-circle-outline', label: 'About', key: 'about' },
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.statusSpacer} />
            <View style={styles.header}>
                <Pressable style={[styles.backBtn, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Appearance Section */}
                <Animated.View entering={FadeInDown.delay(80).duration(400)}>
                    <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>APPEARANCE</Text>
                    <View style={[styles.section, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                        {APPEARANCE.map((item, i) => (
                            <View key={item.key} style={[styles.row, { borderBottomColor: colors.border }, i === APPEARANCE.length - 1 && { borderBottomWidth: 0 }]}>
                                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '12' }]}>
                                    <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.rowLabel, { color: colors.text }]}>{item.label}</Text>
                                    <Text style={[styles.rowDesc, { color: colors.textMuted }]}>{item.description}</Text>
                                </View>
                                <Switch
                                    value={item.value}
                                    onValueChange={item.onToggle}
                                    trackColor={{ true: colors.primary, false: colors.border }}
                                    thumbColor="#FFFFFF"
                                />
                            </View>
                        ))}
                    </View>
                </Animated.View>

                {/* Notifications Section */}
                <Animated.View entering={FadeInDown.delay(160).duration(400)}>
                    <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>NOTIFICATIONS</Text>
                    <View style={[styles.section, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                        {SETTINGS.map((s, i) => (
                            <View key={s.key} style={[styles.row, { borderBottomColor: colors.border }, i === SETTINGS.length - 1 && { borderBottomWidth: 0 }]}>
                                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '12' }]}>
                                    <Ionicons name={s.icon as any} size={18} color={colors.primary} />
                                </View>
                                <Text style={[styles.rowLabel, { color: colors.text }]}>{s.label}</Text>
                                <View style={{ flex: 1 }} />
                                <Switch
                                    value={true}
                                    onValueChange={() => {}}
                                    trackColor={{ true: colors.primary, false: colors.border }}
                                    thumbColor="#FFFFFF"
                                />
                            </View>
                        ))}
                    </View>
                </Animated.View>

                {/* About Section */}
                <Animated.View entering={FadeInDown.delay(240).duration(400)}>
                    <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ABOUT</Text>
                    <View style={[styles.section, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                        {NAV_ITEMS.map((s, i) => (
                            <Pressable key={s.key}
                                style={[styles.row, { borderBottomColor: colors.border }, i === NAV_ITEMS.length - 1 && { borderBottomWidth: 0 }]}
                                onPress={() => handleNav(s.key)}>
                                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '12' }]}>
                                    <Ionicons name={s.icon as any} size={18} color={colors.primary} />
                                </View>
                                <Text style={[styles.rowLabel, { color: colors.text }]}>{s.label}</Text>
                                <View style={{ flex: 1 }} />
                                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                            </Pressable>
                        ))}
                    </View>
                </Animated.View>

                {/* Current Theme Indicator */}
                <Animated.View entering={FadeInDown.delay(320).duration(400)}>
                    <View style={[styles.themeIndicator, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '25' }]}>
                        <Text style={{ fontSize: 20 }}>
                            {mode === 'dark' ? '🌙' : mode === 'sait' ? '🏫' : '🌿'}
                        </Text>
                        <View>
                            <Text style={[styles.themeLabel, { color: colors.primary }]}>
                                {mode === 'dark' ? 'Dark Mode' : mode === 'sait' ? 'SAIT Mode' : 'Forest Green'}
                            </Text>
                            <Text style={[styles.themeDesc, { color: colors.textMuted }]}>Current theme</Text>
                        </View>
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(400).duration(400)}>
                    <Pressable style={[styles.dangerBtn, { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)' }]} onPress={handleDeleteAccount}>
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                        <Text style={[styles.dangerText, { color: colors.error }]}>Delete Account</Text>
                    </Pressable>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
    backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
    sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: Spacing.sm, marginTop: Spacing.lg, marginLeft: 4 },
    section: { borderWidth: 1, borderRadius: Radii.lg, overflow: 'hidden', marginBottom: Spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: 14, borderBottomWidth: 1 },
    iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    rowLabel: { fontSize: 15, fontWeight: '500' },
    rowDesc: { fontSize: 11, marginTop: 1 },
    themeIndicator: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: Spacing.lg, borderRadius: Radii.md, borderWidth: 1,
        marginTop: Spacing.lg, marginBottom: Spacing.xl,
    },
    themeLabel: { fontSize: 14, fontWeight: '700' },
    themeDesc: { fontSize: 11, marginTop: 1 },
    dangerBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: Spacing.lg, borderRadius: Radii.md, borderWidth: 1,
    },
    dangerText: { fontSize: 15, fontWeight: '600' },
});
