import { Radii, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

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
    const colors = useThemeColors();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.statusSpacer} />

            {/* Glow blobs */}
            <View style={styles.blobTopLeft} />
            <View style={styles.blobBottomRight} />

            {/* Logo */}
            <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.logoSection}>
                <View style={[styles.logoCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={{ fontSize: 36 }}>🌐</Text>
                </View>
                <Text style={[styles.appName, { color: colors.text }]}>CampusBarter</Text>
                <Text style={[styles.tagline, { color: colors.textSecondary }]}>Trade skills, not cash</Text>
            </Animated.View>

            {/* Features grid */}
            <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.featuresGrid}>
                {FEATURES.map((f, i) => (
                    <View key={i} style={[styles.featureItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={[styles.featureIconWrap, { backgroundColor: colors.surfaceLight }]}>
                            <Text style={{ fontSize: 20 }}>{f.icon}</Text>
                        </View>
                        <Text style={[styles.featureTitle, { color: colors.text }]}>{f.title}</Text>
                        <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{f.desc}</Text>
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
                    <Text style={[styles.linkText, { color: colors.textMuted }]}>Terms</Text>
                </Pressable>
                <Text style={[styles.linkDot, { color: colors.textMuted }]}>·</Text>
                <Pressable onPress={() => router.push('/privacy')}>
                    <Text style={[styles.linkText, { color: colors.textMuted }]}>Privacy</Text>
                </Pressable>
                <Text style={[styles.linkDot, { color: colors.textMuted }]}>·</Text>
                <Pressable onPress={() => router.push('/about')}>
                    <Text style={[styles.linkText, { color: colors.textMuted }]}>About</Text>
                </Pressable>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    appName: {
        fontSize: 32, fontWeight: '900',
        letterSpacing: -1,
        marginBottom: Spacing.xs,
    },
    tagline: {
        fontSize: 16,
        fontWeight: '400',
    },

    featuresGrid: {
        flexDirection: 'row', flexWrap: 'wrap',
        gap: Spacing.md,
        marginBottom: Spacing['3xl'],
    },
    featureItem: {
        width: '47%' as any,
        borderWidth: 1,
        borderRadius: Radii.lg,
        padding: Spacing.lg,
        gap: Spacing.xs,
    },
    featureIconWrap: {
        width: 40, height: 40, borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xs,
    },
    featureTitle: {
        fontSize: 14, fontWeight: '700',
    },
    featureDesc: {
        fontSize: 12, lineHeight: 18,
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
        fontSize: 13, fontWeight: '500',
    },
    linkDot: {
        fontSize: 13,
    },
});
