import StepProgress from '@/components/ui/StepProgress';
import { PROGRAMS, SEMESTERS } from '@/constants/categories';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

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

  const content = (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.statusSpacer} />

        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={AppColors.text} />
          <Text style={styles.backText}>Go Back</Text>
        </Pressable>

        <StepProgress currentStep={2} />

        <Text style={styles.step}>Step 2 of 3</Text>
        <Text style={styles.title}>Academic Info</Text>
        <Text style={styles.subtitle}>
          Help us verify your campus identity.
        </Text>

        <View style={styles.form}>
          {/* Full Name */}
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#888"
            value={displayName}
            onChangeText={setDisplayName}
          />
          {errors.displayName && (
            <Text style={styles.error}>{errors.displayName}</Text>
          )}

          {/* Program Chips */}
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

          {/* Major */}
          <TextInput
            style={styles.input}
            placeholder="Major / Focus Area"
            placeholderTextColor="#888"
            value={major}
            onChangeText={setMajor}
          />
          {errors.major && (
            <Text style={styles.error}>{errors.major}</Text>
          )}

          {/* Semester Picker */}
          <View style={{ gap: 6 }}>
            <Text style={styles.label}>Semester</Text>

            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={semester}
                onValueChange={(value) =>
                  setSemester(String(value))
                }
                style={styles.picker}
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

          <Pressable style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>Continue</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ✅ Web: no Touchable wrapper
  if (Platform.OS === 'web') {
    return content;
  }

  // ✅ Mobile: tap outside dismisses keyboard
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      {content}
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },

  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },

  statusSpacer: {
    height: Platform.OS === 'ios' ? 54 : 36,
  },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xl,
  },

  backText: {
    color: AppColors.text,
    fontWeight: '600',
  },

  step: {
    fontSize: 12,
    color: AppColors.primary,
    marginBottom: 6,
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: AppColors.text,
  },

  subtitle: {
    fontSize: 15,
    color: AppColors.textSecondary,
    marginBottom: Spacing['3xl'],
  },

  form: { gap: 16 },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: AppColors.text,
  },

  label: {
    color: AppColors.textSecondary,
    fontWeight: '500',
  },

  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

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
  },

  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  pickerWrapper: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 10,
    backgroundColor: AppColors.surface,
  },

  picker: {
    width: '100%',
  },

  button: {
    height: 50,
    backgroundColor: AppColors.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },

  error: {
    color: AppColors.error,
    fontSize: 12,
  },
});