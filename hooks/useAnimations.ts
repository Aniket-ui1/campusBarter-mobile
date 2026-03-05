import { Platform } from 'react-native';
import {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring
} from 'react-native-reanimated';

/** Spring config for bouncy button press */
const PRESS_SPRING = { damping: 15, stiffness: 400, mass: 0.5 };

/**
 * Hook that provides animated press scale for any Pressable.
 * Usage:
 *   const { scale, animStyle, onPressIn, onPressOut } = usePressAnimation();
 *   <Animated.View style={animStyle}><Pressable onPressIn={onPressIn} onPressOut={onPressOut}...
 */
export function usePressAnimation(toScale = 0.96) {
  const scale = useSharedValue(1);

  const onPressIn = () => {
    scale.value = withSpring(toScale, PRESS_SPRING);
  };

  const onPressOut = () => {
    scale.value = withSpring(1, PRESS_SPRING);
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { scale, animStyle, onPressIn, onPressOut };
}

/**
 * Hook for a pop/bounce animation (e.g. favoriting, completing an action)
 */
export function usePopAnimation() {
  const scale = useSharedValue(1);

  const pop = () => {
    scale.value = withSequence(
      withSpring(1.3, { damping: 8, stiffness: 600 }),
      withSpring(1, { damping: 12, stiffness: 400 }),
    );
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { pop, animStyle };
}

/**
 * Trigger haptic feedback (light, medium, heavy)
 */
export async function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light') {
  if (Platform.OS === 'web') return;
  try {
    const Haptics = await import('expo-haptics');
    const map = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };
    await Haptics.impactAsync(map[type]);
  } catch {}
}

/** Success haptic */
export async function triggerSuccessHaptic() {
  if (Platform.OS === 'web') return;
  try {
    const Haptics = await import('expo-haptics');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}
}

/** Error haptic */
export async function triggerErrorHaptic() {
  if (Platform.OS === 'web') return;
  try {
    const Haptics = await import('expo-haptics');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {}
}
