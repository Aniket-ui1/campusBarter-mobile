// app/exchange/[id].tsx — Exchange detail: status, confirm, cancel, dispute

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator, Alert, Modal, Platform, Pressable,
    ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, Radii, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
    acceptExchange, cancelExchange, confirmExchangeApi,
    getExchangeById, raiseExchangeDispute, SkillExchange,
} from '@/lib/api';

const STATUS_COLOR: Record<string, string> = {
    REQUESTED: '#F59E0B',
    ACCEPTED:  '#3B82F6',
    COMPLETED: '#22C55E',
    CANCELLED: '#6B7280',
    DISPUTED:  '#EF4444',
};

function timeRemaining(from: string | null, hoursWindow: number): string {
    if (!from) return '';
    const elapsed   = (Date.now() - new Date(from).getTime()) / 3600000;
    const remaining = hoursWindow - elapsed;
    if (remaining <= 0) return 'overdue';
    if (remaining < 1)  return `${Math.round(remaining * 60)}m`;
    if (remaining < 24) return `${Math.round(remaining)}h`;
    return `${Math.round(remaining / 24)}d`;
}

const STEPS = ['Requested', 'Accepted', 'Completed'];

function Timeline({ status }: { status: string }) {
    const active = status === 'CANCELLED' || status === 'DISPUTED'
        ? 1
        : status === 'REQUESTED' ? 0 : status === 'ACCEPTED' ? 1 : 2;
    const isBad = status === 'CANCELLED' || status === 'DISPUTED';

    return (
        <View style={tl.row}>
            {STEPS.map((step, i) => {
                const done    = i < active || (i === 2 && status === 'COMPLETED');
                const current = i === active && !isBad;
                const color   = done || current
                    ? (isBad && i === active ? STATUS_COLOR[status] : AppColors.primary)
                    : AppColors.border;
                return (
                    <React.Fragment key={step}>
                        <View style={tl.stepCol}>
                            <View style={[tl.dot, { backgroundColor: color }]}>
                                {(done || current) && <Ionicons name={done ? 'checkmark' : 'ellipse'} size={10} color="#FFF" />}
                            </View>
                            <Text style={[tl.label, { color }]}>{step}</Text>
                        </View>
                        {i < STEPS.length - 1 && (
                            <View style={[tl.line, { backgroundColor: i < active ? AppColors.primary : AppColors.border }]} />
                        )}
                    </React.Fragment>
                );
            })}
            {isBad && (
                <View style={tl.badgeWrap}>
                    <View style={[tl.badge, { backgroundColor: STATUS_COLOR[status] + '20' }]}>
                        <Text style={[tl.badgeText, { color: STATUS_COLOR[status] }]}>{status}</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

export default function ExchangeDetailScreen() {
    const { id }   = useLocalSearchParams<{ id: string }>();
    const router   = useRouter();
    const { user } = useAuth();
    const [exchange, setExchange]         = useState<SkillExchange | null>(null);
    const [loading, setLoading]           = useState(true);
    const [acting, setActing]             = useState(false);
    const [disputeModal, setDisputeModal] = useState(false);
    const [disputeReason, setDisputeReason] = useState('');

    const load = useCallback(async () => {
        try {
            const data = await getExchangeById(id);
            setExchange(data);
        } catch { /* not found or no access */ } finally {
            setLoading(false);
        }
    }, [id]);

    useFocusEffect(useCallback(() => { void load(); }, [load]));

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.statusSpacer} />
                <View style={styles.center}><ActivityIndicator size="large" color={AppColors.primary} /></View>
            </View>
        );
    }

    if (!exchange) {
        return (
            <View style={styles.container}>
                <View style={styles.statusSpacer} />
                <View style={styles.header}>
                    <Pressable style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color="#FFF" />
                    </Pressable>
                    <Text style={styles.headerTitle}>Exchange</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.center}>
                    <Text style={styles.emptyText}>Exchange not found.</Text>
                </View>
            </View>
        );
    }

    const isRequester = exchange.requesterId === user?.id;
    const isProvider  = exchange.providerId  === user?.id;
    const statusColor = STATUS_COLOR[exchange.status] ?? AppColors.textMuted;

    const handleAccept = async () => {
        setActing(true);
        try {
            await acceptExchange(id);
            await load();
        } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'Could not accept exchange');
        } finally { setActing(false); }
    };

    const handleConfirm = async () => {
        setActing(true);
        try {
            const { completed } = await confirmExchangeApi(id);
            await load();
            if (completed) {
                Alert.alert('🎉 Exchange Complete!', `${exchange.credits} credit${exchange.credits !== 1 ? 's' : ''} have been transferred.`);
            } else {
                Alert.alert('Confirmed!', 'Waiting for the other party to confirm.');
            }
        } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'Could not confirm');
        } finally { setActing(false); }
    };

    const handleCancel = () => {
        Alert.alert('Cancel Exchange', 'Are you sure? Credits will be returned to the requester.', [
            { text: 'Keep', style: 'cancel' },
            {
                text: 'Cancel Exchange', style: 'destructive', onPress: async () => {
                    setActing(true);
                    try { await cancelExchange(id); await load(); }
                    catch (err: any) { Alert.alert('Error', err?.message ?? 'Could not cancel'); }
                    finally { setActing(false); }
                },
            },
        ]);
    };

    const handleDispute = async () => {
        if (!disputeReason.trim()) { Alert.alert('Required', 'Please describe the issue.'); return; }
        setActing(true);
        setDisputeModal(false);
        try {
            await raiseExchangeDispute(id, disputeReason.trim());
            setDisputeReason('');
            await load();
            Alert.alert('Dispute Raised', 'An admin has been notified and will review your case.');
        } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'Could not raise dispute');
        } finally { setActing(false); }
    };

    const myConfirmed    = isRequester ? exchange.requesterConfirmed : exchange.providerConfirmed;
    const otherConfirmed = isRequester ? exchange.providerConfirmed  : exchange.requesterConfirmed;
    const otherName      = isRequester ? exchange.providerName       : exchange.requesterName;

    // Expiry time remaining
    const autoCompleteIn = exchange.status === 'ACCEPTED' && exchange.providerConfirmed && !exchange.requesterConfirmed
        ? timeRemaining(exchange.providerConfirmedAt, 48) : null;
    const autoCancelIn   = exchange.status === 'ACCEPTED' && !exchange.requesterConfirmed && !exchange.providerConfirmed
        ? timeRemaining(exchange.acceptedAt, 168) : null;

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color="#FFF" />
                </Pressable>
                <Text style={styles.headerTitle}>Exchange Detail</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Status header card */}
                <Animated.View entering={FadeInDown.delay(60).duration(300)} style={styles.heroCard}>
                    <Text style={styles.heroTitle} numberOfLines={2}>{exchange.listingTitle}</Text>
                    <View style={styles.heroMeta}>
                        <Text style={styles.heroCredits}>🪙 {exchange.credits} credit{exchange.credits !== 1 ? 's' : ''}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                            <Text style={[styles.statusBadgeText, { color: statusColor }]}>{exchange.status}</Text>
                        </View>
                    </View>
                    <View style={styles.partiesRow}>
                        <View style={styles.partyItem}>
                            <Text style={styles.partyRole}>Requester</Text>
                            <Text style={styles.partyName}>{exchange.requesterName}</Text>
                        </View>
                        <Ionicons name="swap-horizontal" size={18} color={AppColors.textMuted} />
                        <View style={[styles.partyItem, { alignItems: 'flex-end' }]}>
                            <Text style={styles.partyRole}>Provider</Text>
                            <Text style={styles.partyName}>{exchange.providerName}</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Timeline */}
                <Animated.View entering={FadeInDown.delay(120).duration(300)} style={styles.card}>
                    <Timeline status={exchange.status} />
                </Animated.View>

                {/* Expiry banners */}
                {autoCompleteIn && isRequester && (
                    <Animated.View entering={FadeInDown.delay(160).duration(300)} style={[styles.banner, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B' }]}>
                        <Ionicons name="time-outline" size={16} color="#F59E0B" />
                        <Text style={[styles.bannerText, { color: '#F59E0B' }]}>
                            Auto-completes in {autoCompleteIn} if you don&apos;t confirm
                        </Text>
                    </Animated.View>
                )}
                {autoCancelIn && (
                    <Animated.View entering={FadeInDown.delay(160).duration(300)} style={[styles.banner, { backgroundColor: '#6B728015', borderColor: '#6B7280' }]}>
                        <Ionicons name="warning-outline" size={16} color="#6B7280" />
                        <Text style={[styles.bannerText, { color: '#6B7280' }]}>
                            Auto-cancels in {autoCancelIn} if no one confirms
                        </Text>
                    </Animated.View>
                )}

                {/* Confirmation status */}
                {exchange.status === 'ACCEPTED' && (
                    <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.card}>
                        <Text style={styles.cardTitle}>Confirmation Status</Text>
                        <View style={styles.confirmRow}>
                            <Ionicons name={exchange.requesterConfirmed ? 'checkmark-circle' : 'time-outline'} size={20}
                                color={exchange.requesterConfirmed ? AppColors.success : AppColors.textMuted} />
                            <Text style={styles.confirmText}>{exchange.requesterName} (requester)</Text>
                        </View>
                        <View style={styles.confirmRow}>
                            <Ionicons name={exchange.providerConfirmed ? 'checkmark-circle' : 'time-outline'} size={20}
                                color={exchange.providerConfirmed ? AppColors.success : AppColors.textMuted} />
                            <Text style={styles.confirmText}>{exchange.providerName} (provider)</Text>
                        </View>
                    </Animated.View>
                )}

                {/* Actions */}
                {acting ? (
                    <ActivityIndicator size="small" color={AppColors.primary} style={{ marginTop: 16 }} />
                ) : (
                    <>
                        {/* Provider + REQUESTED: Accept or Decline */}
                        {isProvider && exchange.status === 'REQUESTED' && (
                            <Animated.View entering={FadeInDown.delay(240).duration(300)} style={styles.actionsCol}>
                                <Pressable style={[styles.btn, { backgroundColor: AppColors.success }]} onPress={handleAccept}>
                                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                                    <Text style={styles.btnText}>Accept Exchange</Text>
                                </Pressable>
                                <Pressable style={[styles.btn, { backgroundColor: AppColors.error }]} onPress={handleCancel}>
                                    <Ionicons name="close-circle-outline" size={18} color="#FFF" />
                                    <Text style={styles.btnText}>Decline</Text>
                                </Pressable>
                            </Animated.View>
                        )}

                        {/* Requester + REQUESTED: Cancel only */}
                        {isRequester && exchange.status === 'REQUESTED' && (
                            <Animated.View entering={FadeInDown.delay(240).duration(300)} style={styles.actionsCol}>
                                <Pressable style={[styles.btnOutline, { borderColor: AppColors.error }]} onPress={handleCancel}>
                                    <Text style={[styles.btnOutlineText, { color: AppColors.error }]}>Cancel Request</Text>
                                </Pressable>
                            </Animated.View>
                        )}

                        {/* Either + ACCEPTED: Confirm / Cancel / Dispute */}
                        {exchange.status === 'ACCEPTED' && (isRequester || isProvider) && (
                            <Animated.View entering={FadeInDown.delay(240).duration(300)} style={styles.actionsCol}>
                                {!myConfirmed && (
                                    <Pressable style={[styles.btn, { backgroundColor: AppColors.primary }]} onPress={handleConfirm}>
                                        <Ionicons name="checkmark-done-outline" size={18} color="#FFF" />
                                        <Text style={styles.btnText}>Mark as Complete</Text>
                                    </Pressable>
                                )}
                                {myConfirmed && !otherConfirmed && (
                                    <View style={[styles.banner, { backgroundColor: AppColors.success + '15', borderColor: AppColors.success }]}>
                                        <Ionicons name="checkmark-circle-outline" size={16} color={AppColors.success} />
                                        <Text style={[styles.bannerText, { color: AppColors.success }]}>
                                            You confirmed — waiting for {otherName}
                                        </Text>
                                    </View>
                                )}
                                <Pressable style={[styles.btnOutline, { borderColor: AppColors.error }]} onPress={handleCancel}>
                                    <Text style={[styles.btnOutlineText, { color: AppColors.error }]}>Cancel Exchange</Text>
                                </Pressable>
                                <Pressable style={[styles.btnOutline, { borderColor: '#F59E0B' }]} onPress={() => setDisputeModal(true)}>
                                    <Ionicons name="flag-outline" size={16} color="#F59E0B" />
                                    <Text style={[styles.btnOutlineText, { color: '#F59E0B' }]}>Raise Dispute</Text>
                                </Pressable>
                            </Animated.View>
                        )}

                        {/* COMPLETED */}
                        {exchange.status === 'COMPLETED' && (
                            <Animated.View entering={FadeInDown.delay(240).duration(300)}
                                style={[styles.banner, { backgroundColor: AppColors.success + '15', borderColor: AppColors.success }]}>
                                <Ionicons name="checkmark-circle" size={20} color={AppColors.success} />
                                <Text style={[styles.bannerText, { color: AppColors.success, fontWeight: '700' }]}>
                                    {exchange.credits} credit{exchange.credits !== 1 ? 's' : ''} transferred
                                    {exchange.autoCompleted ? ' (auto-completed)' : ''}
                                </Text>
                            </Animated.View>
                        )}

                        {/* CANCELLED */}
                        {exchange.status === 'CANCELLED' && (
                            <Animated.View entering={FadeInDown.delay(240).duration(300)}
                                style={[styles.banner, { backgroundColor: '#6B728015', borderColor: '#6B7280' }]}>
                                <Ionicons name="close-circle-outline" size={18} color="#6B7280" />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.bannerText, { color: '#6B7280' }]}>Exchange cancelled</Text>
                                    {!!exchange.cancelReason && (
                                        <Text style={[styles.bannerText, { color: '#6B7280', fontSize: 12, fontWeight: '400' }]}>
                                            {exchange.cancelReason}
                                        </Text>
                                    )}
                                </View>
                            </Animated.View>
                        )}

                        {/* DISPUTED */}
                        {exchange.status === 'DISPUTED' && (
                            <Animated.View entering={FadeInDown.delay(240).duration(300)}
                                style={[styles.banner, { backgroundColor: '#EF444415', borderColor: '#EF4444' }]}>
                                <Ionicons name="shield-outline" size={18} color="#EF4444" />
                                <Text style={[styles.bannerText, { color: '#EF4444' }]}>
                                    ⚖️ Under review — admin has been notified
                                </Text>
                            </Animated.View>
                        )}
                    </>
                )}

                {/* Metadata */}
                <Animated.View entering={FadeInDown.delay(300).duration(300)} style={[styles.card, { marginTop: Spacing.lg }]}>
                    <Text style={styles.metaRow}>Created {new Date(exchange.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                    {exchange.acceptedAt && (
                        <Text style={styles.metaRow}>Accepted {new Date(exchange.acceptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                    )}
                    {exchange.completedAt && (
                        <Text style={styles.metaRow}>Completed {new Date(exchange.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                    )}
                </Animated.View>
            </ScrollView>

            {/* Dispute Modal */}
            <Modal visible={disputeModal} transparent animationType="slide" onRequestClose={() => setDisputeModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Raise a Dispute</Text>
                        <Text style={styles.modalSub}>Describe the issue. An admin will review and resolve it.</Text>
                        <TextInput
                            style={styles.modalInput}
                            multiline
                            numberOfLines={4}
                            placeholder="What went wrong?"
                            placeholderTextColor={AppColors.textMuted}
                            value={disputeReason}
                            onChangeText={setDisputeReason}
                            maxLength={1000}
                        />
                        <View style={styles.modalActions}>
                            <Pressable style={styles.modalCancel} onPress={() => { setDisputeModal(false); setDisputeReason(''); }}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.modalSubmit} onPress={handleDispute}>
                                <Text style={styles.modalSubmitText}>Submit Dispute</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const tl = StyleSheet.create({
    row:      { flexDirection: 'row', alignItems: 'center', position: 'relative' },
    stepCol:  { alignItems: 'center', gap: 4 },
    dot:      { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    label:    { fontSize: 11, fontWeight: '600' },
    line:     { flex: 1, height: 2, marginBottom: 16 },
    badgeWrap:{ position: 'absolute', right: 0, top: -20 },
    badge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radii.full },
    badgeText:{ fontSize: 10, fontWeight: '700' },
});

const styles = StyleSheet.create({
    container:    { flex: 1, backgroundColor: AppColors.background },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36, backgroundColor: AppColors.primaryDark },
    center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: {
        backgroundColor: AppColors.primaryDark,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    },
    backBtn:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: '#FFF' },

    scroll: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: 48 },

    heroCard: {
        backgroundColor: '#FFF', borderRadius: Radii.lg,
        padding: Spacing.lg, borderWidth: 1, borderColor: AppColors.border,
        gap: Spacing.md, ...(Shadows.sm as any),
    },
    heroTitle:       { fontSize: 18, fontWeight: '800', color: AppColors.text, letterSpacing: -0.3 },
    heroMeta:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
    heroCredits:     { fontSize: 14, fontWeight: '700', color: AppColors.text },
    statusBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radii.full },
    statusBadgeText: { fontSize: 12, fontWeight: '700' },
    partiesRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
    partyItem:       { gap: 2 },
    partyRole:       { fontSize: 11, color: AppColors.textMuted, fontWeight: '500' },
    partyName:       { fontSize: 14, fontWeight: '700', color: AppColors.text },

    card: {
        backgroundColor: '#FFF', borderRadius: Radii.lg,
        padding: Spacing.lg, borderWidth: 1, borderColor: AppColors.border, gap: Spacing.md,
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: AppColors.text },

    banner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1,
    },
    bannerText: { flex: 1, fontSize: 13, fontWeight: '600' },

    confirmRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
    confirmText: { fontSize: 14, color: AppColors.text, fontWeight: '500' },

    actionsCol: { gap: Spacing.md },
    btn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 14, borderRadius: Radii.md, ...(Shadows.sm as any),
    },
    btnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
    btnOutline: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 13, borderRadius: Radii.md, borderWidth: 1.5,
        backgroundColor: '#FFF',
    },
    btnOutlineText: { fontSize: 14, fontWeight: '700' },

    metaRow:    { fontSize: 12, color: AppColors.textMuted },
    emptyText:  { fontSize: 15, color: AppColors.textMuted },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: {
        backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: Spacing.xl, gap: Spacing.md,
        paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl,
    },
    modalTitle:      { fontSize: 18, fontWeight: '800', color: AppColors.text },
    modalSub:        { fontSize: 14, color: AppColors.textSecondary },
    modalInput: {
        borderWidth: 1, borderColor: AppColors.border, borderRadius: Radii.md,
        padding: Spacing.md, fontSize: 14, color: AppColors.text,
        minHeight: 100, textAlignVertical: 'top',
    },
    modalActions:    { flexDirection: 'row', gap: Spacing.md },
    modalCancel: {
        flex: 1, paddingVertical: 13, borderRadius: Radii.md,
        borderWidth: 1, borderColor: AppColors.border, alignItems: 'center',
    },
    modalCancelText: { fontSize: 14, fontWeight: '600', color: AppColors.textSecondary },
    modalSubmit: {
        flex: 1, paddingVertical: 13, borderRadius: Radii.md,
        backgroundColor: '#EF4444', alignItems: 'center',
    },
    modalSubmitText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
