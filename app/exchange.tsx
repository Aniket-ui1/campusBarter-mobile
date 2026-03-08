// app/exchange.tsx — QR Code Exchange Verification (Task 3)

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Platform, Pressable,
    StyleSheet, Text, View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { AppColors, Radii, Shadows, Spacing } from '@/constants/theme';
import { getApiToken } from '@/lib/api';

const API_BASE = process.env.EXPO_PUBLIC_API_URL
    ?? 'https://campusbarter-api-f3b4ascaemgthae3.canadacentral-01.azurewebsites.net';

type Mode = 'generate' | 'scan' | 'result';

export default function ExchangeScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ listingId?: string; sellerId?: string; credits?: string }>();

    const [mode, setMode] = useState<Mode>('generate');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [scanInput, setScanInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [resultMsg, setResultMsg] = useState('');

    // Auto-generate if params are provided (from chat agreement)
    useEffect(() => {
        if (params.listingId && params.sellerId && params.credits) {
            handleGenerate();
        }
    }, []);

    const handleGenerate = async () => {
        if (!params.listingId || !params.sellerId || !params.credits) {
            Alert.alert('Missing info', 'Exchange details are required.');
            return;
        }
        setLoading(true);
        try {
            const token = getApiToken();
            const res = await fetch(`${API_BASE}/api/v1/insights/exchange`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    listingId: params.listingId,
                    sellerId: params.sellerId,
                    credits: Number(params.credits),
                }),
            });
            if (!res.ok) throw new Error('Failed to create exchange');
            const data = await res.json();
            setQrCode(data.qrCode);
        } catch (e) {
            Alert.alert('Error', 'Could not create exchange. Try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (code: string) => {
        if (!code.trim()) return;
        setLoading(true);
        try {
            const token = getApiToken();
            const res = await fetch(`${API_BASE}/api/v1/insights/exchange/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ qrCode: code.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');
            setResultMsg(`✅ Exchange confirmed! ${data.credits}⏱️ transferred.`);
            setMode('result');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not confirm exchange.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />

            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color="#FFF" />
                </Pressable>
                <Text style={styles.headerTitle}>🔄 Exchange</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                {loading && (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={AppColors.primary} />
                        <Text style={styles.loadingText}>Processing...</Text>
                    </View>
                )}

                {/* Generated QR code display */}
                {!loading && qrCode && mode === 'generate' && (
                    <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.qrCard}>
                        <Text style={styles.qrEmoji}>📱</Text>
                        <Text style={styles.qrTitle}>Exchange Code</Text>
                        <View style={styles.qrBox}>
                            <Text style={styles.qrText}>{qrCode}</Text>
                        </View>
                        <Text style={styles.qrHint}>
                            Share this code with the other person.{'\n'}
                            Both parties must enter this code to confirm.
                        </Text>

                        <View style={styles.steps}>
                            {['Show code to the other person', 'Both scan/enter code', 'Credits transfer automatically'].map((step, i) => (
                                <View key={i} style={styles.stepRow}>
                                    <View style={styles.stepDot}>
                                        <Text style={styles.stepNum}>{i + 1}</Text>
                                    </View>
                                    <Text style={styles.stepText}>{step}</Text>
                                </View>
                            ))}
                        </View>

                        <Pressable style={styles.confirmBtn} onPress={() => handleConfirm(qrCode)}>
                            <Text style={styles.confirmBtnText}>I've Met — Confirm My Side</Text>
                        </Pressable>
                    </Animated.View>
                )}

                {/* No QR yet — show generate + scan options */}
                {!loading && !qrCode && mode !== 'result' && (
                    <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.optionsWrap}>
                        <Text style={styles.optionsTitle}>Exchange Verification</Text>
                        <Text style={styles.optionsDesc}>
                            Meet in person on campus, then verify the exchange using a unique code.
                        </Text>

                        <View style={styles.optionCards}>
                            <Pressable style={styles.optionCard} onPress={() => {
                                Alert.prompt?.('Enter QR Code', 'Enter the exchange code:', (val: string) => {
                                    if (val) handleConfirm(val);
                                }) ?? Alert.alert('Enter Code', 'Use the confirm button on the code screen.');
                            }}>
                                <Text style={styles.optionEmoji}>📷</Text>
                                <Text style={styles.optionLabel}>Scan / Enter Code</Text>
                                <Text style={styles.optionHint}>The other party shared a code with you</Text>
                            </Pressable>

                            <Pressable style={styles.optionCard} onPress={() => {
                                if (params.listingId) {
                                    handleGenerate();
                                } else {
                                    Alert.alert('Navigate from chat', 'Start an exchange from a listing chat');
                                }
                            }}>
                                <Text style={styles.optionEmoji}>🔑</Text>
                                <Text style={styles.optionLabel}>Generate Code</Text>
                                <Text style={styles.optionHint}>Create a new exchange code to share</Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                )}

                {/* Result screen */}
                {mode === 'result' && (
                    <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.resultCard}>
                        <Text style={styles.resultEmoji}>🎉</Text>
                        <Text style={styles.resultTitle}>Exchange Complete!</Text>
                        <Text style={styles.resultMsg}>{resultMsg}</Text>
                        <Pressable style={styles.doneBtn} onPress={() => router.back()}>
                            <Text style={styles.doneBtnText}>Done</Text>
                        </Pressable>
                    </Animated.View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppColors.background },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36, backgroundColor: AppColors.primaryDark },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14, color: AppColors.textMuted },

    header: {
        backgroundColor: AppColors.primaryDark,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: '#FFF' },

    content: { flex: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing['2xl'] },

    // QR display
    qrCard: { backgroundColor: '#FFF', borderRadius: Radii.xl, padding: Spacing['2xl'], alignItems: 'center', gap: 16, ...(Shadows.lg as any) },
    qrEmoji: { fontSize: 48 },
    qrTitle: { fontSize: 20, fontWeight: '800', color: AppColors.text },
    qrBox: {
        backgroundColor: AppColors.primaryDark, borderRadius: Radii.lg,
        paddingHorizontal: 32, paddingVertical: 20,
    },
    qrText: { fontSize: 28, fontWeight: '900', color: '#FFF', letterSpacing: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    qrHint: { fontSize: 13, color: AppColors.textMuted, textAlign: 'center', lineHeight: 20 },

    steps: { gap: 12, width: '100%', marginTop: 8 },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: AppColors.primary, alignItems: 'center', justifyContent: 'center' },
    stepNum: { fontSize: 12, fontWeight: '800', color: '#FFF' },
    stepText: { fontSize: 14, color: AppColors.textSecondary },

    confirmBtn: {
        backgroundColor: AppColors.primary, borderRadius: Radii.md,
        paddingVertical: 14, paddingHorizontal: 32, marginTop: 8,
    },
    confirmBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

    // Options
    optionsWrap: { alignItems: 'center', gap: 12 },
    optionsTitle: { fontSize: 22, fontWeight: '800', color: AppColors.text },
    optionsDesc: { fontSize: 14, color: AppColors.textMuted, textAlign: 'center', lineHeight: 21, marginBottom: 8 },
    optionCards: { gap: 12, width: '100%' },
    optionCard: {
        backgroundColor: '#FFF', borderRadius: Radii.xl,
        padding: Spacing.xl, alignItems: 'center', gap: 8,
        borderWidth: 1, borderColor: AppColors.border,
    },
    optionEmoji: { fontSize: 40 },
    optionLabel: { fontSize: 16, fontWeight: '700', color: AppColors.text },
    optionHint: { fontSize: 13, color: AppColors.textMuted, textAlign: 'center' },

    // Result
    resultCard: {
        backgroundColor: '#FFF', borderRadius: Radii.xl,
        padding: Spacing['2xl'], alignItems: 'center', gap: 16, ...(Shadows.lg as any),
    },
    resultEmoji: { fontSize: 64 },
    resultTitle: { fontSize: 22, fontWeight: '900', color: AppColors.text },
    resultMsg: { fontSize: 15, color: AppColors.textSecondary, textAlign: 'center' },
    doneBtn: {
        backgroundColor: AppColors.primary, borderRadius: Radii.md,
        paddingVertical: 14, paddingHorizontal: 40,
    },
    doneBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
