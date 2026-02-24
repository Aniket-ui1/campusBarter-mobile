import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

import { useAuth } from '@/context/AuthContext';

const FEATURES = [
    { icon: '📋', title: 'Post Skills', desc: 'Share what you can teach' },
    { icon: '🔍', title: 'Find Help', desc: 'Browse student offerings' },
    { icon: '🤝', title: 'Exchange', desc: 'Trade with time credits' },
    { icon: '⭐', title: 'Build Rep', desc: 'Earn ratings & reviews' },
];

export default function WelcomeScreen() {
    const router = useRouter();
    const { loginWithMicrosoft, isLoading } = useAuth();

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />

            {/* Glow blobs */}
            <View style={styles.blobTopLeft} />
            <View style={styles.blobBottomRight} />

            {/* Logo */}
            <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.logoSection}>
                <View style={styles.logoCircle}>
                    <Text style={{ fontSize: 36 }}>🌐</Text>
                </View>
                <Text style={styles.appName}>CampusBarter</Text>
                <Text style={styles.tagline}>Trade skills, not cash</Text>
            </Animated.View>

            {/* Features grid */}
            <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.featuresGrid}>
                {FEATURES.map((f, i) => (
                    <View key={i} style={styles.featureItem}>
                        <View style={styles.featureIconWrap}>
                            <Text style={{ fontSize: 20 }}>{f.icon}</Text>
                        </View>
                        <Text style={styles.featureTitle}>{f.title}</Text>
                        <Text style={styles.featureDesc}>{f.desc}</Text>
                    </View>
                ))}
            </Animated.View>

            {/* Microsoft Sign In */}
            <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.ctaSection}>
                <Pressable
                    style={[styles.microsoftBtn, isLoading && { opacity: 0.6 }]}
                    onPress={loginWithMicrosoft}
                    disabled={isLoading}
                >
                    <View style={styles.msGrid}>
                        <View style={[styles.msSquare, { backgroundColor: '#F25022' }]} />
                        <View style={[styles.msSquare, { backgroundColor: '#7FBA00' }]} />
                        <View style={[styles.msSquare, { backgroundColor: '#00A4EF' }]} />
                        <View style={[styles.msSquare, { backgroundColor: '#FFB900' }]} />
                    </View>
                    <Text style={styles.microsoftBtnText}>
                        {isLoading ? 'Signing in…' : 'Sign in with Microsoft'}
                    </Text>
                </Pressable>
            </Animated.View>

            {/* Links */}
            <Animated.View entering={FadeInDown.delay(650).duration(400)} style={styles.links}>
                <Pressable onPress={() => router.push('/terms')}>
                    <Text style={styles.linkText}>Terms</Text>
                </Pressable>
                <Text style={styles.linkDot}>·</Text>
                <Pressable onPress={() => router.push('/privacy')}>
                    <Text style={styles.linkText}>Privacy</Text>
                </Pressable>
                <Text style={styles.linkDot}>·</Text>
                <Pressable onPress={() => router.push('/about')}>
                    <Text style={styles.linkText}>About</Text>
                </Pressable>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: AppColors.background,
        paddingHorizontal: Spacing.xl,
    },
    statusSpacer: { height: Platform.OS === 'ios' ? 60 : 40 },

    blobTopLeft: {
        position: 'absolute', top: -80, left: -80,
        width: 250, height: 250, borderRadius: 125,
        backgroundColor: 'rgba(107,143,113,0.10)',
    },
    blobBottomRight: {
        position: 'absolute', bottom: -60, right: -60,
        width: 200, height: 200, borderRadius: 100,
        backgroundColor: 'rgba(52,86,53,0.10)',
    },

    logoSection: {
        alignItems: 'center',
        marginTop: Spacing['3xl'],
        marginBottom: Spacing['3xl'],
    },
    logoCircle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: AppColors.surface,
        borderWidth: 1.5,
        borderColor: AppColors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    appName: {
        fontSize: 32, fontWeight: '900',
        color: AppColors.text,
        letterSpacing: -1,
        marginBottom: Spacing.xs,
    },
    tagline: {
        fontSize: 16,
        color: AppColors.textSecondary,
        fontWeight: '400',
    },

    featuresGrid: {
        flexDirection: 'row', flexWrap: 'wrap',
        gap: Spacing.md,
        marginBottom: Spacing['3xl'],
    },
    featureItem: {
        width: '47%' as any,
        backgroundColor: AppColors.surface,
        borderWidth: 1,
        borderColor: AppColors.border,
        borderRadius: Radii.lg,
        padding: Spacing.lg,
        gap: Spacing.xs,
    },
    featureIconWrap: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: AppColors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xs,
    },
    featureTitle: {
        fontSize: 14, fontWeight: '700', color: AppColors.text,
    },
    featureDesc: {
        fontSize: 12, color: AppColors.textSecondary, lineHeight: 18,
    },

    ctaSection: {
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    microsoftBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: '#2F2F2F',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: Radii.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    msGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 2,
        width: 22, height: 22,
    },
    msSquare: {
        width: 10, height: 10,
    },
    microsoftBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },

    links: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
    },
    linkText: {
        fontSize: 13, color: AppColors.textMuted, fontWeight: '500',
    },
    linkDot: {
        color: AppColors.textMuted, fontSize: 13,
    },
});
