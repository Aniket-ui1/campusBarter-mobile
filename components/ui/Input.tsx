import { Radii, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

type Props = TextInputProps & {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
    containerStyle?: ViewStyle;
};

export function Input({ label, error, icon, containerStyle, style, ...rest }: Props) {
    const [focused, setFocused] = useState(false);
    const colors = useThemeColors();

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
            <View
                style={[
                    styles.inputWrap,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    focused && { borderColor: colors.primary },
                    error ? { borderColor: colors.error } : undefined,
                ]}
            >
                {icon && <View style={styles.iconWrap}>{icon}</View>}
                <TextInput
                    style={[styles.input, { color: colors.text }, style]}
                    placeholderTextColor={colors.textMuted}
                    onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
                    onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
                    {...rest}
                />
            </View>
            {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 6 },
    label: {
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 2,
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: Radii.md,
        paddingHorizontal: Spacing.lg,
    },
    iconWrap: {
        marginRight: Spacing.sm,
    },
    input: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 14,
        ...Platform.select({ web: { outlineStyle: 'none' } as any }),
    },
    error: {
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 2,
    },
});
