import { Radii } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
    label: string;
    variant?: 'primary' | 'subtle' | 'success' | 'warning' | 'error';
};

export function Badge({ label, variant = 'primary' }: Props) {
    const colors = useThemeColors();
    const VARIANT_MAP = {
        primary: { bg: colors.primary + '2E', text: colors.primary },
        subtle: { bg: colors.primary + '1A', text: colors.textSecondary },
        success: { bg: 'rgba(34,197,94,0.15)', text: colors.success },
        warning: { bg: 'rgba(217,119,6,0.15)', text: colors.warning },
        error: { bg: 'rgba(220,38,38,0.15)', text: colors.error },
    };
    const v = VARIANT_MAP[variant];
    return (
        <View style={[styles.badge, { backgroundColor: v.bg }]}>
            <Text style={[styles.text, { color: v.text }]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: Radii.sm,
    },
    text: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.3,
        textTransform: 'capitalize',
    },
});
