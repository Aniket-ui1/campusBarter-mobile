import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PROGRAMS, SEMESTERS } from '@/constants/categories';

export default function RegisterStep2() {
    const router = useRouter();
    const params = useLocalSearchParams<{ email: string; password: string }>();

    const [program, setProgram] = useState('');
    const [major, setMajor] = useState('');
    const [semester, setSemester] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const e: Record<string, string> = {};
        if (!displayName.trim()) e.displayName = 'Name is required';
        if (!program) e.program = 'Select a program';
        if (!major.trim()) e.major = 'Major is required';
        if (!semester) e.semester = 'Select a semester';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleNext = () => {
        if (!validate()) return;
        router.push({
            pathname: '/(auth)/register-step3',
            params: { ...params, displayName, program, major, semester },
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
                    <View style={[styles.progDot, styles.progDone]} />
                    <View style={[styles.progLine, styles.progLineDone]} />
                    <View style={[styles.progDot, styles.progActive]} />
                    <View style={styles.progLine} />
                    <View style={styles.progDot} />
                </View>

                <Animated.View entering={FadeInDown.duration(500)}>
                    <Text style={styles.step}>Step 2 of 3</Text>
                    <Text style={styles.title}>Academic Info</Text>
                    <Text style={styles.subtitle}>Help us verify your campus identity.</Text>
                </Animated.View>

                <View style={styles.form}>
                    <Input label="Full Name" placeholder="Your name" value={displayName} onChangeText={setDisplayName}
                        error={errors.displayName}
                        icon={<Ionicons name="person-outline" size={18} color={AppColors.textMuted} />} />

                    {/* Program picker as buttons */}
                    <View style={{ gap: 6 }}>
                        <Text style={styles.label}>Program</Text>
                        <View style={styles.chipGrid}>
                            {PROGRAMS.map((p) => (
                                <Pressable key={p} style={[styles.chip, program === p && styles.chipActive]} onPress={() => setProgram(p)}>
                                    <Text style={[styles.chipText, program === p && styles.chipTextActive]}>{p}</Text>
                                </Pressable>
                            ))}
                        </View>
                        {errors.program && <Text style={styles.error}>{errors.program}</Text>}
                    </View>

                    <Input label="Major / Focus Area" placeholder="e.g. Full-Stack, UI/UX" value={major} onChangeText={setMajor}
                        error={errors.major}
                        icon={<Ionicons name="school-outline" size={18} color={AppColors.textMuted} />} />

                    {/* Semester picker */}
                    <View style={{ gap: 6 }}>
                        <Text style={styles.label}>Semester</Text>
                        <View style={styles.semRow}>
                            {SEMESTERS.map((s) => (
                                <Pressable key={s} style={[styles.semBtn, semester === String(s) && styles.semBtnActive]}
                                    onPress={() => setSemester(String(s))}>
                                    <Text style={[styles.semText, semester === String(s) && styles.semTextActive]}>{s}</Text>
                                </Pressable>
                            ))}
                        </View>
                        {errors.semester && <Text style={styles.error}>{errors.semester}</Text>}
                    </View>

                    <Button title="Continue" onPress={handleNext} fullWidth size="lg" />
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
    progress: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing['2xl'] },
    progDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: AppColors.border },
    progActive: { backgroundColor: AppColors.primary },
    progDone: { backgroundColor: AppColors.success },
    progLine: { flex: 1, height: 2, backgroundColor: AppColors.border, marginHorizontal: 4 },
    progLineDone: { backgroundColor: AppColors.success },
    step: { fontSize: 12, color: AppColors.primary, fontWeight: '600', letterSpacing: 1, marginBottom: 6 },
    title: { fontSize: 28, fontWeight: '900', color: AppColors.text, letterSpacing: -0.5, marginBottom: Spacing.xs },
    subtitle: { fontSize: 15, color: AppColors.textSecondary, marginBottom: Spacing['3xl'] },
    form: { gap: Spacing.xl },
    label: { color: AppColors.textSecondary, fontSize: 13, fontWeight: '500', marginLeft: 2 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radii.sm,
        borderWidth: 1, borderColor: AppColors.border, backgroundColor: AppColors.surface,
    },
    chipActive: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
    chipText: { color: AppColors.textSecondary, fontSize: 13, fontWeight: '500' },
    chipTextActive: { color: '#FFFFFF', fontWeight: '700' },
    semRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    semBtn: {
        width: 42, height: 42, borderRadius: 12,
        borderWidth: 1, borderColor: AppColors.border, backgroundColor: AppColors.surface,
        alignItems: 'center', justifyContent: 'center',
    },
    semBtnActive: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
    semText: { color: AppColors.textSecondary, fontSize: 15, fontWeight: '600' },
    semTextActive: { color: '#FFFFFF' },
    error: { color: AppColors.error, fontSize: 12, fontWeight: '500', marginLeft: 2 },
});
