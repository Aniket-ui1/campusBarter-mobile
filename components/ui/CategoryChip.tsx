import { Radii } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
    label: string;
    icon?: string;
    active?: boolean;
    onPress?: () => void;
};

export function CategoryChip({ label, icon, active, onPress }: Props) {
    const colors = useThemeColors();
    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.chip,
                { borderColor: colors.border, backgroundColor: colors.surface },
                active && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
        >
            {icon && <Text style={{ fontSize: 14 }}>{icon}</Text>}
            <Text style={[styles.text, { color: colors.textSecondary }, active && { color: '#FFFFFF', fontWeight: '700' }]}>{label}</Text>
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
    },
    text: {
        fontSize: 13,
        fontWeight: '500',
    },
});
