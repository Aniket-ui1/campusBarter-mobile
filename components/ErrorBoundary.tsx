// components/ErrorBoundary.tsx
// ─────────────────────────────────────────────────────────────────
// Catches uncaught JS errors in the React tree and shows a
// friendly fallback UI instead of a white screen / crash.
// ─────────────────────────────────────────────────────────────────

import React, { Component, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, Radii, Spacing } from '@/constants/theme';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container} accessibilityRole="alert">
                    <View style={styles.statusSpacer} />
                    <View style={styles.content}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="warning-outline" size={36} color={AppColors.error} />
                        </View>
                        <Text style={styles.title}>Something went wrong</Text>
                        <Text style={styles.description}>
                            An unexpected error occurred. Please try again.
                        </Text>
                        {__DEV__ && this.state.error && (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText} numberOfLines={4}>
                                    {this.state.error.message}
                                </Text>
                            </View>
                        )}
                        <Pressable
                            style={({ pressed }) => [
                                styles.retryBtn,
                                pressed && { opacity: 0.85 },
                            ]}
                            onPress={this.handleRetry}
                            accessibilityLabel="Try again"
                            accessibilityRole="button"
                        >
                            <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
                            <Text style={styles.retryText}>Try Again</Text>
                        </Pressable>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    statusSpacer: {
        height: Platform.OS === 'ios' ? 54 : 36,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        gap: Spacing.md,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: AppColors.error + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: AppColors.text,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        color: AppColors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    errorBox: {
        backgroundColor: AppColors.error + '10',
        borderWidth: 1,
        borderColor: AppColors.error + '25',
        borderRadius: Radii.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        width: '100%',
        marginTop: Spacing.sm,
    },
    errorText: {
        fontSize: 12,
        color: AppColors.error,
        fontFamily: 'monospace',
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: AppColors.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: Radii.md,
        marginTop: Spacing.lg,
    },
    retryText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});
