import { Spacing } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import React, { ReactNode } from 'react';
import { Platform, RefreshControlProps, StyleSheet, View } from 'react-native';
import Animated, {
    Extrapolation,
    interpolate,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';

const HEADER_MAX = 200;
const HEADER_MIN = 90;
const STATUS_HEIGHT = Platform.OS === 'ios' ? 54 : 36;

type Props = {
  /** Full hero content (shown when expanded) */
  heroContent: ReactNode;
  /** Compact content (shown when collapsed — e.g. search bar) */
  compactContent: ReactNode;
  /** Scroll body content */
  children: ReactNode;
  /** Refresh control element */
  refreshControl?: React.ReactElement<RefreshControlProps>;
};

/**
 * AnimatedHeader collapses a hero banner into a compact sticky header on scroll.
 */
export function AnimatedHeader({ heroContent, compactContent, children, refreshControl }: Props) {
  const colors = useThemeColors();
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, HEADER_MAX - HEADER_MIN],
      [HEADER_MAX, HEADER_MIN],
      Extrapolation.CLAMP,
    );
    return { height };
  });

  const heroStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, (HEADER_MAX - HEADER_MIN) * 0.6],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [0, HEADER_MAX - HEADER_MIN],
      [0, -20],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ translateY }] };
  });

  const compactStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [(HEADER_MAX - HEADER_MIN) * 0.5, HEADER_MAX - HEADER_MIN],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Animated header */}
      <Animated.View style={[styles.header, { backgroundColor: colors.primaryDark }, headerStyle]}>
        <View style={{ height: STATUS_HEIGHT }} />
        {/* Hero (fades out) */}
        <Animated.View style={[styles.heroWrap, heroStyle]}>
          {heroContent}
        </Animated.View>
        {/* Compact (fades in) */}
        <Animated.View style={[styles.compactWrap, compactStyle]}>
          {compactContent}
        </Animated.View>
      </Animated.View>

      {/* Scrollable body */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        {/* Spacer for content below header */}
        <View style={{ height: HEADER_MAX - HEADER_MIN }} />
        {children}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heroWrap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 36,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  compactWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  scrollContent: {
    paddingTop: HEADER_MAX,
    paddingBottom: 40,
  },
});
