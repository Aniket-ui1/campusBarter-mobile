import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView, Platform, Pressable,
    ScrollView, StyleSheet, Text, View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PROGRAMS, SEMESTERS, SKILLS_OPTIONS } from '@/constants/categories';
import { useAuth } from '@/context/AuthContext';

export default function CompleteProfileScreen() {
    const { user, completeProfile, isLoading } = useAuth();

    const [program, setProgram] = useState('');
    const [major, setMajor] = useState('');
    const [semester, setSemester] = useState('');
    const [skills, setSkills] = useState<string[]>([]);
    const [weaknesses, setWeaknesses] = useState<string[]>([]);
    const [interests, setInterests] = useState<string[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const toggleItem = (
        list: string[],
        setList: React.Dispatch<React.SetStateAction<string[]>>,
        item: string
    ) => {
        setList((prev) =>
            prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
        );
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!program) e.program = 'Select a program';
        if (!major.trim()) e.major = 'Major is required';
        if (!semester) e.semester = 'Select a semester';
        if (skills.length === 0) e.skills = 'Select at least one skill';
        if (interests.length === 0) e.interests = 'Select at least one interest';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        await completeProfile({
            program,
            major,
            semester: parseInt(semester, 10),
            skills,
            weaknesses,
            interests,
        });
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

                {/* Header */}
                <Animated.View entering={FadeInDown.delay(100).duration(500)}>
                    <View style={styles.headerIcon}>
                        <Ionicons name="person-add" size={32} color={AppColors.primary} />
                    </View>
                    <Text style={styles.greeting}>
                        Welcome, {user?.displayName?.split(' ')[0] ?? 'Student'}! 👋
                    </Text>
                    <Text style={styles.title}>Complete Your Profile</Text>
                    <Text style={styles.subtitle}>
                        Tell us about yourself so others can find and connect with you.
                    </Text>
                </Animated.View>

                {/* Form */}
                <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.form}>

                    {/* Program */}
                    <View style={styles.section}>
                        <Text style={styles.label}>
                            <Ionicons name="school-outline" size={14} color={AppColors.textSecondary} />
                            {'  '}Program
                        </Text>
                        <View style={styles.chipGrid}>
                            {PROGRAMS.map((p) => (
                                <Pressable
                                    key={p}
                                    style={[styles.chip, program === p && styles.chipActive]}
                                    onPress={() => setProgram(p)}
                                >
                                    <Text style={[styles.chipText, program === p && styles.chipTextActive]}>
                                        {p}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                        {errors.program && <Text style={styles.error}>{errors.program}</Text>}
                    </View>

                    {/* Major */}
                    <Input
                        label="Major / Focus Area"
                        placeholder="e.g. Full-Stack, UI/UX, Data Science"
                        value={major}
                        onChangeText={setMajor}
                        error={errors.major}
                        icon={<Ionicons name="code-slash-outline" size={18} color={AppColors.textMuted} />}
                    />

                    {/* Semester */}
                    <View style={styles.section}>
                        <Text style={styles.label}>
                            <Ionicons name="calendar-outline" size={14} color={AppColors.textSecondary} />
                            {'  '}Semester
                        </Text>
                        <View style={styles.semRow}>
                            {SEMESTERS.map((s) => (
                                <Pressable
                                    key={s}
                                    style={[styles.semBtn, semester === String(s) && styles.semBtnActive]}
                                    onPress={() => setSemester(String(s))}
                                >
                                    <Text style={[styles.semText, semester === String(s) && styles.semTextActive]}>
                                        {s}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                        {errors.semester && <Text style={styles.error}>{errors.semester}</Text>}
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Skills */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>💪 Skills</Text>
                        <Text style={styles.sectionDesc}>What are you good at? Pick all that apply.</Text>
                        <View style={styles.chipGrid}>
                            {SKILLS_OPTIONS.map((s) => (
                                <Pressable
                                    key={s}
                                    style={[styles.chip, skills.includes(s) && styles.chipActive]}
                                    onPress={() => toggleItem(skills, setSkills, s)}
                                >
                                    <Text style={[styles.chipText, skills.includes(s) && styles.chipTextActive]}>
                                        {s}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                        {errors.skills && <Text style={styles.error}>{errors.skills}</Text>}
                    </View>

                    {/* Weaknesses */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📚 Areas to Improve</Text>
                        <Text style={styles.sectionDesc}>What would you like help with?</Text>
                        <View style={styles.chipGrid}>
                            {SKILLS_OPTIONS.map((s) => (
                                <Pressable
                                    key={s}
                                    style={[styles.chip, weaknesses.includes(s) && styles.chipActive]}
                                    onPress={() => toggleItem(weaknesses, setWeaknesses, s)}
                                >
                                    <Text style={[styles.chipText, weaknesses.includes(s) && styles.chipTextActive]}>
                                        {s}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Interests */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>✨ Interests</Text>
                        <Text style={styles.sectionDesc}>What topics excite you?</Text>
                        <View style={styles.chipGrid}>
                            {SKILLS_OPTIONS.map((s) => (
                                <Pressable
                                    key={s}
                                    style={[styles.chip, interests.includes(s) && styles.chipActiveSecondary]}
                                    onPress={() => toggleItem(interests, setInterests, s)}
                                >
                                    <Text style={[styles.chipText, interests.includes(s) && styles.chipTextActive]}>
                                        {s}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                        {errors.interests && <Text style={styles.error}>{errors.interests}</Text>}
                    </View>

                    {/* Submit */}
                    <View style={styles.submitSection}>
                        <Button
                            title="Complete Setup"
                            onPress={handleSubmit}
                            loading={isLoading}
                            fullWidth
                            size="lg"
                            icon={<Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />}
                        />
                    </View>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppColors.background },
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 60 },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },

    headerIcon: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: AppColors.surfaceLight,
        borderWidth: 1.5, borderColor: AppColors.border,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    greeting: {
        fontSize: 16, color: AppColors.primary,
        fontWeight: '600', marginBottom: 4,
    },
    title: {
        fontSize: 28, fontWeight: '900', color: AppColors.text,
        letterSpacing: -0.5, marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: 15, color: AppColors.textSecondary,
        lineHeight: 22, marginBottom: Spacing['2xl'],
    },

    form: { gap: Spacing.xl },

    section: { gap: 8 },
    sectionTitle: {
        fontSize: 16, fontWeight: '700', color: AppColors.text,
    },
    sectionDesc: {
        fontSize: 13, color: AppColors.textSecondary, marginBottom: 4,
    },
    label: {
        color: AppColors.textSecondary, fontSize: 13,
        fontWeight: '500', marginLeft: 2,
    },

    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radii.sm,
        borderWidth: 1, borderColor: AppColors.border,
        backgroundColor: AppColors.surface,
    },
    chipActive: {
        backgroundColor: AppColors.primary,
        borderColor: AppColors.primary,
    },
    chipActiveSecondary: {
        backgroundColor: '#6B8F71',
        borderColor: '#6B8F71',
    },
    chipText: { color: AppColors.textSecondary, fontSize: 13, fontWeight: '500' },
    chipTextActive: { color: '#FFFFFF', fontWeight: '700' },

    semRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    semBtn: {
        width: 42, height: 42, borderRadius: 12,
        borderWidth: 1, borderColor: AppColors.border,
        backgroundColor: AppColors.surface,
        alignItems: 'center', justifyContent: 'center',
    },
    semBtnActive: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
    semText: { color: AppColors.textSecondary, fontSize: 15, fontWeight: '600' },
    semTextActive: { color: '#FFFFFF' },

    divider: {
        height: 1, backgroundColor: AppColors.border,
        marginVertical: Spacing.sm,
    },

    error: {
        color: AppColors.error, fontSize: 12,
        fontWeight: '500', marginLeft: 2,
    },

    submitSection: {
        marginTop: Spacing.lg,
    },
});
