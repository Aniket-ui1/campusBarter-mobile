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

      {/* Soft glow background */}
      <View style={styles.blobTopLeft} />
      <View style={styles.blobBottomRight} />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(600)}
        style={styles.header}
      >
        <View style={styles.logoCircle}>
          <Ionicons name="globe-outline" size={34} color={AppColors.primary} />
        </View>

        <Text style={styles.title}>Welcome to Campus Barter</Text>
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
                size={20}
                color={AppColors.primary}
              />
            </View>

            <Text style={styles.cardTitle}>{feature.title}</Text>
            <Text style={styles.cardDesc}>{feature.desc}</Text>
          </Animated.View>
        ))}
      </Animated.View>

      {/* CTA Buttons */}
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

  blobTopLeft: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(107,143,113,0.08)',
  },

  blobBottomRight: {
    position: 'absolute',
    bottom: -100,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(52,86,53,0.08)',
  },

  header: {
    alignItems: 'center',
    marginTop: Spacing['2xl'],
    marginBottom: Spacing['2xl'],
  },

  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  title: {
    fontSize: 26,
    fontWeight: '900',
    color: AppColors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },

  subtitle: {
    fontSize: 15,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.lg,
    marginBottom: Spacing['2xl'],
  },

  card: {
    width: '48%',
    backgroundColor: AppColors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: AppColors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
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
    lineHeight: 18,
  },

  ctaSection: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
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