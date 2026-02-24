import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function RegisterStep1() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const e: Record<string, string> = {};
        if (!email.toLowerCase().endsWith('@edu.sait.ca') && !email.toLowerCase().endsWith('@sait.ca') && !email.toLowerCase().endsWith('@campusbarter.onmicrosoft.com')) e.email = 'Must be a SAIT or CampusBarter email';
        if (password.length < 8) e.password = 'Minimum 8 characters';
        if (password !== confirm) e.confirm = 'Passwords do not match';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleNext = () => {
        if (!validate()) return;
        router.push({
            pathname: '/(auth)/register-step2',
            params: { email, password },
        });
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <View style={styles.statusSpacer} />

                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={AppColors.text} />
                </Pressable>

                {/* Progress */}
                <View style={styles.progress}>
                    <View style={[styles.progDot, styles.progActive]} />
                    <View style={styles.progLine} />
                    <View style={styles.progDot} />
                    <View style={styles.progLine} />
                    <View style={styles.progDot} />
                </View>

                <Animated.View entering={FadeInDown.duration(500)}>
                    <Text style={styles.step}>Step 1 of 3</Text>
                    <Text style={styles.title}>Create your account</Text>
                    <Text style={styles.subtitle}>Start with your email and a secure password.</Text>
                </Animated.View>

                <View style={styles.form}>
                    <Input label="Email" placeholder="you@edu.sait.ca" value={email} onChangeText={setEmail}
                        keyboardType="email-address" autoCapitalize="none" error={errors.email}
                        icon={<Ionicons name="mail-outline" size={18} color={AppColors.textMuted} />} />
                    <Input label="Password" placeholder="Min 8 characters" value={password} onChangeText={setPassword}
                        secureTextEntry error={errors.password}
                        icon={<Ionicons name="lock-closed-outline" size={18} color={AppColors.textMuted} />} />
                    <Input label="Confirm Password" placeholder="Re-enter password" value={confirm} onChangeText={setConfirm}
                        secureTextEntry error={errors.confirm}
                        icon={<Ionicons name="shield-checkmark-outline" size={18} color={AppColors.textMuted} />} />
                    <Button title="Continue" onPress={handleNext} fullWidth size="lg" />
                </View>

                <View style={styles.bottomRow}>
                    <Text style={styles.bottomText}>Already have an account? </Text>
                    <Pressable onPress={() => router.replace('/(auth)/sign-in')}>
                        <Text style={styles.bottomLink}>Sign In</Text>
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
        backgroundColor: AppColors.surface, alignItems: 'center', justifyContent: 'center',
        marginBottom: Spacing.xl,
    },
    progress: {
        flexDirection: 'row', alignItems: 'center', marginBottom: Spacing['2xl'],
    },
    progDot: {
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: AppColors.border,
    },
    progActive: { backgroundColor: AppColors.primary },
    progLine: { flex: 1, height: 2, backgroundColor: AppColors.border, marginHorizontal: 4 },
    step: { fontSize: 12, color: AppColors.primary, fontWeight: '600', letterSpacing: 1, marginBottom: 6 },
    title: { fontSize: 28, fontWeight: '900', color: AppColors.text, letterSpacing: -0.5, marginBottom: Spacing.xs },
    subtitle: { fontSize: 15, color: AppColors.textSecondary, marginBottom: Spacing['3xl'] },
    form: { gap: Spacing.xl },
    bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing['3xl'] },
    bottomText: { color: AppColors.textSecondary, fontSize: 14 },
    bottomLink: { color: AppColors.primary, fontSize: 14, fontWeight: '600' },
});
