import { Radii, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function AboutScreen() {
    const router = useRouter();
    const colors = useThemeColors();
    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.statusSpacer} />
            <View style={styles.header}>
                <Pressable style={[styles.backBtn, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>About</Text>
                <View style={{ width: 40 }} />
            </View>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.logoSection}>
                    <View style={[styles.logoCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={{ fontSize: 32 }}>🌐</Text></View>
                    <Text style={[styles.appName, { color: colors.text }]}>CampusBarter</Text>
                    <Text style={[styles.version, { color: colors.textMuted }]}>Version 1.0.0</Text>
                </View>

                <Text style={[styles.desc, { color: colors.textSecondary }]}>
                    CampusBarter is a peer-to-peer skill exchange platform built for students at SAIT.
                    Trade your skills using time credits — no money needed. Post what you know, find what you need,
                    and build your campus reputation through reviews and ratings.
                </Text>

                <View style={[styles.infoCard, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                    <View style={styles.infoRow}>
                        <Ionicons name="school-outline" size={18} color={colors.textSecondary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]}>Built for SAIT students</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="shield-checkmark-outline" size={18} color={colors.textSecondary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]}>PIPEDA compliant</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="globe-outline" size={18} color={colors.textSecondary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]}>Expandable to other institutions</Text>
                    </View>
                </View>

                <Text style={[styles.madeWith, { color: colors.textMuted }]}>Made with ❤️ by SAIT SDNE students</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
    backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40, alignItems: 'center' },
    logoSection: { alignItems: 'center', marginBottom: Spacing['2xl'] },
    logoCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
    appName: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
    version: { fontSize: 13, marginTop: 4 },
    desc: { fontSize: 15, lineHeight: 24, textAlign: 'center', marginBottom: Spacing.xl },
    infoCard: { borderWidth: 1, borderRadius: Radii.lg, padding: Spacing.lg, gap: Spacing.md, width: '100%', marginBottom: Spacing.xl },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    infoText: { fontSize: 14 },
    madeWith: { fontSize: 13, textAlign: 'center' },
});
