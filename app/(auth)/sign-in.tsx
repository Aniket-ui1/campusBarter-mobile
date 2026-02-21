import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  const validate = () => {
    const e: typeof errors = {};

    if (!email.trim()) e.email = 'Email is required';
    else if (!email.toLowerCase().endsWith('@edu.sait.ca'))
      e.email = 'Must be a SAIT student email (@edu.sait.ca)';

    if (!password) e.password = 'Password is required';
    else if (password.length < 6)
      e.password = 'Password must be at least 6 characters';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignIn = async () => {
    if (!validate()) return;

    try {
      await signIn(email, password);
    } catch {
      setErrors({
        general: 'Invalid email or password. Please try again.',
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background Glow */}
      <View style={styles.backgroundGlow} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusSpacer} />

        {/* Back Button */}
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={AppColors.text} />
        </Pressable>

        {/* Logo */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          style={styles.logoSection}
        >
          <View style={styles.logoCircle}>
            <Ionicons name="globe-outline" size={28} color="#06b6d4" />
          </View>
        </Animated.View>

        {/* Card */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(500)}
          style={styles.card}
        >
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign into the SAIT Community
          </Text>

          {errors.general && (
            <View style={styles.errorBanner}>
              <Ionicons
                name="alert-circle"
                size={18}
                color={AppColors.error}
              />
              <Text style={styles.errorBannerText}>
                {errors.general}
              </Text>
            </View>
          )}

          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="your@edu.sait.ca"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
              icon={
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={AppColors.textMuted}
                />
              }
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
                icon={
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={AppColors.textMuted}
                  />
                }
              />

              <Pressable
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={
                    showPassword
                      ? 'eye-off-outline'
                      : 'eye-outline'
                  }
                  size={20}
                  color={AppColors.textMuted}
                />
              </Pressable>
            </View>

            <Pressable
              onPress={() =>
                router.push('/(auth)/forgot-password')
              }
              style={styles.forgotRow}
            >
              <Text style={styles.forgotText}>
                Forgot password?
              </Text>
            </Pressable>

            <Button
              title="Sign In"
              onPress={handleSignIn}
              loading={isLoading}
              fullWidth
              size="lg"
            />
          </View>

          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>
              Don't have an account?{' '}
            </Text>
            <Pressable
              onPress={() =>
                router.push('/(auth)/register-step1')
              }
            >
              <Text style={styles.bottomLink}>
                Create one
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },

  backgroundGlow: {
    position: 'absolute',
    top: -150,
    alignSelf: 'center',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: 'rgba(16,185,129,0.08)',
  },

  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },

  statusSpacer: {
    height: Platform.OS === 'ios' ? 54 : 36,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: AppColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  },

  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },

  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ecfeff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    backgroundColor: AppColors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: AppColors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },

  subtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },

  form: {
    gap: Spacing.xl,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },

  errorBannerText: {
    color: AppColors.error,
    fontSize: 13,
    flex: 1,
  },

  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 40,
  },

  forgotRow: {
    alignSelf: 'flex-end',
  },

  forgotText: {
    color: AppColors.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing['2xl'],
  },

  bottomText: {
    color: AppColors.textSecondary,
    fontSize: 14,
  },

  bottomLink: {
    color: AppColors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});