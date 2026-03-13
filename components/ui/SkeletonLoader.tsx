// components/ui/SkeletonLoader.tsx
// ─────────────────────────────────────────────────────────────────
// Animated shimmer placeholder displayed while content is loading.
// Supports card, line, and circle variants.
// ─────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { AppColors, Radii, Spacing } from '@/constants/theme';

type SkeletonVariant = 'card' | 'line' | 'circle' | 'profileCard';

type Props = {
    variant?: SkeletonVariant;
    width?: number | string;
    height?: number;
    borderRadius?: number;
    count?: number;
    style?: ViewStyle;
};

function ShimmerBlock({
    width = '100%',
    height = 16,
    borderRadius = Radii.sm,
    style,
}: {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}) {
    const shimmer = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmer, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [shimmer]);

    return (
        <Animated.View
            accessibilityLabel="Loading"
            accessibilityRole="progressbar"
            style={[
                styles.block,
                {
                    width: width as any,
                    height,
                    borderRadius,
                    opacity: shimmer,
                },
                style,
            ]}
        />
    );
}

function CardSkeleton() {
    return (
        <View style={styles.card} accessibilityLabel="Loading listing card">
            <View style={styles.cardHeader}>
                <ShimmerBlock width={40} height={40} borderRadius={20} />
                <View style={{ flex: 1, gap: 6 }}>
                    <ShimmerBlock width="60%" height={14} />
                    <ShimmerBlock width="30%" height={10} />
                </View>
                <ShimmerBlock width={50} height={28} borderRadius={Radii.full} />
            </View>
            <ShimmerBlock height={18} style={{ marginTop: Spacing.md }} />
            <ShimmerBlock width="80%" height={14} style={{ marginTop: 6 }} />
            <ShimmerBlock width="50%" height={14} style={{ marginTop: 6 }} />
        </View>
    );
}

function ProfileCardSkeleton() {
    return (
        <View style={styles.profileCard} accessibilityLabel="Loading profile">
            <ShimmerBlock width={80} height={80} borderRadius={40} />
            <ShimmerBlock width={160} height={20} style={{ marginTop: Spacing.md }} />
            <ShimmerBlock width={100} height={14} />
            <View style={styles.profileStats}>
                <ShimmerBlock width={60} height={40} borderRadius={Radii.sm} />
                <ShimmerBlock width={60} height={40} borderRadius={Radii.sm} />
            </View>
        </View>
    );
}

export function SkeletonLoader({
    variant = 'card',
    width,
    height = 16,
    borderRadius,
    count = 1,
    style,
}: Props) {
    if (variant === 'circle') {
        const size = height;
        return (
            <View style={style}>
                {Array.from({ length: count }).map((_, i) => (
                    <ShimmerBlock
                        key={i}
                        width={size}
                        height={size}
                        borderRadius={size / 2}
                    />
                ))}
            </View>
        );
    }

    if (variant === 'profileCard') {
        return <ProfileCardSkeleton />;
    }

    if (variant === 'card') {
        return (
            <View style={[{ gap: Spacing.md }, style]}>
                {Array.from({ length: count }).map((_, i) => (
                    <CardSkeleton key={i} />
                ))}
            </View>
        );
    }

    // line variant
    return (
        <View style={[{ gap: 8 }, style]}>
            {Array.from({ length: count }).map((_, i) => (
                <ShimmerBlock
                    key={i}
                    width={width}
                    height={height}
                    borderRadius={borderRadius}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    block: {
        backgroundColor: AppColors.surface,
    },
    card: {
        backgroundColor: AppColors.surfaceLight,
        borderRadius: Radii.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    profileCard: {
        backgroundColor: AppColors.surfaceLight,
        borderRadius: Radii.lg,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: AppColors.border,
        alignItems: 'center',
        gap: Spacing.sm,
    },
    profileStats: {
        flexDirection: 'row',
        gap: Spacing.xl,
        marginTop: Spacing.md,
    },
});
