import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppColors, Radii } from '@/constants/theme';

type Props = {
    name: string;
    uri?: string;
    size?: number;
};

function getInitials(name: string): string {
    return name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();
}

function hashColor(name: string): string {
    const gradients = ['#6B8F71', '#345635', '#4A7C59', '#22C55E', '#8FA888', '#A0B89A'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return gradients[Math.abs(hash) % gradients.length];
}

export function Avatar({ name, uri, size = 40 }: Props) {
    // For now, always show initials (no image loading)
    const bg = hashColor(name);
    const fontSize = size * 0.38;

    return (
        <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
            <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    avatar: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    initials: {
        color: '#FFFFFF',
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
