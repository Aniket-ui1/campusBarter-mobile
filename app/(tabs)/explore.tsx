import { Redirect } from 'expo-router';

/**
 * This screen is hidden from the tab bar (href: null in _layout.tsx).
 * It exists only because Expo Router requires the file for the registered route.
 * All explore content is now in (tabs)/index.tsx.
 */
export default function ExploreScreen() {
  return <Redirect href="/(tabs)" />;
}
