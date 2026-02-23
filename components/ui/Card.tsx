import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { StarRating } from './StarRating';

type Props = {
    title: string;
    userName: string;
    userAvatar?: string;
    category: string;
    description: string;
    credits: number;
    rating: number;
    availability: 'available' | 'busy' | 'offline';
    onPress?: () => void;
    onConnect?: () => void;
    style?: ViewStyle;
};

const AVAILABILITY_COLOR: Record<string, string> = {
    available: AppColors.success,
    busy: AppColors.warning,
    offline: AppColors.error,
};

export function Card({
    title, userName, userAvatar, category, description,
    credits, rating, availability, onPress, onConnect, style,
}: Props) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.card,
                pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
                style,
            ]}
        >
            {/* Header */}
            <View style={styles.header}>
                <Avatar name={userName} uri={userAvatar} size={42} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.title} numberOfLines={1}>{title}</Text>
                    <View style={styles.meta}>
                        <Text style={styles.userName}>{userName}</Text>
                        <View style={[styles.dot, { backgroundColor: AVAILABILITY_COLOR[availability] }]} />
                    </View>
                </View>
                <Badge label={`${credits} cr`} variant="primary" />
            </View>

            {/* Description */}
            <Text style={styles.description} numberOfLines={2}>{description}</Text>

            {/* Footer */}
            <View style={styles.footer}>
                <View style={styles.footerLeft}>
                    <Badge label={category} variant="subtle" />
                    {rating > 0 && <StarRating rating={rating} size={12} />}
                </View>
                {onConnect && (
                    <Pressable style={styles.connectBtn} onPress={onConnect}>
                        <Text style={styles.connectText}>Connect</Text>
                        <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                    </Pressable>
                )}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: AppColors.surfaceLight,
        borderWidth: 1,
        borderColor: AppColors.border,
        borderRadius: Radii.lg,
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: AppColors.text,
        marginBottom: 2,
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    userName: {
        fontSize: 13,
        color: AppColors.textSecondary,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    description: {
        fontSize: 13,
        color: AppColors.textSecondary,
        lineHeight: 20,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    footerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    connectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: AppColors.primary,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: Radii.sm,
    },
    connectText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
});
