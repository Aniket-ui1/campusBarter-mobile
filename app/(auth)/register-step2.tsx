import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PROGRAMS, SEMESTERS } from '@/constants/categories';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.statusSpacer} />

        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={AppColors.text} />
        </Pressable>

        {/* PROGRESS BAR */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <View style={[styles.progressFill, { width: '66%' }]} />
          </View>
        </View>

        <Animated.View entering={FadeInDown.duration(500)}>
          <Text style={styles.step}>Step 2 of 3</Text>
          <Text style={styles.title}>Academic Info</Text>
          <Text style={styles.subtitle}>
            Help us verify your campus identity.
          </Text>
        </Animated.View>

        <View style={styles.form}>
          <Input
            label="Full Name"
            placeholder="Your name"
            value={displayName}
            onChangeText={setDisplayName}
            error={errors.displayName}
            icon={
              <Ionicons
                name="person-outline"
                size={18}
                color={AppColors.textMuted}
              />
            }
          />

          {/* Program chips */}
          <View style={{ gap: 6 }}>
            <Text style={styles.label}>Program</Text>
            <View style={styles.chipGrid}>
              {PROGRAMS.map((p) => (
                <Pressable
                  key={p}
                  style={[
                    styles.chip,
                    program === p && styles.chipActive,
                  ]}
                  onPress={() => setProgram(p)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      program === p && styles.chipTextActive,
                    ]}
                  >
                    {p}
                  </Text>
                </Pressable>
              ))}
            </View>
            {errors.program && (
              <Text style={styles.error}>{errors.program}</Text>
            )}
          </View>

          <Input
            label="Major / Focus Area"
            placeholder="e.g. Full-Stack, UI/UX"
            value={major}
            onChangeText={setMajor}
            error={errors.major}
            icon={
              <Ionicons
                name="school-outline"
                size={18}
                color={AppColors.textMuted}
              />
            }
          />

          {/* SEMESTER DROPDOWN */}
          <View style={{ gap: 6 }}>
            <Text style={styles.label}>Semester</Text>

            <View style={styles.dropdownWrapper}>
              <Picker
                selectedValue={semester}
                onValueChange={(itemValue) =>
                  setSemester(String(itemValue))
                }
                style={styles.picker}
                dropdownIconColor={AppColors.textSecondary}
              >
                <Picker.Item label="Select your semester" value="" />
                {SEMESTERS.map((s) => (
                  <Picker.Item
                    key={s}
                    label={`Semester ${s}`}
                    value={String(s)}
                  />
                ))}
              </Picker>
            </View>

            {errors.semester && (
              <Text style={styles.error}>{errors.semester}</Text>
            )}
          </View>

          <Button
            title="Continue"
            onPress={handleNext}
            fullWidth
            size="lg"
          />
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: AppColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },

  /* PROGRESS BAR */
  progressContainer: {
    marginBottom: Spacing['2xl'],
  },
  progressBackground: {
    height: 8,
    width: '100%',
    backgroundColor: AppColors.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: AppColors.primary,
    borderRadius: 6,
  },

  step: {
    fontSize: 12,
    color: AppColors.primary,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 6,
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: AppColors.text,
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },

  subtitle: {
    fontSize: 15,
    color: AppColors.textSecondary,
    marginBottom: Spacing['3xl'],
  },

  form: { gap: Spacing.xl },

  label: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 2,
  },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: AppColors.border,
    backgroundColor: AppColors.surface,
  },

  chipActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },

  chipText: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },

  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  dropdownWrapper: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: Radii.md,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
  },

  picker: {
    height: 50,
    color: AppColors.text,
  },

  error: {
    color: AppColors.error,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 2,
  },
});