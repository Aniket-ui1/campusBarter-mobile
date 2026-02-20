import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
    rating: number;
    size?: number;
    showValue?: boolean;
    maxStars?: number;
};

export function StarRating({ rating, size = 14, showValue = true, maxStars = 5 }: Props) {
    const stars = [];
    for (let i = 1; i <= maxStars; i++) {
        const name = i <= Math.floor(rating) ? 'star' : i <= rating + 0.5 ? 'star-half' : 'star-outline';
        stars.push(
            <Ionicons key={i} name={name} size={size} color="#FACC15" />
        );
    }

    return (
        <View style={styles.row}>
            {stars}
            {showValue && <Text style={[styles.value, { fontSize: size - 1 }]}>{rating.toFixed(1)}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    value: {
        color: '#FACC15',
        fontWeight: '600',
        marginLeft: 4,
    },
});
