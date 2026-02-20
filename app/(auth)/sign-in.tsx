import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';

export default function SignInScreen() {
    const router = useRouter();
    const { signIn, isLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

    const validate = () => {
        const e: typeof errors = {};
        if (!email.trim()) e.email = 'Email is required';
        else if (!email.toLowerCase().endsWith('@edu.sait.ca')) e.email = 'Must be a SAIT student email (@edu.sait.ca)';
        if (!password) e.password = 'Password is required';
        else if (password.length < 6) e.password = 'Password must be at least 6 characters';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSignIn = async () => {
        if (!validate()) return;
        try {
            await signIn(email, password);
        } catch {
            setErrors({ general: 'Invalid email or password. Please try again.' });
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.statusSpacer} />

                {/* Back button */}
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={AppColors.text} />
                </Pressable>

                {/* Header */}
                <Animated.View entering={FadeInDown.delay(100).duration(500)}>
                    <Text style={styles.title}>Welcome back</Text>
                    <Text style={styles.subtitle}>Sign in to your CampusBarter account</Text>
                </Animated.View>

                {/* Form */}
                <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.form}>
                    {errors.general && (
                        <View style={styles.errorBanner}>
                            <Ionicons name="alert-circle" size={18} color={AppColors.error} />
                            <Text style={styles.errorBannerText}>{errors.general}</Text>
                        </View>
                    )}

                    <Input
                        label="Email"
                        placeholder="you@edu.sait.ca"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        error={errors.email}
                        icon={<Ionicons name="mail-outline" size={18} color={AppColors.textMuted} />}
                    />

                    <View>
                        <Input
                            label="Password"
                            placeholder="Enter your password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            autoComplete="password"
                            error={errors.password}
                            icon={<Ionicons name="lock-closed-outline" size={18} color={AppColors.textMuted} />}
                        />
                        <Pressable style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                            <Ionicons
                                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color={AppColors.textMuted}
                            />
                        </Pressable>
                    </View>

                    <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotRow}>
                        <Text style={styles.forgotText}>Forgot password?</Text>
                    </Pressable>

                    <Button
                        title="Sign In"
                        onPress={handleSignIn}
                        loading={isLoading}
                        fullWidth
                        size="lg"
                    />
                </Animated.View>

                {/* Bottom link */}
                <View style={styles.bottomRow}>
                    <Text style={styles.bottomText}>Don't have an account? </Text>
                    <Pressable onPress={() => router.push('/(auth)/register-step1')}>
                        <Text style={styles.bottomLink}>Create one</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppColors.background },
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: AppColors.surface,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: Spacing['2xl'],
    },
    title: {
        fontSize: 28, fontWeight: '900', color: AppColors.text,
        letterSpacing: -0.5, marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: 15, color: AppColors.textSecondary,
        marginBottom: Spacing['3xl'],
    },
    form: { gap: Spacing.xl },
    errorBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(239,68,68,0.1)',
        borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
        borderRadius: Radii.md, padding: Spacing.md,
    },
    errorBannerText: { color: AppColors.error, fontSize: 13, flex: 1 },
    eyeBtn: {
        position: 'absolute', right: 14, top: 40,
    },
    forgotRow: { alignSelf: 'flex-end' },
    forgotText: {
        color: AppColors.primary, fontSize: 13, fontWeight: '600',
    },
    bottomRow: {
        flexDirection: 'row', justifyContent: 'center',
        marginTop: Spacing['3xl'],
    },
    bottomText: { color: AppColors.textSecondary, fontSize: 14 },
    bottomLink: { color: AppColors.primary, fontSize: 14, fontWeight: '600' },
});
