import { Button } from '@/components/ui/Button';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const FEATURES = [
    { icon: '📋', title: 'Post Skills', desc: 'Share what you can teach' },
    { icon: '🔍', title: 'Find Help', desc: 'Browse student offerings' },
    { icon: '🤝', title: 'Exchange', desc: 'Trade with time credits' },
    { icon: '⭐', title: 'Build Rep', desc: 'Earn ratings & reviews' },
];

export default function WelcomeScreen() {
    const router = useRouter();

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

            {/* CTAs */}
            <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.ctaSection}>
                <Button
                    title="Sign In"
                    onPress={() => router.push('/(auth)/sign-in')}
                    icon={<Ionicons name="log-in-outline" size={20} color="#FFFFFF" />}
                    fullWidth
                />
                <Button
                    title="Create Account"
                    onPress={() => router.push('/(auth)/register-step1')}
                    variant="secondary"
                    fullWidth
                />
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
