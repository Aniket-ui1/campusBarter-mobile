import { Radii, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import React, { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

/** Shimmer pulse overlay */
function ShimmerBase({ style }: { style?: ViewStyle }) {
  const colors = useThemeColors();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.4, 0.8]),
  }));

  return (
    <Animated.View
      style={[
        { backgroundColor: colors.border, borderRadius: Radii.sm },
        style,
        animStyle,
      ]}
    />
  );
}

/** Skeleton for a single Card */
export function CardSkeleton() {
  return (
    <View style={styles.card}>
      <ShimmerBase style={styles.accentStrip} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <ShimmerBase style={styles.avatar} />
          <View style={{ flex: 1, gap: 6 }}>
            <ShimmerBase style={{ width: '60%', height: 12 }} />
            <ShimmerBase style={{ width: '35%', height: 10 }} />
          </View>
          <ShimmerBase style={{ width: 50, height: 26, borderRadius: 13 }} />
        </View>
        <ShimmerBase style={{ width: '85%', height: 16 }} />
        <ShimmerBase style={{ width: '100%', height: 12 }} />
        <ShimmerBase style={{ width: '70%', height: 12 }} />
        <View style={styles.footerRow}>
          <ShimmerBase style={{ width: 60, height: 22, borderRadius: 6 }} />
          <View style={{ flex: 1 }} />
          <ShimmerBase style={{ width: 70, height: 30, borderRadius: 8 }} />
        </View>
      </View>
    </View>
  );
}

/** Skeleton for a chat list item */
export function ChatSkeleton() {
  return (
    <View style={styles.chatRow}>
      <ShimmerBase style={styles.chatAvatar} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={styles.chatTopRow}>
          <ShimmerBase style={{ width: '55%', height: 14 }} />
          <ShimmerBase style={{ width: 40, height: 10 }} />
        </View>
        <ShimmerBase style={{ width: '80%', height: 12 }} />
      </View>
    </View>
  );
}

/** Skeleton for profile header */
export function ProfileSkeleton() {
  return (
    <View style={styles.profileWrap}>
      <ShimmerBase style={styles.profileAvatar} />
      <ShimmerBase style={{ width: 140, height: 18, alignSelf: 'center' }} />
      <ShimmerBase style={{ width: 180, height: 12, alignSelf: 'center' }} />
      <View style={styles.profileStats}>
        <ShimmerBase style={{ width: 50, height: 30 }} />
        <ShimmerBase style={{ width: 50, height: 30 }} />
        <ShimmerBase style={{ width: 50, height: 30 }} />
      </View>
    </View>
  );
}

/** Render N card skeletons */
export function CardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: Spacing.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );
}

/** Render N chat skeletons */
export function ChatSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <ChatSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginBottom: Spacing.md,
  },
  accentStrip: { height: 4, width: '100%', borderRadius: 0 },
  body: { padding: Spacing.lg, gap: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  footerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },

  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  chatAvatar: { width: 52, height: 52, borderRadius: 26 },
  chatTopRow: { flexDirection: 'row', justifyContent: 'space-between' },

  profileWrap: { gap: Spacing.md, paddingVertical: Spacing.xl, alignItems: 'center' },
  profileAvatar: { width: 80, height: 80, borderRadius: 40 },
  profileStats: { flexDirection: 'row', gap: Spacing['2xl'], marginTop: Spacing.md },
});
