import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle, type TextStyle } from 'react-native';
import { AppColors, Radii, Spacing } from '@/constants/theme';

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

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
    primary: { bg: AppColors.primary, text: '#FFFFFF' },
    secondary: { bg: 'transparent', text: AppColors.primary, border: AppColors.primary },
    ghost: { bg: 'transparent', text: AppColors.textSecondary },
    danger: { bg: AppColors.error, text: '#FFFFFF' },
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
    const v = VARIANT_STYLES[variant];
    const s = SIZE_STYLES[size];

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled || loading}
            style={({ pressed }) => [
                styles.base,
                {
                    backgroundColor: v.bg,
                    paddingVertical: s.py,
                    paddingHorizontal: s.px,
                    borderWidth: v.border ? 1.5 : 0,
                    borderColor: v.border,
                    opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
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
