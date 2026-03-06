// components/OfflineBanner.tsx
// ─────────────────────────────────────────────────────────────────
// Renders a slim banner at the top of the app when the device is
// offline. Uses React Native's built-in NetInfo-like approach via
// fetch polling to avoid requiring an extra native module.
// ─────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, Spacing } from '@/constants/theme';

const PING_URL = 'https://clients3.google.com/generate_204';
const POLL_INTERVAL_MS = 10_000; // check every 10 seconds

export function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(false);
    const translateY = useRef(new Animated.Value(-60)).current;

    useEffect(() => {
        let mounted = true;

        const checkConnectivity = async () => {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5_000);
                await fetch(PING_URL, {
                    method: 'HEAD',
                    cache: 'no-store',
                    signal: controller.signal,
                });
                clearTimeout(timeout);
                if (mounted) setIsOffline(false);
            } catch {
                if (mounted) setIsOffline(true);
            }
        };

        checkConnectivity();
        const interval = setInterval(checkConnectivity, POLL_INTERVAL_MS);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    // Animate the banner in/out
    useEffect(() => {
        Animated.spring(translateY, {
            toValue: isOffline ? 0 : -60,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
        }).start();
    }, [isOffline, translateY]);

    return (
        <Animated.View
            style={[
                styles.banner,
                { transform: [{ translateY }] },
            ]}
            accessibilityRole="alert"
            accessibilityLabel="You are offline. Some features may not work."
            accessibilityLiveRegion="assertive"
        >
            <Ionicons name="cloud-offline-outline" size={16} color="#FFFFFF" />
            <Text style={styles.text}>No internet connection</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    banner: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: AppColors.error,
        paddingTop: Platform.OS === 'ios' ? 54 : 36,
        paddingBottom: Spacing.sm,
        paddingHorizontal: Spacing.lg,
    },
    text: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
});
