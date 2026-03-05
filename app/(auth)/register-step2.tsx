import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PROGRAMS, SEMESTERS } from '@/constants/categories';
import { Radii, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function RegisterStep2() {
    const router = useRouter();
    const params = useLocalSearchParams<{ email: string; password: string }>();
    const colors = useThemeColors();

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
                    <View style={[styles.progDot, { backgroundColor: colors.primary }]} />
                    <View style={[styles.progLine, { backgroundColor: colors.border }]} />
                    <View style={[styles.progDot, { backgroundColor: colors.border }]} />
                </View>

                <Animated.View entering={FadeInDown.duration(500)}>
                    <Text style={[styles.step, { color: colors.primary }]}>Step 2 of 3</Text>
                    <Text style={[styles.title, { color: colors.text }]}>Academic Info</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Help us verify your campus identity.</Text>
                </Animated.View>

                <View style={styles.form}>
                    <Input label="Full Name" placeholder="Your name" value={displayName} onChangeText={setDisplayName}
                        error={errors.displayName}
                        icon={<Ionicons name="person-outline" size={18} color={colors.textMuted} />} />

                    {/* Program picker as buttons */}
                    <View style={{ gap: 6 }}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Program</Text>
                        <View style={styles.chipGrid}>
                            {PROGRAMS.map((p) => (
                                <Pressable key={p} style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surface }, program === p && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setProgram(p)}>
                                    <Text style={[styles.chipText, { color: colors.textSecondary }, program === p && styles.chipTextActive]}>{p}</Text>
                                </Pressable>
                            ))}
                        </View>
                        {errors.program && <Text style={[styles.error, { color: colors.error }]}>{errors.program}</Text>}
                    </View>

                    <Input label="Major / Focus Area" placeholder="e.g. Full-Stack, UI/UX" value={major} onChangeText={setMajor}
                        error={errors.major}
                        icon={<Ionicons name="school-outline" size={18} color={colors.textMuted} />} />

                    {/* Semester picker */}
                    <View style={{ gap: 6 }}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Semester</Text>
                        <View style={styles.semRow}>
                            {SEMESTERS.map((s) => (
                                <Pressable key={s} style={[styles.semBtn, { borderColor: colors.border, backgroundColor: colors.surface }, semester === String(s) && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                    onPress={() => setSemester(String(s))}>
                                    <Text style={[styles.semText, { color: colors.textSecondary }, semester === String(s) && styles.semTextActive]}>{s}</Text>
                                </Pressable>
                            ))}
                        </View>
                        {errors.semester && <Text style={[styles.error, { color: colors.error }]}>{errors.semester}</Text>}
                    </View>

                    <Button title="Continue" onPress={handleNext} fullWidth size="lg" />
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
    label: { fontSize: 13, fontWeight: '500', marginLeft: 2 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radii.sm,
        borderWidth: 1,
    },
    chipText: { fontSize: 13, fontWeight: '500' },
    chipTextActive: { color: '#FFFFFF', fontWeight: '700' },
    semRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    semBtn: {
        width: 42, height: 42, borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center', justifyContent: 'center',
    },
    semText: { fontSize: 15, fontWeight: '600' },
    semTextActive: { color: '#FFFFFF' },
    error: { fontSize: 12, fontWeight: '500', marginLeft: 2 },
});
