import { Button } from '@/components/ui/Button';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
} from 'react-native-reanimated';

const FEATURES = [
  {
    icon: 'book-outline',
    title: 'Post Skills',
    desc: 'Share what you can teach',
    tint: 'rgba(59,130,246,0.12)',
  },
  {
    icon: 'search-outline',
    title: 'Find Help',
    desc: 'Browse student offerings',
    tint: 'rgba(16,185,129,0.12)',
  },
  {
    icon: 'repeat-outline',
    title: 'Exchange',
    desc: 'Trade with time credits',
    tint: 'rgba(234,179,8,0.15)',
  },
  {
    icon: 'star-outline',
    title: 'Build Rep',
    desc: 'Earn ratings & reviews',
    tint: 'rgba(168,85,247,0.15)',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.statusSpacer} />

      {/* Stronger glow background */}
      <View style={styles.blobTopLeft} />
      <View style={styles.blobBottomRight} />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(600)}
        style={styles.header}
      >
        <View style={styles.logoCircle}>
          <Ionicons
            name="globe-outline"
            size={32}
            color={AppColors.primary}
          />
        </View>

        <Text style={styles.title}>
          Turn Your Skills Into Opportunity
        </Text>
        <Text style={styles.subtitle}>
          Connect. Teach. Learn. Grow.
        </Text>
      </Animated.View>

      {/* Feature Cards with stagger + interaction */}
      <View style={styles.grid}>
        {FEATURES.map((feature, index) => (
          <Animated.View
            key={feature.title}
            entering={FadeInDown.delay(250 + index * 120).duration(600)}
            style={{ width: '48%' }}
          >
            <Pressable
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
            >
              <View
                style={[
                  styles.iconWrapper,
                  { backgroundColor: feature.tint },
                ]}
              >
                <Ionicons
                  name={feature.icon as any}
                  size={20}
                  color={AppColors.primary}
                />
              </View>

              <Text style={styles.cardTitle}>
                {feature.title}
              </Text>

              <Text style={styles.cardDesc}>
                {feature.desc}
              </Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>

      {/* CTA Section */}
      <Animated.View
        entering={FadeInDown.delay(800).duration(600)}
        style={styles.ctaSection}
      >
        <Button
          title="Create Account"
          onPress={() =>
            router.push('/(auth)/register-step1')
          }
          fullWidth
          size="lg"
        />

        <Pressable
          onPress={() =>
            router.push('/(auth)/sign-in')
          }
          style={styles.secondaryBtn}
        >
          <Text style={styles.secondaryText}>
            Already have an account? Sign In
          </Text>
        </Pressable>
      </Animated.View>

      {/* Footer */}
      <Animated.View
        entering={FadeInDown.delay(950).duration(400)}
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

    // Web preview constraint
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },

  statusSpacer: {
    height: Platform.OS === 'ios' ? 60 : 40,
  },

  blobTopLeft: {
    position: 'absolute',
    top: -100,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(107,143,113,0.16)',
  },

  blobBottomRight: {
    position: 'absolute',
    bottom: -100,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(52,86,53,0.14)',
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
    elevation: 6,
  },

  title: {
    fontSize: 24,
    fontWeight: '900',
    color: AppColors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },

  subtitle: {
    fontSize: 14,
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
    backgroundColor: AppColors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: AppColors.border,
    elevation: 4,
  },

  cardPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },

  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
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

  secondaryBtn: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },

  secondaryText: {
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