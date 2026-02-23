import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const { resetPassword, isLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleReset = async () => {
        if (!email.includes('@')) { setError('Enter a valid email'); return; }
        setError('');
        await resetPassword(email);
        setSent(true);
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <View style={styles.statusSpacer} />

                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={AppColors.text} />
                </Pressable>

                {!sent ? (
                    <Animated.View entering={FadeInDown.duration(500)}>
                        <Text style={styles.title}>Reset password</Text>
                        <Text style={styles.subtitle}>Enter your email and we'll send you a reset link.</Text>

                        <View style={styles.form}>
                            <Input
                                label="Email"
                                placeholder="you@sait.ca"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                error={error}
                                icon={<Ionicons name="mail-outline" size={18} color={AppColors.textMuted} />}
                            />
                            <Button title="Send Reset Link" onPress={handleReset} loading={isLoading} fullWidth size="lg" />
                        </View>
                    </Animated.View>
                ) : (
                    <Animated.View entering={FadeInDown.duration(500)} style={styles.successBox}>
                        <View style={styles.checkCircle}>
                            <Ionicons name="checkmark" size={32} color={AppColors.success} />
                        </View>
                        <Text style={styles.title}>Check your email</Text>
                        <Text style={styles.subtitle}>
                            We've sent a password reset link to {email}. Check your inbox.
                        </Text>
                        <Button title="Back to Sign In" onPress={() => router.replace('/(auth)/sign-in')} fullWidth />
                    </Animated.View>
                )}
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
        marginBottom: Spacing['3xl'], lineHeight: 22,
    },
    form: { gap: Spacing.xl },
    successBox: { alignItems: 'center', gap: Spacing.lg, paddingTop: Spacing['4xl'] },
    checkCircle: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: 'rgba(34,197,94,0.1)',
        borderWidth: 2, borderColor: 'rgba(34,197,94,0.3)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
});
