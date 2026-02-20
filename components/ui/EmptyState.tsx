import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppColors, Spacing } from '@/constants/theme';

type Props = {
    icon?: string;
    title: string;
    description?: string;
};

export function EmptyState({ icon = '🔍', title, description }: Props) {
    return (
        <View style={styles.container}>
            <Text style={styles.icon}>{icon}</Text>
            <Text style={styles.title}>{title}</Text>
            {description && <Text style={styles.description}>{description}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: Spacing['2xl'],
        gap: Spacing.sm,
    },
    icon: {
        fontSize: 40,
        marginBottom: Spacing.sm,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: AppColors.text,
        textAlign: 'center',
    },
    description: {
        fontSize: 14,
        color: AppColors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
});
