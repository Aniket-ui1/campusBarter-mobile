import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { AppColors, Radii, Spacing } from '@/constants/theme';

type Props = TextInputProps & {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
    containerStyle?: ViewStyle;
};

export function Input({ label, error, icon, containerStyle, style, ...rest }: Props) {
    const [focused, setFocused] = useState(false);

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View
                style={[
                    styles.inputWrap,
                    focused && styles.inputFocused,
                    error ? styles.inputError : undefined,
                ]}
            >
                {icon && <View style={styles.iconWrap}>{icon}</View>}
                <TextInput
                    style={[styles.input, style]}
                    placeholderTextColor={AppColors.textMuted}
                    onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
                    onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
                    {...rest}
                />
            </View>
            {error && <Text style={styles.error}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 6 },
    label: {
        color: AppColors.textSecondary,
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 2,
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: AppColors.surface,
        borderWidth: 1.5,
        borderColor: AppColors.border,
        borderRadius: Radii.md,
        paddingHorizontal: Spacing.lg,
    },
    inputFocused: {
        borderColor: AppColors.primary,
    },
    inputError: {
        borderColor: AppColors.error,
    },
    iconWrap: {
        marginRight: Spacing.sm,
    },
    input: {
        flex: 1,
        color: AppColors.text,
        fontSize: 15,
        paddingVertical: 14,
    },
    error: {
        color: AppColors.error,
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 2,
    },
});
