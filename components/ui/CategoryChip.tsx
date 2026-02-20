import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppColors, Radii, Spacing } from '@/constants/theme';

type Props = {
    label: string;
    icon?: string;
    active?: boolean;
    onPress?: () => void;
};

export function CategoryChip({ label, icon, active, onPress }: Props) {
    return (
        <Pressable
            onPress={onPress}
            style={[styles.chip, active && styles.chipActive]}
        >
            {icon && <Text style={{ fontSize: 14 }}>{icon}</Text>}
            <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: Radii.full,
        borderWidth: 1,
        borderColor: AppColors.border,
        backgroundColor: AppColors.surface,
    },
    chipActive: {
        backgroundColor: AppColors.primary,
        borderColor: AppColors.primary,
    },
    text: {
        color: AppColors.textSecondary,
        fontSize: 13,
        fontWeight: '500',
    },
    textActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
});
