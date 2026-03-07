import { useToast } from '@/components/ui/Toast';
import type { ThemeFamily } from '@/constants/theme';
import { Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { triggerHaptic, triggerSuccessHaptic } from '@/hooks/useAnimations';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const THEME_OPTIONS: { key: ThemeFamily; label: string; emoji: string; description: string }[] = [
    { key: 'default', label: 'Default', emoji: '🌿', description: 'Clean green tones' },
    { key: 'sait', label: 'SAIT', emoji: '🏫', description: 'Red & blue SAIT colors' },
];

export default function SettingsScreen() {
    const router = useRouter();
    const { signOut } = useAuth();
    const { themeFamily, setThemeFamily, darkMode, setDarkMode, colors, mobileView, setMobileView } = useTheme();
    const { showToast } = useToast();
    const [themePickerOpen, setThemePickerOpen] = useState(false);

    const toggleDark = (v: boolean) => {
        setDarkMode(v);
        if (v) {
            triggerSuccessHaptic();
            showToast('Dark mode enabled 🌙', 'success');
        } else {
            triggerHaptic('light');
            showToast('Light mode enabled ☀️', 'info');
        }
    };

    const selectTheme = (family: ThemeFamily) => {
        setThemeFamily(family);
        setThemePickerOpen(false);
        triggerSuccessHaptic();
        const opt = THEME_OPTIONS.find((t) => t.key === family);
        showToast(`${opt?.label} theme activated! ${opt?.emoji}`, 'success');
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

    const currentTheme = THEME_OPTIONS.find((t) => t.key === themeFamily) ?? THEME_OPTIONS[0];

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
                        {/* Theme Selector */}
                        <Pressable
                            style={[styles.row, { borderBottomColor: colors.border }]}
                            onPress={() => setThemePickerOpen(true)}
                        >
                            <View style={[styles.iconWrap, { backgroundColor: colors.primary + '12' }]}>
                                <Ionicons name="color-palette-outline" size={18} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.rowLabel, { color: colors.text }]}>Theme</Text>
                                <Text style={[styles.rowDesc, { color: colors.textMuted }]}>{currentTheme.emoji} {currentTheme.label}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                        </Pressable>
                        {/* Dark Mode Toggle */}
                        <View style={[styles.row, { borderBottomColor: colors.border }, Platform.OS !== 'web' && { borderBottomWidth: 0 }]}>
                            <View style={[styles.iconWrap, { backgroundColor: colors.primary + '12' }]}>
                                <Ionicons name="moon-outline" size={18} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.rowLabel, { color: colors.text }]}>Dark Mode</Text>
                                <Text style={[styles.rowDesc, { color: colors.textMuted }]}>Easy on the eyes at night</Text>
                            </View>
                            <Switch
                                value={darkMode}
                                onValueChange={toggleDark}
                                trackColor={{ true: colors.primary, false: colors.border }}
                                thumbColor="#FFFFFF"
                            />
                        </View>
                        {/* Mobile View (web only) */}
                        {Platform.OS === 'web' && (
                            <View style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: 0 }]}>
                                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '12' }]}>
                                    <Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.rowLabel, { color: colors.text }]}>Mobile View</Text>
                                    <Text style={[styles.rowDesc, { color: colors.textMuted }]}>Simulate mobile layout on web</Text>
                                </View>
                                <Switch
                                    value={mobileView}
                                    onValueChange={setMobileView}
                                    trackColor={{ true: colors.primary, false: colors.border }}
                                    thumbColor="#FFFFFF"
                                />
                            </View>
                        )}
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
                            {currentTheme.emoji}{darkMode ? '🌙' : ''}
                        </Text>
                        <View>
                            <Text style={[styles.themeLabel, { color: colors.primary }]}>
                                {currentTheme.label}{darkMode ? ' (Dark)' : ''}
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

            {/* Theme Picker Modal */}
            <Modal visible={themePickerOpen} transparent animationType="fade" onRequestClose={() => setThemePickerOpen(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setThemePickerOpen(false)}>
                    <Pressable style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => {}}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Theme</Text>
                        {THEME_OPTIONS.map((opt) => {
                            const isActive = themeFamily === opt.key;
                            return (
                                <Pressable
                                    key={opt.key}
                                    style={[
                                        styles.themeOption,
                                        { borderColor: isActive ? colors.primary : colors.border, backgroundColor: isActive ? colors.primary + '12' : colors.surfaceLight },
                                    ]}
                                    onPress={() => selectTheme(opt.key)}
                                >
                                    <Text style={{ fontSize: 24 }}>{opt.emoji}</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.themeOptionLabel, { color: colors.text }]}>{opt.label}</Text>
                                        <Text style={[styles.themeOptionDesc, { color: colors.textMuted }]}>{opt.description}</Text>
                                    </View>
                                    {isActive && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                                </Pressable>
                            );
                        })}
                    </Pressable>
                </Pressable>
            </Modal>
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
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', alignItems: 'center', padding: Spacing.xl,
    },
    modalContent: {
        width: '100%', maxWidth: 340, borderRadius: Radii.xl, borderWidth: 1,
        padding: Spacing.xl,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: Spacing.lg, textAlign: 'center' },
    themeOption: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        padding: Spacing.lg, borderRadius: Radii.md, borderWidth: 1.5,
        marginBottom: Spacing.sm,
    },
    themeOptionLabel: { fontSize: 15, fontWeight: '600' },
    themeOptionDesc: { fontSize: 12, marginTop: 2 },
});
