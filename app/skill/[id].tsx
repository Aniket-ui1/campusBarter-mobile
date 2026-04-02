import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { AppColors, CATEGORY_COLORS, CATEGORY_EMOJIS, Radii, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { createExchangeRequest, getApiToken, getCreditsBalance, getExchangeById, getMyExchanges, updateExchangeRequestCredits } from '@/lib/api';
import { chatApi } from '@/services/chatApi';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function SkillDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const { getListingById, startChat, pushLocalNotification, refreshNotifications } = useData();
    const listing = getListingById(id);
    const [requesting, setRequesting] = useState(false);
    const [requestSent, setRequestSent] = useState(false);
    const [requestedCredits, setRequestedCredits] = useState(1);
    const requestedCreditsRef = useRef(1);
    const [availableCredits, setAvailableCredits] = useState<number | null>(null);
    const listingId = listing?.id;
    const listingCreditsRaw = Number(listing?.credits ?? 1);

    const isOwner = listing?.userId === user?.id;

    const formatDuration = (credits: number): string => {
        if (credits === 0.5) return '30 minutes';
        return `${credits} hour${credits !== 1 ? 's' : ''}`;
    };

    const formatCredits = (credits: number): string => `${credits % 1 === 0 ? credits.toFixed(0) : credits.toFixed(1)} credit${credits !== 1 ? 's' : ''}`;

    const roundToHalf = (value: number) => Math.round(value * 2) / 2;
    const walletMaxCredits = availableCredits == null ? 8 : Math.max(0.5, Math.min(8, Math.floor((availableCredits + 1e-9) * 2) / 2));
    const maxRequestCredits = Math.max(0.5, walletMaxCredits);

    const updateRequestedCredits = (rawValue: unknown) => {
        const numericValue = typeof rawValue === 'number'
            ? rawValue
            : Number((rawValue as any)?.nativeEvent?.value ?? rawValue);
        if (!Number.isFinite(numericValue)) return;

        const rounded = Math.max(0.5, Math.min(maxRequestCredits, roundToHalf(numericValue)));
        requestedCreditsRef.current = rounded;
        setRequestedCredits(rounded);
    };

    useEffect(() => {
        if (!listingId) return;
        if (Number.isFinite(listingCreditsRaw)) {
            const clamped = Math.max(0.5, Math.min(8, roundToHalf(listingCreditsRaw)));
            requestedCreditsRef.current = clamped;
            setRequestedCredits(clamped);
        }
    }, [listingId, listingCreditsRaw]);

    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        (async () => {
            try {
                const { balance } = await getCreditsBalance();
                if (!cancelled) setAvailableCredits(balance);
            } catch {
                if (!cancelled) setAvailableCredits(null);
            }
        })();
        return () => { cancelled = true; };
    }, [user?.id]);

    useEffect(() => {
        setRequestedCredits((current) => {
            const next = Math.max(0.5, Math.min(maxRequestCredits, roundToHalf(current)));
            requestedCreditsRef.current = next;
            return next;
        });
    }, [maxRequestCredits]);

    useEffect(() => {
        let cancelled = false;
        if (!user || !listing || isOwner) return;

        (async () => {
            try {
                const exchanges = await getMyExchanges();
                const hasActive = exchanges.some((ex) =>
                    ex.listingId === listing.id && (ex.status === 'REQUESTED' || ex.status === 'ACCEPTED' || ex.status === 'DISPUTED')
                );
                if (!cancelled) setRequestSent(hasActive);
            } catch {
                // Leave optimistic state as-is if lookup fails.
            }
        })();

        return () => { cancelled = true; };
    }, [isOwner, listing, user]);

    if (!listing) {
        return (
            <View style={styles.container}><View style={styles.statusSpacer} />
                <View style={styles.header}>
                    <Pressable style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={AppColors.text} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Skill Detail</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyEmoji}>🔍</Text>
                    <Text style={styles.emptyTitle}>Listing not found</Text>
                    <Text style={styles.emptyDesc}>This listing may have been deleted or closed.</Text>
                    <Button title="Go Back" onPress={() => router.back()} variant="secondary" />
                </View>
            </View>
        );
    }

    const isOwnerListing = listing.userId === user?.id;
    const catColor = CATEGORY_COLORS[(listing as any).category ?? ''] ?? AppColors.primary;
    const catEmoji = CATEGORY_EMOJIS[(listing as any).category ?? ''] ?? '✨';

    const handleRequest = async () => {
        if (!user) {
            Alert.alert('Sign in required', 'Please sign in to request this skill.');
            return;
        }
        if (!getApiToken()) {
            Alert.alert('Session expired', 'Please sign in again and retry.');
            return;
        }
        if (requestSent) {
            Alert.alert('Already Requested', 'You already sent a request for this skill.');
            return;
        }
        if (requesting) return;
        setRequesting(true);
        try {
            // Refresh wallet balance before proceeding
            let currentBalance = availableCredits;
            try {
                const { balance } = await getCreditsBalance();
                currentBalance = balance;
                setAvailableCredits(balance);
            } catch {
                // Use cached balance if fetch fails
            }

            const selectedCredits = Number.isFinite(requestedCreditsRef.current)
                ? requestedCreditsRef.current
                : requestedCredits;
            
            console.log(`[Request] Selected credits from slider: ${selectedCredits} (${formatDuration(selectedCredits)})`);
            
            // Validate selection is in valid range
            if (!Number.isFinite(selectedCredits) || selectedCredits < 0.5) {
                Alert.alert('Invalid Selection', 'Please select a valid request duration (minimum 30 minutes).');
                return;
            }

            // Check if user has enough credits
            if (currentBalance != null && currentBalance < selectedCredits) {
                const maxAffordable = Math.max(0.5, Math.min(8, roundToHalf(currentBalance)));
                Alert.alert(
                    'Not Enough Credits',
                    `You have ${formatCredits(currentBalance)} available, but this request needs ${formatCredits(selectedCredits)} (${formatDuration(selectedCredits)}).\n\nYou can request up to ${formatDuration(maxAffordable)} with your current balance. Earn more by teaching your own skills.`
                );
                return;
            }

            // Create exchange — notifies the provider server-side
            const { exchangeId, credits: appliedCredits, debug } = await createExchangeRequest(listing.id, selectedCredits);
            console.log(`[Request] API response: sent=${selectedCredits}, applied=${appliedCredits}, debug=${JSON.stringify(debug)}`);

            // Reconcile requested credits explicitly to avoid environments that default to listing/base credits.
            let finalCredits = typeof appliedCredits === 'number' ? appliedCredits : selectedCredits;
            try {
                const reconciled = await updateExchangeRequestCredits(exchangeId, selectedCredits);
                if (typeof reconciled?.credits === 'number') finalCredits = reconciled.credits;
            } catch {
                // Continue with verification step below.
            }

            // Verify persisted exchange credits; enforce correctness or refund immediately.
            try {
                const latest = await getExchangeById(exchangeId);
                const persistedCredits = Number(latest.credits);
                if (Number.isFinite(persistedCredits)) {
                    finalCredits = persistedCredits;
                }
            } catch {
                // If we cannot read back, keep best-known value and continue.
            }

            if (Math.abs(finalCredits - selectedCredits) > 0.001) {
                try {
                    const reconciled = await updateExchangeRequestCredits(exchangeId, selectedCredits);
                    if (typeof reconciled?.credits === 'number') {
                        finalCredits = reconciled.credits;
                    }
                } catch {
                    // no-op, keep created request and show diagnostics below
                }
            }

            const diagnostics = `Selected: ${formatCredits(selectedCredits)} | Stored: ${formatCredits(finalCredits)}`;
            console.log(`[Request] Final diagnostics: ${diagnostics}`);

            // Also add a requester-side bell notification for immediate in-app feedback.
            pushLocalNotification({
                type: 'request',
                title: '🙋 Request sent',
                message: `You requested ${listing.title} from ${listing.userName} • ${formatCredits(finalCredits)} (${formatDuration(finalCredits)}).`,
                relatedId: exchangeId,
                actionUrl: `/exchange/${exchangeId}`,
            });

            await refreshNotifications();
            setRequestSent(true);
            Alert.alert(
                'Request Sent! 🎉',
                `${listing.userName} has been notified that you want to learn "${listing.title}" for ${formatDuration(finalCredits)} (${formatCredits(finalCredits)}).\n\n${diagnostics}\n\nTo track this request, go to Profile -> My Exchanges.`,
                [
                    { text: 'View Exchange', onPress: () => router.push({ pathname: '/exchange/[id]' as any, params: { id: exchangeId } }) },
                    { text: 'OK', style: 'cancel' as const },
                ]
            );
        } catch (err: any) {
            const msg = err?.message ?? '';
            if (msg === 'Insufficient credits') {
                Alert.alert('Not Enough Credits', 'You do not have enough credits for this exchange.');
            } else if (msg.includes('already') || msg.includes('active') || msg.includes('duplicate')) {
                setRequestSent(true);
                Alert.alert('Already Requested', 'You already have an active request for this listing.', [
                    { text: 'View Exchanges', onPress: () => router.push('/exchanges' as any) },
                    { text: 'OK', style: 'cancel' as const },
                ]);
            } else {
                Alert.alert('Error', msg || 'Could not send request. Please try again.');
            }
        } finally {
            setRequesting(false);
        }
    };

    const handleMessage = async () => {
        if (!user) return;
        try {
            const conv = await chatApi.findOrCreate(listing.userId);
            const convId = (conv as any)?.conversation?.conversationId ?? (conv as any)?.conversationId;
            if (!convId) throw new Error('Invalid conversation response');
            router.push({
                pathname: '/chat/[id]' as any,
                params: {
                    id: convId,
                    recipientId: listing.userId,
                    recipientName: listing.userName,
                },
            });
        } catch {
            try {
                const legacyChatId = await startChat(
                    listing.id,
                    listing.title,
                    [user.id, listing.userId],
                    listing.userId
                );
                router.push({
                    pathname: '/chat/[id]' as any,
                    params: {
                        id: legacyChatId,
                        recipientId: listing.userId,
                        recipientName: listing.userName,
                    },
                });
            } catch {
                Alert.alert('Error', 'Could not start chat.');
            }
        }
    };

    return (
        <View style={styles.container}>
            {/* Colored accent header */}
            <View style={[styles.accentHeader, { backgroundColor: catColor }]}>
                <View style={styles.statusSpacer} />
                <View style={styles.header}>
                    <Pressable style={styles.backBtnLight} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </Pressable>
                    <Text style={styles.headerTitleLight}>Skill Detail</Text>
                    <Pressable style={styles.backBtnLight}>
                        <Ionicons name="share-outline" size={20} color="#FFFFFF" />
                    </Pressable>
                </View>
                <View style={styles.heroStrip}>
                    <Text style={styles.heroEmoji}>{catEmoji}</Text>
                    <Text style={styles.heroTitle} numberOfLines={2}>{listing.title}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Quick info */}
                <Animated.View entering={FadeInDown.delay(80).duration(350)} style={styles.quickRow}>
                    <View style={styles.quickItem}>
                        <Text style={styles.quickIcon}>🪙</Text>
                        <Text style={styles.quickLabel}>{listing.credits} credit{listing.credits !== 1 ? 's' : ''}</Text>
                    </View>
                    <View style={styles.quickDivider} />
                    <View style={styles.quickItem}>
                        <Ionicons name="time-outline" size={16} color={AppColors.textMuted} />
                        <Text style={styles.quickLabel}>
                            {new Date(listing.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                    </View>
                    <View style={styles.quickDivider} />
                    <View style={styles.quickItem}>
                        <View style={[styles.statusDot, { backgroundColor: listing.status === 'OPEN' ? AppColors.success : AppColors.textMuted }]} />
                        <Text style={styles.quickLabel}>{listing.status}</Text>
                    </View>
                </Animated.View>

                {/* Description */}
                <Animated.View entering={FadeInDown.delay(150).duration(350)} style={styles.card}>
                    <Text style={styles.cardTitle}>📝 Description</Text>
                    <Text style={styles.description}>{listing.description}</Text>
                </Animated.View>

                {/* About the Tutor */}
                <Animated.View entering={FadeInDown.delay(250).duration(350)} style={styles.card}>
                    <Text style={styles.cardTitle}>👤 About the Tutor</Text>
                    <Pressable
                        style={styles.tutorRow}
                        onPress={() => router.push({ pathname: '/user/[id]' as any, params: { id: listing.userId } })}
                    >
                        <Avatar name={listing.userName} size={50} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.tutorName}>{listing.userName}</Text>
                            <Text style={styles.tutorSub}>Tap to view full profile</Text>
                        </View>
                        <View style={styles.profileArrow}>
                            <Ionicons name="chevron-forward" size={18} color={AppColors.primary} />
                        </View>
                    </Pressable>
                </Animated.View>

                {/* CTA */}
                {!isOwnerListing && (
                    <Animated.View entering={FadeInDown.delay(350).duration(350)} style={styles.ctaSection}>
                        <View style={styles.durationCard}>
                            <View style={styles.durationHeaderRow}>
                                <Text style={styles.durationTitle}>How Long Do You Need?</Text>
                                <Text style={styles.durationValue}>{formatDuration(requestedCredits)}</Text>
                            </View>
                            <Text style={styles.durationSub}>1 credit = 1 hour</Text>
                            <Slider
                                minimumValue={0.5}
                                maximumValue={maxRequestCredits}
                                step={0.5}
                                value={requestedCredits}
                                onValueChange={updateRequestedCredits}
                                onSlidingComplete={updateRequestedCredits}
                                minimumTrackTintColor={catColor}
                                maximumTrackTintColor={AppColors.border}
                                thumbTintColor={catColor}
                            />
                            <View style={styles.durationScaleRow}>
                                <Text style={styles.durationScaleText}>30 min</Text>
                                <Text style={styles.durationScaleText}>{formatDuration(maxRequestCredits)}</Text>
                            </View>
                            <Text style={styles.durationCredits}>{formatCredits(requestedCredits)}</Text>
                        </View>

                        <Pressable style={[styles.ctaBtn, { backgroundColor: catColor }, (requesting || requestSent) && { opacity: 0.7 }]} onPress={handleRequest} disabled={requesting || requestSent}>
                            <Ionicons name="hand-left-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.ctaBtnText}>{requesting ? 'Sending Request...' : requestSent ? 'Request Sent' : `Request This Skill (${formatCredits(requestedCredits)})`}</Text>
                        </Pressable>
                        {requestSent && <Text style={styles.requestStatus}>Request has been sent. Go to Profile {'>'} My Exchanges to track it.</Text>}
                        <Pressable style={styles.msgBtn} onPress={handleMessage}>
                            <Ionicons name="chatbubble-outline" size={18} color={AppColors.primary} />
                            <Text style={styles.msgBtnText}>Send a Message</Text>
                        </Pressable>
                        <Pressable
                            style={styles.reportBtn}
                            onPress={() => router.push({ pathname: '/report', params: { listingId: listing.id } })}
                        >
                            <Ionicons name="flag-outline" size={16} color={AppColors.error} />
                            <Text style={styles.reportBtnText}>Report Listing</Text>
                        </Pressable>
                    </Animated.View>
                )}

                {isOwner && (
                    <Animated.View entering={FadeInDown.delay(350).duration(350)} style={styles.ownerBanner}>
                        <Ionicons name="information-circle-outline" size={18} color={AppColors.primary} />
                        <Text style={styles.ownerText}>This is your listing</Text>
                    </Animated.View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppColors.background },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },

    // Accent header
    accentHeader: { paddingBottom: Spacing.lg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: AppColors.surface, alignItems: 'center', justifyContent: 'center',
    },
    backBtnLight: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: AppColors.text },
    headerTitleLight: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
    heroStrip: {
        paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, paddingBottom: Spacing.sm,
        gap: Spacing.sm,
    },
    heroEmoji: { fontSize: 32 },
    heroTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5, lineHeight: 32 },

    scroll: { padding: Spacing.xl, paddingBottom: 40 },

    // Quick info row
    quickRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFFFFF', borderRadius: Radii.lg,
        padding: Spacing.lg, marginBottom: Spacing.lg,
        borderWidth: 1, borderColor: AppColors.border,
        ...Shadows.sm,
    } as any,
    quickItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
    quickIcon: { fontSize: 16 },
    quickLabel: { fontSize: 13, fontWeight: '600', color: AppColors.textSecondary },
    quickDivider: { width: 1, height: 20, backgroundColor: AppColors.border },
    statusDot: { width: 8, height: 8, borderRadius: 4 },

    // Cards
    card: {
        backgroundColor: '#FFFFFF', borderRadius: Radii.lg,
        padding: Spacing.lg, marginBottom: Spacing.lg,
        borderWidth: 1, borderColor: AppColors.border,
        gap: Spacing.md,
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: AppColors.text },
    description: { fontSize: 15, color: AppColors.textSecondary, lineHeight: 23 },

    // Tutor
    tutorRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    },
    tutorName: { fontSize: 16, fontWeight: '700', color: AppColors.text },
    tutorSub: { fontSize: 12, color: AppColors.primary, fontWeight: '500', marginTop: 2 },
    profileArrow: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: AppColors.primary + '12',
        alignItems: 'center', justifyContent: 'center',
    },

    // CTA
    ctaSection: { gap: Spacing.md, marginTop: Spacing.sm },
    durationCard: {
        backgroundColor: '#FFFFFF', borderRadius: Radii.md,
        borderWidth: 1, borderColor: AppColors.border,
        padding: Spacing.md,
        gap: 6,
    },
    durationHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    durationTitle: { fontSize: 14, fontWeight: '700', color: AppColors.text },
    durationValue: { fontSize: 14, fontWeight: '800', color: AppColors.primary },
    durationSub: { fontSize: 12, color: AppColors.textMuted },
    durationScaleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    durationScaleText: { fontSize: 11, color: AppColors.textMuted },
    durationCredits: { fontSize: 13, fontWeight: '700', color: AppColors.textSecondary, textAlign: 'center' },
    ctaBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 16, borderRadius: Radii.md,
        ...Shadows.sm,
    } as any,
    ctaBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
    requestStatus: { fontSize: 12, color: AppColors.textSecondary, textAlign: 'center' },
    msgBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 14, borderRadius: Radii.md,
        borderWidth: 1.5, borderColor: AppColors.primary,
        backgroundColor: '#FFFFFF',
    },
    msgBtnText: { color: AppColors.primary, fontSize: 15, fontWeight: '700' },
    reportBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 12, borderRadius: Radii.md,
        borderWidth: 1, borderColor: AppColors.error + '40',
        backgroundColor: AppColors.error + '08',
    },
    reportBtnText: { color: AppColors.error, fontSize: 14, fontWeight: '700' },

    // Owner
    ownerBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: AppColors.primary + '10', paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md, borderRadius: Radii.md,
    },
    ownerText: { fontSize: 14, color: AppColors.primary, fontWeight: '600' },

    // Empty
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: Spacing.md },
    emptyEmoji: { fontSize: 48 },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: AppColors.text },
    emptyDesc: { fontSize: 14, color: AppColors.textSecondary, textAlign: 'center' },
});
