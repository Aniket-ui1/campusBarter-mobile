/**
 * Theme color hook — defaults to dark (forest) theme.
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  // Always use dark forest theme as default
  const rawTheme = useColorScheme();
  const theme: 'light' | 'dark' = (rawTheme === 'light' || rawTheme === 'dark') ? rawTheme : 'dark';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}
