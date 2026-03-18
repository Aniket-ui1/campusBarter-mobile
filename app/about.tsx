import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppColors, Radii, Spacing } from '@/constants/theme';

export default function AboutScreen() {
    const router = useRouter();
    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.logoSection}>
                    <View style={styles.logoCircle}><Text style={{ fontSize: 32 }}>🌐</Text></View>
                    <Text style={styles.appName}>CampusBarter</Text>
                    <Text style={styles.version}>Version 1.0.0</Text>
                </View>

                <Text style={styles.desc}>
                    CampusBarter is a peer-to-peer skill exchange platform built for students at SAIT.
                    Trade your skills using time credits — no money needed. Post what you know, find what you need,
                    and build your campus reputation through reviews and ratings.
                </Text>

                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Ionicons name="school-outline" size={18} color={AppColors.textSecondary} />
                        <Text style={styles.infoText}>Built for SAIT students</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="shield-checkmark-outline" size={18} color={AppColors.textSecondary} />
                        <Text style={styles.infoText}>PIPEDA compliant</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="globe-outline" size={18} color={AppColors.textSecondary} />
                        <Text style={styles.infoText}>Expandable to other institutions</Text>
                    </View>
                </View>

                <Text style={styles.madeWith}>Made with ❤️ by SAIT SDNE students</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppColors.background },
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40, alignItems: 'center' },
    logoSection: { alignItems: 'center', marginBottom: Spacing['2xl'] },
    logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: AppColors.surface, borderWidth: 1.5, borderColor: AppColors.border, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
    appName: { fontSize: 28, fontWeight: '900', color: AppColors.text, letterSpacing: -0.5 },
    version: { fontSize: 13, color: AppColors.textMuted, marginTop: 4 },
    desc: { fontSize: 15, color: AppColors.textSecondary, lineHeight: 24, textAlign: 'center', marginBottom: Spacing.xl },
    infoCard: { backgroundColor: AppColors.surfaceLight, borderWidth: 1, borderColor: AppColors.border, borderRadius: Radii.lg, padding: Spacing.lg, gap: Spacing.md, width: '100%', marginBottom: Spacing.xl },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    infoText: { fontSize: 14, color: AppColors.textSecondary },
    madeWith: { fontSize: 13, color: AppColors.textMuted, textAlign: 'center' },
});
