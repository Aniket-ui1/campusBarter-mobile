import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, CATEGORY_COLORS, CATEGORY_EMOJIS, Radii, Shadows, Spacing } from '@/constants/theme';
import { Avatar } from './Avatar';

type Props = {
    title: string;
    userName: string;
    userAvatar?: string;
    category?: string;
    description: string;
    credits: number;
    rating?: number;
    availability?: 'available' | 'busy' | 'offline';
    createdAt?: string;
    onPress?: () => void;
    onConnect?: () => void;
    style?: ViewStyle;
};

function timeAgo(dateStr?: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const AVAIL_DOT: Record<string, string> = {
    available: AppColors.success,
    busy: AppColors.warning,
    offline: AppColors.error,
};

export function Card({
    title, userName, userAvatar, category, description,
    credits, rating, availability, createdAt, onPress, onConnect, style,
}: Props) {
    const catColor = CATEGORY_COLORS[category ?? ''] ?? AppColors.primary;
    const catEmoji = CATEGORY_EMOJIS[category ?? ''] ?? '✨';

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${title} by ${userName}, ${credits} credits`}
            style={({ pressed }) => [
                styles.card,
                pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
                style,
            ]}
        >
            {/* Category accent strip */}
            <View style={[styles.accentStrip, { backgroundColor: catColor }]} />

            {/* Body */}
            <View style={styles.body}>
                {/* Header row */}
                <View style={styles.header}>
                    <Avatar name={userName} uri={userAvatar} size={40} />
                    <View style={{ flex: 1 }}>
                        <View style={styles.nameRow}>
                            <Text style={styles.userName}>{userName}</Text>
                            {availability && (
                                <View
                                    style={[styles.availDot, { backgroundColor: AVAIL_DOT[availability] }]}
                                    accessibilityLabel={`Status: ${availability}`}
                                />
                            )}
                        </View>
                        {createdAt ? (
                            <Text style={styles.timeText}>{timeAgo(createdAt)}</Text>
                        ) : null}
                    </View>
                    {/* Credit pill */}
                    <View style={styles.creditPill} accessibilityLabel={`${credits} credits`}>
                        <Text style={styles.creditIcon}>🪙</Text>
                        <Text style={styles.creditText}>{credits}</Text>
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title} numberOfLines={2}>
                    {catEmoji} {title}
                </Text>

                {/* Description */}
                <Text style={styles.description} numberOfLines={2}>{description}</Text>

                {/* Footer */}
                <View style={styles.footer}>
                    <View style={styles.footerLeft}>
                        {category && (
                            <View style={[styles.catBadge, { backgroundColor: catColor + '15', borderColor: catColor + '30' }]}>
                                <Text style={[styles.catBadgeText, { color: catColor }]}>{category}</Text>
                            </View>
                        )}
                        {(rating ?? 0) > 0 && (
                            <View style={styles.ratingRow} accessibilityLabel={`Rating ${rating?.toFixed(1)} out of 5`}>
                                <Ionicons name="star" size={12} color="#F59E0B" />
                                <Text style={styles.ratingText}>{rating?.toFixed(1)}</Text>
                            </View>
                        )}
                    </View>

                    {onConnect && (
                        <Pressable
                            style={({ pressed }) => [styles.connectBtn, pressed && { opacity: 0.85 }]}
                            onPress={onConnect}
                            accessibilityRole="button"
                            accessibilityLabel={`View ${title}`}
                        >
                            <Text style={styles.connectText}>View</Text>
                            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                        </Pressable>
                    )}
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: Radii.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: AppColors.border,
        ...Shadows.md,
    } as any,
    accentStrip: {
        height: 4,
        width: '100%',
    },
    body: {
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    userName: {
        fontSize: 14,
        fontWeight: '600',
        color: AppColors.textSecondary,
    },
    availDot: {
        width: 7, height: 7, borderRadius: 4,
    },
    timeText: {
        fontSize: 11,
        color: AppColors.textMuted,
        marginTop: 1,
    },
    creditPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: AppColors.primary + '12',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: Radii.full,
        borderWidth: 1,
        borderColor: AppColors.primary + '25',
    },
    creditIcon: { fontSize: 13 },
    creditText: {
        fontSize: 14,
        fontWeight: '800',
        color: AppColors.primary,
    },
    title: {
        fontSize: 17,
        fontWeight: '800',
        color: AppColors.text,
        letterSpacing: -0.3,
        lineHeight: 23,
    },
    description: {
        fontSize: 13,
        color: AppColors.textSecondary,
        lineHeight: 19,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    footerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    catBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
    },
    catBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: '700',
        color: AppColors.text,
    },
    connectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: AppColors.primary,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: Radii.sm,
    },
    connectText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
});
