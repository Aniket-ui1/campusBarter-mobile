import { Radii } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
    Easing,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

type Props = {
    icon?: string;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
};

export function EmptyState({ icon = '🔍', title, description, actionLabel, onAction }: Props) {
    const colors = useThemeColors();
    const bounce = useSharedValue(0);

    useEffect(() => {
        bounce.value = withDelay(
            300,
            withRepeat(
                withSequence(
                    withTiming(-8, { duration: 600, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
                ),
                -1,
                true,
            ),
        );
    }, []);

    const iconAnim = useAnimatedStyle(() => ({
        transform: [{ translateY: bounce.value }],
    }));

    return (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.container}>
            <Animated.View style={iconAnim}>
                <Text style={styles.icon}>{icon}</Text>
            </Animated.View>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            {description && (
                <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
            )}
            {actionLabel && onAction && (
                <Pressable
                    onPress={onAction}
                    style={({ pressed }) => [
                        styles.actionBtn,
                        { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                    ]}
                >
                    <Text style={styles.actionText}>{actionLabel}</Text>
                </Pressable>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 24,
        gap: 10,
    },
    icon: {
        fontSize: 48,
        marginBottom: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    description: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
    },
    actionBtn: {
        marginTop: 12,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: Radii.sm,
    },
    actionText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
});
