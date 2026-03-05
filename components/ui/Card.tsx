import { CATEGORY_COLORS, CATEGORY_EMOJIS, Radii, Shadows, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { triggerHaptic, usePressAnimation } from '@/hooks/useAnimations';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
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

export function Card({
    title, userName, userAvatar, category, description,
    credits, rating, availability, createdAt, onPress, onConnect, style,
}: Props) {
    const colors = useThemeColors();
    const AVAIL_DOT: Record<string, string> = {
        available: colors.success,
        busy: colors.warning,
        offline: colors.error,
    };
    const { animStyle, onPressIn, onPressOut } = usePressAnimation(0.97);
    const catColor = CATEGORY_COLORS[category ?? ''] ?? colors.primary;
    const catEmoji = CATEGORY_EMOJIS[category ?? ''] ?? '✨';

    return (
        <Animated.View style={animStyle}>
            <Pressable
                onPress={() => { triggerHaptic('light'); onPress?.(); }}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                style={[
                    styles.card,
                    { backgroundColor: colors.card, borderColor: colors.border },
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
                            <Text style={[styles.userName, { color: colors.textSecondary }]}>{userName}</Text>
                            {availability && (
                                <View style={[styles.availDot, { backgroundColor: AVAIL_DOT[availability] }]} />
                            )}
                        </View>
                        {createdAt ? (
                            <Text style={[styles.timeText, { color: colors.textMuted }]}>{timeAgo(createdAt)}</Text>
                        ) : null}
                    </View>
                    {/* Credit pill */}
                    <View style={[styles.creditPill, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '25' }]}>
                        <Text style={styles.creditIcon}>🪙</Text>
                        <Text style={[styles.creditText, { color: colors.primary }]}>{credits}</Text>
                    </View>
                </View>

                {/* Title */}
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                    {catEmoji} {title}
                </Text>

                {/* Description */}
                <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>{description}</Text>

                {/* Footer */}
                <View style={styles.footer}>
                    <View style={styles.footerLeft}>
                        {category && (
                            <View style={[styles.catBadge, { backgroundColor: catColor + '15', borderColor: catColor + '30' }]}>
                                <Text style={[styles.catBadgeText, { color: catColor }]}>{category}</Text>
                            </View>
                        )}
                        {(rating ?? 0) > 0 && (
                            <View style={styles.ratingRow}>
                                <Ionicons name="star" size={12} color="#F59E0B" />
                                <Text style={[styles.ratingText, { color: colors.text }]}>{rating?.toFixed(1)}</Text>
                            </View>
                        )}
                    </View>

                    {onConnect && (
                        <Pressable
                            style={({ pressed }) => [styles.connectBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.85 }]}
                            onPress={() => { triggerHaptic('light'); onConnect(); }}
                        >
                            <Text style={styles.connectText}>View</Text>
                            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                        </Pressable>
                    )}
                </View>
            </View>
        </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: Radii.lg,
        overflow: 'hidden',
        borderWidth: 1,
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
    },
    availDot: {
        width: 7, height: 7, borderRadius: 4,
    },
    timeText: {
        fontSize: 11,
        marginTop: 1,
    },
    creditPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: Radii.full,
        borderWidth: 1,
    },
    creditIcon: { fontSize: 13 },
    creditText: {
        fontSize: 14,
        fontWeight: '800',
    },
    title: {
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: -0.3,
        lineHeight: 23,
    },
    description: {
        fontSize: 13,
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
    },
    connectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
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
