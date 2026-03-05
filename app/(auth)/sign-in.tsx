import { Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useThemeColors } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function SignInScreen() {
    const router = useRouter();
    const { loginWithMicrosoft, isLoading } = useAuth();
    const colors = useThemeColors();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.statusSpacer} />

            {/* Back button */}
            <Pressable style={[styles.backBtn, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={22} color={colors.text} />
            </Pressable>

            {/* Header */}
            <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.headerSection}>
                <View style={[styles.lockCircle, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                    <Ionicons name="shield-checkmark" size={36} color={colors.primary} />
                </View>
                <Text style={[styles.title, { color: colors.text }]}>Welcome back</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Sign in with your Microsoft account to access CampusBarter.
                    {'\n'}Only authorized SAIT students can log in.
                </Text>
            </Animated.View>

            {/* Microsoft Sign In Button */}
            <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.btnSection}>
                <Pressable
                    style={[styles.microsoftBtn, isLoading && styles.microsoftBtnDisabled]}
                    onPress={loginWithMicrosoft}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            <View style={styles.msLogoWrap}>
                                <View style={styles.msGrid}>
                                    <View style={[styles.msSquare, { backgroundColor: '#F25022' }]} />
                                    <View style={[styles.msSquare, { backgroundColor: '#7FBA00' }]} />
                                    <View style={[styles.msSquare, { backgroundColor: '#00A4EF' }]} />
                                    <View style={[styles.msSquare, { backgroundColor: '#FFB900' }]} />
                                </View>
                            </View>
                            <Text style={styles.microsoftBtnText}>Sign in with Microsoft</Text>
                        </>
                    )}
                </Pressable>

                <View style={[styles.infoBox, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                    <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        Use your @campusbarter.onmicrosoft.com account provided by your administrator.
                    </Text>
                </View>
            </Animated.View>

            {/* Footer links */}
            <View style={styles.footer}>
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
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: Spacing.xl,
    },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: Spacing['2xl'],
    },

    headerSection: {
        alignItems: 'center',
        marginBottom: Spacing['3xl'],
    },
    lockCircle: {
        width: 72, height: 72, borderRadius: 36,
        borderWidth: 1.5,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: Spacing.xl,
    },
    title: {
        fontSize: 28, fontWeight: '900',
        letterSpacing: -0.5, marginBottom: Spacing.sm,
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center', lineHeight: 22,
    },

    btnSection: {
        gap: Spacing.xl,
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
    microsoftBtnDisabled: {
        opacity: 0.6,
    },
    msLogoWrap: {
        width: 22, height: 22,
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

    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        borderWidth: 1,
        borderRadius: Radii.md,
        padding: Spacing.lg,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 20,
    },

    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        position: 'absolute',
        bottom: 40,
        left: Spacing.xl,
        right: Spacing.xl,
    },
    linkText: { fontSize: 13, fontWeight: '500' },
    linkDot: { fontSize: 13 },
});
