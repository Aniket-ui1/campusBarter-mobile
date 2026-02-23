import StepProgress from '@/components/ui/StepProgress';
import { AppColors, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

export default function RegisterStep1() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};

    if (!email.toLowerCase().endsWith('@edu.sait.ca'))
      e.email = 'Must be a SAIT student email (@edu.sait.ca)';

    if (password.length < 8)
      e.password = 'Minimum 8 characters';

    if (password !== confirm)
      e.confirm = 'Passwords do not match';

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

        <Pressable
          style={styles.backBtn}
          onPress={() => router.replace('/(auth)/welcome')}
        >
          <Ionicons name="arrow-back" size={22} color={AppColors.text} />
          <Text style={styles.backText}>Go Back</Text>
        </Pressable>

        <StepProgress currentStep={1} />

        <Text style={styles.step}>Step 1 of 3</Text>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>
          Start with your email and a secure password.
        </Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="you@edu.sait.ca"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && <Text style={styles.error}>{errors.email}</Text>}

          <TextInput
            style={styles.input}
            placeholder="Min 8 characters"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {errors.password && <Text style={styles.error}>{errors.password}</Text>}

          <TextInput
            style={styles.input}
            placeholder="Re-enter password"
            placeholderTextColor="#888"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
          />
          {errors.confirm && <Text style={styles.error}>{errors.confirm}</Text>}

          <Pressable style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>Continue</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ✅ Web should NOT use TouchableWithoutFeedback
  if (Platform.OS === 'web') {
    return content;
  }

  // ✅ Mobile uses it so tapping outside dismisses keyboard
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      {content}
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
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
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: AppColors.textSecondary,
    marginBottom: Spacing['3xl'],
  },
  form: {
    gap: 16,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: AppColors.text,
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