import { Radii, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { triggerHaptic, usePressAnimation } from '@/hooks/useAnimations';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type Props = {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: React.ReactNode;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    style?: ViewStyle;
};

const SIZE_STYLES: Record<ButtonSize, { py: number; px: number; fontSize: number }> = {
    sm: { py: 8, px: 14, fontSize: 13 },
    md: { py: 14, px: 20, fontSize: 15 },
    lg: { py: 18, px: 28, fontSize: 16 },
};

export function Button({
    title, onPress, variant = 'primary', size = 'md',
    icon, disabled, loading, fullWidth, style,
}: Props) {
    const colors = useThemeColors();
    const { animStyle, onPressIn, onPressOut } = usePressAnimation(0.97);
    const s = SIZE_STYLES[size];

    const VARIANT_STYLES: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
        primary: { bg: colors.primary, text: '#FFFFFF' },
        secondary: { bg: 'transparent', text: colors.primary, border: colors.primary },
        ghost: { bg: 'transparent', text: colors.textSecondary },
        danger: { bg: colors.error, text: '#FFFFFF' },
    };

    const v = VARIANT_STYLES[variant];

    return (
        <Animated.View style={animStyle}>
            <Pressable
                onPress={() => { triggerHaptic('light'); onPress(); }}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                disabled={disabled || loading}
                style={[
                    styles.base,
                    {
                        backgroundColor: v.bg,
                        paddingVertical: s.py,
                        paddingHorizontal: s.px,
                        borderWidth: v.border ? 1.5 : 0,
                        borderColor: v.border,
                        opacity: disabled ? 0.5 : 1,
                    },
                    fullWidth && { width: '100%' as any },
                    style,
                ]}
            >
                {loading ? (
                    <ActivityIndicator size="small" color={v.text} />
                ) : (
                    <>
                        {icon}
                        <Text style={[styles.text, { color: v.text, fontSize: s.fontSize }]}>{title}</Text>
                    </>
                )}
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        borderRadius: Radii.md,
    },
    text: {
        fontWeight: '600',
        letterSpacing: 0.2,
    },
});
