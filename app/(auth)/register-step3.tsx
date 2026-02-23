import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import StepProgress from '@/components/ui/StepProgress';
import { AppColors, Spacing } from '@/constants/theme';
import { useAuth, type SignUpData } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
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

export default function RegisterStep3() {
  const router = useRouter();
  const { signUp, isLoading } = useAuth();

  const params = useLocalSearchParams<{
    email: string;
    password: string;
    displayName: string;
    program: string;
    major: string;
    semester: string;
  }>();

  const [bio, setBio] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [error, setError] = useState('');

  const handleFinish = async () => {
    if (!agreedTerms) {
      setError('You must accept the Terms & Privacy Policy.');
      return;
    }

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
    } catch {
      setError('Registration failed. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.statusSpacer} />

        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={AppColors.text} />
        </Pressable>

        <StepProgress currentStep={3} />

        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={styles.step}>Step 3 of 3</Text>
          <Text style={styles.title}>Almost there!</Text>
          <Text style={styles.subtitle}>
            Add a bio and accept our policies.
          </Text>
        </Animated.View>

        <View style={styles.form}>

          {/* 🔥 PROFILE PHOTO SECTION (RESTORED) */}
          <View style={styles.avatarSection}>
            <Pressable style={styles.avatarCircle}>
              <Ionicons
                name="camera-outline"
                size={28}
                color={AppColors.textMuted}
              />
            </Pressable>
            <Text style={styles.avatarHint}>
              Add a profile photo (optional)
            </Text>
          </View>
          <Input
            label="Bio (optional)"
            placeholder="Tell students about yourself..."
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
            style={{ minHeight: 80, textAlignVertical: 'top' }}
             />

          {/* Terms checkbox */}
          <Pressable
            style={styles.termsRow}
            onPress={() => setAgreedTerms(!agreedTerms)}
          >
            <View
              style={[
                styles.checkbox,
                agreedTerms && styles.checkboxChecked,
              ]}
            >
              {agreedTerms && (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              )}
            </View>

            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text
                style={styles.termsLink}
                onPress={() => router.push('/terms')}
              >
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text
                style={styles.termsLink}
                onPress={() => router.push('/privacy')}
              >
                Privacy Policy
              </Text>
            </Text>
          </Pressable>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <Button
            title="Create Account"
            onPress={handleFinish}
            loading={isLoading}
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

  step: {
    fontSize: 12,
    color: AppColors.primary,
    fontWeight: '600',
    marginBottom: 6,
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: AppColors.text,
    marginBottom: Spacing.xs,
  },

  subtitle: {
    fontSize: 15,
    color: AppColors.textSecondary,
    marginBottom: Spacing['3xl'],
  },

  form: { gap: Spacing.xl },

  avatarSection: {
    alignItems: 'center',
    gap: Spacing.sm,
  },

  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: AppColors.surface,
    borderWidth: 2,
    borderColor: AppColors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarHint: {
    color: AppColors.textMuted,
    fontSize: 13,
  },

  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: AppColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },

  checkboxChecked: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },

  termsText: {
    flex: 1,
    color: AppColors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },

  termsLink: {
    color: AppColors.primary,
    fontWeight: '600',
  },

  errorText: {
    color: AppColors.error,
    fontSize: 13,
    fontWeight: '500',
  },
});