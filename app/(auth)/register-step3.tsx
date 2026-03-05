import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spacing } from '@/constants/theme';
import { useAuth, type SignUpData } from '@/context/AuthContext';
import { useThemeColors } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function RegisterStep3() {
    const router = useRouter();
    const { signUp, isLoading } = useAuth();
    const colors = useThemeColors();
    const params = useLocalSearchParams<{
        email: string; password: string; displayName: string;
        program: string; major: string; semester: string;
    }>();

    const [bio, setBio] = useState('');
    const [agreedTerms, setAgreedTerms] = useState(false);
    const [error, setError] = useState('');

    const handleFinish = async () => {
        if (!agreedTerms) { setError('You must accept the Terms & Privacy Policy.'); return; }
        setError('');

        const data: SignUpData = {
            email: params.email!,
            password: params.password!,
            displayName: params.displayName!,
            program: params.program!,
            major: params.major!,
            semester: Number(params.semester),
            campus: 'SAIT Main',
            bio,
        };

        try {
            await signUp(data);
            // Auth redirect will handle navigation after sign-up
        } catch {
            setError('Registration failed. Please try again.');
        }
    };

    return (
        <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <View style={styles.statusSpacer} />

                <Pressable style={[styles.backBtn, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </Pressable>

                {/* Progress */}
                <View style={styles.progress}>
                    <View style={[styles.progDot, { backgroundColor: colors.success }]} />
                    <View style={[styles.progLine, { backgroundColor: colors.success }]} />
                    <View style={[styles.progDot, { backgroundColor: colors.success }]} />
                    <View style={[styles.progLine, { backgroundColor: colors.success }]} />
                    <View style={[styles.progDot, { backgroundColor: colors.primary }]} />
                </View>

                <Animated.View entering={FadeInDown.duration(500)}>
                    <Text style={[styles.step, { color: colors.primary }]}>Step 3 of 3</Text>
                    <Text style={[styles.title, { color: colors.text }]}>Almost there!</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Add a bio and accept our policies.</Text>
                </Animated.View>

                <View style={styles.form}>
                    {/* Profile photo placeholder */}
                    <View style={styles.avatarSection}>
                        <View style={[styles.avatarCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
                        </View>
                        <Text style={[styles.avatarHint, { color: colors.textMuted }]}>Add a profile photo (optional)</Text>
                    </View>

                    <Input
                        label="Bio (optional)"
                        placeholder="Tell students about yourself..."
                        value={bio}
                        onChangeText={setBio}
                        multiline
                        numberOfLines={3}
                        style={{ minHeight: 80, textAlignVertical: 'top' }}
                        icon={<Ionicons name="document-text-outline" size={18} color={colors.textMuted} />}
                    />

                    {/* Terms checkbox */}
                    <Pressable style={styles.termsRow} onPress={() => setAgreedTerms(!agreedTerms)}>
                        <View style={[styles.checkbox, { borderColor: colors.border }, agreedTerms && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                            {agreedTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                        </View>
                        <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                            I agree to the{' '}
                            <Text style={[styles.termsLink, { color: colors.primary }]} onPress={() => router.push('/terms')}>Terms of Service</Text>
                            {' '}and{' '}
                            <Text style={[styles.termsLink, { color: colors.primary }]} onPress={() => router.push('/privacy')}>Privacy Policy</Text>
                        </Text>
                    </Pressable>

                    {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}

                    <Button title="Create Account" onPress={handleFinish} loading={isLoading} fullWidth size="lg" />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: Spacing.xl,
    },
    progress: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing['2xl'] },
    progDot: { width: 10, height: 10, borderRadius: 5 },
    progLine: { flex: 1, height: 2, marginHorizontal: 4 },
    step: { fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 6 },
    title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: Spacing.xs },
    subtitle: { fontSize: 15, marginBottom: Spacing['3xl'] },
    form: { gap: Spacing.xl },

    avatarSection: { alignItems: 'center', gap: Spacing.sm },
    avatarCircle: {
        width: 80, height: 80, borderRadius: 40,
        borderWidth: 2,
        borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
    },
    avatarHint: { fontSize: 13 },

    termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
    checkbox: {
        width: 22, height: 22, borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center', justifyContent: 'center', marginTop: 1,
    },
    termsText: { flex: 1, fontSize: 13, lineHeight: 20 },
    termsLink: { fontWeight: '600' },
    errorText: { fontSize: 13, fontWeight: '500' },
});
