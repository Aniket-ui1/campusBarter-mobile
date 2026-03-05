import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColors } from '@/context/ThemeContext';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'muted';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const colors = useThemeColors();

  return (
    <Text
      style={[
        { color },
        type === 'default' ? [styles.default, { color: colors.cream }] : undefined,
        type === 'title' ? [styles.title, { color: colors.cream }] : undefined,
        type === 'defaultSemiBold' ? [styles.defaultSemiBold, { color: colors.cream }] : undefined,
        type === 'subtitle' ? [styles.subtitle, { color: colors.cream }] : undefined,
        type === 'link' ? [styles.link, { color: colors.sage }] : undefined,
        type === 'muted' ? [styles.muted, { color: colors.mist }] : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 38,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
  },
  muted: {
    fontSize: 14,
    lineHeight: 20,
  },
});
