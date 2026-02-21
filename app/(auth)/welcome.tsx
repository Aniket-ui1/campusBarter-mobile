import { Button } from '@/components/ui/Button';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const FEATURES = [
  { icon: 'book-outline', title: 'Post Skills', desc: 'Share what you can teach' },
  { icon: 'search-outline', title: 'Find Help', desc: 'Browse student offerings' },
  { icon: 'repeat-outline', title: 'Exchange', desc: 'Trade with time credits' },
  { icon: 'star-outline', title: 'Build Rep', desc: 'Earn ratings & reviews' },
];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.statusSpacer} />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(600)}
        style={styles.header}
      >
        <View style={styles.logoCircle}>
          <Ionicons name="globe-outline" size={36} color={AppColors.primary} />
        </View>

        <Text style={styles.title}>Welcome to Campus Barter!</Text>
        <Text style={styles.subtitle}>Trade skills, not cash</Text>
      </Animated.View>

      {/* Features */}
      <Animated.View
        entering={FadeInDown.delay(250).duration(600)}
        style={styles.grid}
      >
        {FEATURES.map((feature, index) => (
          <Animated.View
            key={feature.title}
            entering={FadeInDown.delay(350 + index * 100).duration(500)}
            style={styles.card}
          >
            <View style={styles.iconWrapper}>
              <Ionicons
                name={feature.icon as any}
                size={22}
                color={AppColors.primary}
              />
            </View>

            <Text style={styles.cardTitle}>{feature.title}</Text>
            <Text style={styles.cardDesc}>{feature.desc}</Text>
          </Animated.View>
        ))}
      </Animated.View>

      {/* Buttons */}
      <Animated.View
        entering={FadeInDown.delay(700).duration(600)}
        style={styles.ctaSection}
      >
        <Button
          title="Sign In"
          onPress={() => router.push('/(auth)/sign-in')}
          fullWidth
          size="lg"
        />

        <Pressable
          onPress={() => router.push('/(auth)/register-step1')}
          style={styles.createButton}
        >
          <Text style={styles.createText}>Create Account</Text>
        </Pressable>
      </Animated.View>

      {/* Footer Links */}
      <Animated.View
        entering={FadeInDown.delay(850).duration(400)}
        style={styles.footer}
      >
        <Pressable onPress={() => router.push('/terms')}>
          <Text style={styles.footerText}>Terms</Text>
        </Pressable>

        <Text style={styles.dot}>·</Text>

        <Pressable onPress={() => router.push('/privacy')}>
          <Text style={styles.footerText}>Privacy</Text>
        </Pressable>

        <Text style={styles.dot}>·</Text>

        <Pressable onPress={() => router.push('/about')}>
          <Text style={styles.footerText}>About</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
    paddingHorizontal: Spacing.xl,
  },

  statusSpacer: {
    height: Platform.OS === 'ios' ? 60 : 40,
  },

  header: {
    alignItems: 'center',
    marginTop: Spacing['3xl'],
    marginBottom: Spacing['3xl'],
  },

  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AppColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: AppColors.border,
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: AppColors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },

  subtitle: {
    fontSize: 16,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing['3xl'],
  },

  card: {
    width: '48%',
    backgroundColor: AppColors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: AppColors.border,
  },

  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: AppColors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },

  cardTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: AppColors.text,
    marginBottom: 4,
  },

  cardDesc: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },

  ctaSection: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },

  createButton: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },

  createText: {
    fontSize: 14,
    color: AppColors.primary,
    fontWeight: '600',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  footerText: {
    fontSize: 13,
    color: AppColors.textMuted,
  },

  dot: {
    color: AppColors.textMuted,
  },
});