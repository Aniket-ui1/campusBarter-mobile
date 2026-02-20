import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppColors, Radii, Spacing } from '@/constants/theme';

type Props = {
    label: string;
    variant?: 'primary' | 'subtle' | 'success' | 'warning' | 'error';
};

const VARIANT_MAP = {
    primary: { bg: 'rgba(107,143,113,0.18)', text: AppColors.primary },
    subtle: { bg: 'rgba(107,143,113,0.10)', text: AppColors.textSecondary },
    success: { bg: 'rgba(34,197,94,0.15)', text: AppColors.success },
    warning: { bg: 'rgba(217,119,6,0.15)', text: AppColors.warning },
    error: { bg: 'rgba(220,38,38,0.15)', text: AppColors.error },
};

export function Badge({ label, variant = 'primary' }: Props) {
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
