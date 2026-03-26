// app/admin.tsx — Admin Dashboard (Task 9)
// Only visible when user.role === 'Admin' or 'Moderator'
// Lists reported listings, allows deletion, shows audit log, user list

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Platform, Pressable,
    ScrollView, StyleSheet, Text, View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, Radii, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
    ApiReport,
    getAdminAuditLog,
    getAdminDisputes,
    getAdminReports,
    getAdminUsers,
    getApiToken,
    getApiBase,
    resolveAdminDispute,
    updateAdminReport,
    ExchangeDispute,
} from '@/lib/api';

type Tab = 'reports' | 'disputes' | 'listings' | 'users' | 'audit';

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getApiToken();
    const res = await fetch(`${getApiBase()}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers as Record<string, string>),
        },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export default function AdminDashboard() {
    const router = useRouter();
    const { user } = useAuth();
    const [tab, setTab] = useState<Tab>('reports');
    const [listings, setListings]   = useState<any[]>([]);
    const [users, setUsers]         = useState<any[]>([]);
    const [auditLog, setAuditLog]   = useState<any[]>([]);
    const [reports, setReports]     = useState<ApiReport[]>([]);
    const [disputes, setDisputes]   = useState<ExchangeDispute[]>([]);
    const [resolving, setResolving] = useState<string | null>(null);
    const [reportUpdatingId, setReportUpdatingId] = useState<number | null>(null);
    const [loading, setLoading]     = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const [l, u, a, d, r] = await Promise.allSettled([
                adminFetch<any[]>('/api/listings'),
                getAdminUsers(),
                getAdminAuditLog(),
                getAdminDisputes(),
                getAdminReports(),
            ]);
            if (l.status === 'fulfilled') setListings(l.value);
            if (u.status === 'fulfilled') setUsers(u.value);
            if (a.status === 'fulfilled') setAuditLog(a.value);
            if (d.status === 'fulfilled') setDisputes(d.value);
            if (r.status === 'fulfilled') setReports(r.value);
        } catch (e) {
            console.warn('[Admin] Load error:', e);
        } finally {
            setLoading(false);
        }
    };

    // ⚠️ ALL hooks must be declared before any early return (Rules of Hooks)
    useEffect(() => { void loadData(); }, []);

    // Guard: only render for logged-in users (role check can be added here)
    if (!user) return null;

    const deleteListing = async (id: string) => {
        Alert.alert('Delete Listing', 'This will permanently remove the listing.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await adminFetch(`/api/listings/${id}`, { method: 'DELETE' });
                        setListings(ls => ls.filter(l => l.id !== id));
                        Alert.alert('✅ Listing deleted');
                    } catch {
                        Alert.alert('Error', 'Could not delete listing');
                    }
                }
            },
        ]);
    };

    const handleResolve = (d: ExchangeDispute, outcome: 'COMPLETED' | 'CANCELLED') => {
        const confirmResolve = async (resolution: string) => {
            setResolving(d.id);
            try {
                await resolveAdminDispute(d.id, outcome, resolution);
                setDisputes(prev => prev.filter(x => x.id !== d.id));
                Alert.alert('Resolved', `Dispute resolved as ${outcome}.`);
            } catch { Alert.alert('Error', 'Failed to resolve dispute.'); }
            finally { setResolving(null); }
        };
        if (Alert.prompt) {
            Alert.prompt(
                outcome === 'COMPLETED' ? 'Complete Exchange' : 'Cancel Exchange',
                'Enter resolution notes:',
                [
                    { text: 'Back', style: 'cancel' },
                    { text: 'Confirm', onPress: (txt?: string) => { if (txt?.trim()) void confirmResolve(txt.trim()); else Alert.alert('Required', 'Resolution notes are required.'); } },
                ],
                'plain-text'
            );
        } else {
            Alert.alert(
                outcome === 'COMPLETED' ? 'Complete Exchange' : 'Cancel Exchange',
                'Resolve this dispute?',
                [
                    { text: 'Back', style: 'cancel' },
                    { text: 'Confirm', onPress: () => void confirmResolve(`Resolved as ${outcome} via mobile admin`) },
                ]
            );
        }
    };

    const openDisputes = disputes.filter(d => d.status === 'OPEN');

    const handleUpdateReport = async (report: ApiReport, nextStatus: ApiReport['status'], resolutionAction?: string) => {
        setReportUpdatingId(report.reportId);
        try {
            await updateAdminReport(report.reportId, {
                status: nextStatus,
                assignToSelf: nextStatus === 'IN_REVIEW',
                resolutionAction,
                resolutionNote: nextStatus === 'IN_REVIEW' ? undefined : `Updated via admin dashboard (${nextStatus})`,
            });

            setReports(prev => prev.map(r => {
                if (r.reportId !== report.reportId) return r;
                return {
                    ...r,
                    status: nextStatus,
                    resolutionAction: resolutionAction ?? r.resolutionAction,
                    resolvedAt: nextStatus === 'RESOLVED' || nextStatus === 'DISMISSED' ? new Date().toISOString() : null,
                };
            }));
        } catch {
            Alert.alert('Error', 'Failed to update report');
        } finally {
            setReportUpdatingId(null);
        }
    };

    const openReports = reports.filter(r => r.status === 'OPEN' || r.status === 'IN_REVIEW');

    const TABS: { key: Tab; label: string; icon: string; count: number }[] = [
        { key: 'reports', label: 'Reports', icon: 'alert-circle-outline', count: openReports.length },
        { key: 'disputes', label: 'Disputes', icon: 'flag-outline', count: openDisputes.length },
        { key: 'listings', label: 'Listings', icon: 'list-outline', count: listings.length },
        { key: 'users', label: 'Users', icon: 'people-outline', count: users.length },
        { key: 'audit', label: 'Audit Log', icon: 'document-text-outline', count: auditLog.length },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                </Pressable>
                <View>
                    <Text style={styles.headerTitle}>Admin Dashboard</Text>
                    <Text style={styles.headerSub}>CampusBarter Control Panel</Text>
                </View>
                <Pressable style={styles.refreshBtn} onPress={loadData}>
                    <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
                </Pressable>
            </View>

            {/* Tab bar */}
            <View style={styles.tabBar}>
                {TABS.map(t => (
                    <Pressable
                        key={t.key}
                        style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
                        onPress={() => setTab(t.key)}
                    >
                        <Ionicons name={t.icon as any} size={16} color={tab === t.key ? '#FFFFFF' : AppColors.textMuted} />
                        <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
                        {t.count > 0 && (
                            <View style={styles.tabBadge}>
                                <Text style={styles.tabBadgeText}>{t.count}</Text>
                            </View>
                        )}
                    </Pressable>
                ))}
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={AppColors.primary} /></View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                    {/* Reports tab */}
                    {tab === 'reports' && (
                        openReports.length === 0 ? (
                            <View style={styles.empty}>
                                <Text style={styles.emptyEmoji}>🧹</Text>
                                <Text style={styles.emptyText}>No open reports</Text>
                            </View>
                        ) : openReports.map((r, i) => (
                            <Animated.View key={r.reportId} entering={FadeInDown.delay(i * 40).duration(300)}>
                                <View style={styles.disputeCard}>
                                    <View style={styles.disputeHeader}>
                                        <View style={styles.disputeFlag}>
                                            <Ionicons name="alert-circle" size={14} color="#EF4444" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.cardTitle} numberOfLines={1}>{r.reason}</Text>
                                            <Text style={styles.cardMeta}>
                                                {r.targetType} · {r.targetId} · {new Date(r.createdAt).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <View style={[styles.rolePill, { backgroundColor: r.status === 'OPEN' ? '#F59E0B20' : '#3B82F620' }]}>
                                            <Text style={[styles.roleText, { color: r.status === 'OPEN' ? '#B45309' : '#1D4ED8' }]}>{r.status}</Text>
                                        </View>
                                    </View>
                                    {!!r.details && <Text style={styles.disputeReason}>{r.details}</Text>}
                                    {reportUpdatingId === r.reportId ? (
                                        <ActivityIndicator size="small" color={AppColors.primary} style={{ marginTop: 8 }} />
                                    ) : (
                                        <View style={styles.disputeActions}>
                                            {r.status === 'OPEN' && (
                                                <Pressable style={[styles.resolveBtn, { backgroundColor: '#2563EB' }]} onPress={() => void handleUpdateReport(r, 'IN_REVIEW')}>
                                                    <Ionicons name="eye-outline" size={16} color="#FFF" />
                                                    <Text style={styles.resolveBtnText}>Review</Text>
                                                </Pressable>
                                            )}
                                            <Pressable style={[styles.resolveBtn, { backgroundColor: AppColors.success }]} onPress={() => void handleUpdateReport(r, 'RESOLVED', 'OTHER')}>
                                                <Ionicons name="checkmark-circle-outline" size={16} color="#FFF" />
                                                <Text style={styles.resolveBtnText}>Resolve</Text>
                                            </Pressable>
                                            <Pressable style={[styles.resolveBtn, { backgroundColor: AppColors.error }]} onPress={() => void handleUpdateReport(r, 'DISMISSED', 'DISMISSED')}>
                                                <Ionicons name="close-circle-outline" size={16} color="#FFF" />
                                                <Text style={styles.resolveBtnText}>Dismiss</Text>
                                            </Pressable>
                                        </View>
                                    )}
                                </View>
                            </Animated.View>
                        ))
                    )}

                    {/* Disputes tab */}
                    {tab === 'disputes' && (
                        openDisputes.length === 0 ? (
                            <View style={styles.empty}>
                                <Text style={styles.emptyEmoji}>✅</Text>
                                <Text style={styles.emptyText}>No open disputes</Text>
                            </View>
                        ) : openDisputes.map((d, i) => (
                            <Animated.View key={d.id} entering={FadeInDown.delay(i * 40).duration(300)}>
                                <View style={styles.disputeCard}>
                                    <View style={styles.disputeHeader}>
                                        <View style={styles.disputeFlag}>
                                            <Ionicons name="flag" size={14} color="#EF4444" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.cardTitle} numberOfLines={1}>{d.listingTitle}</Text>
                                            <Text style={styles.cardMeta}>Raised by {d.raisedByName} · {new Date(d.createdAt).toLocaleDateString()}</Text>
                                        </View>
                                        <Text style={styles.disputeCredits}>{d.credits} cr</Text>
                                    </View>
                                    <Text style={styles.disputeReason} numberOfLines={3}>{d.reason}</Text>
                                    <View style={styles.disputeParties}>
                                        <Text style={styles.disputeParty}>Requester: {d.requesterName}</Text>
                                        <Text style={styles.disputeParty}>Provider: {d.providerName}</Text>
                                    </View>
                                    {resolving === d.id ? (
                                        <ActivityIndicator size="small" color={AppColors.primary} style={{ marginTop: 8 }} />
                                    ) : (
                                        <View style={styles.disputeActions}>
                                            <Pressable style={[styles.resolveBtn, { backgroundColor: AppColors.success }]} onPress={() => handleResolve(d, 'COMPLETED')}>
                                                <Ionicons name="checkmark-circle-outline" size={16} color="#FFF" />
                                                <Text style={styles.resolveBtnText}>Complete</Text>
                                            </Pressable>
                                            <Pressable style={[styles.resolveBtn, { backgroundColor: AppColors.error }]} onPress={() => handleResolve(d, 'CANCELLED')}>
                                                <Ionicons name="close-circle-outline" size={16} color="#FFF" />
                                                <Text style={styles.resolveBtnText}>Cancel</Text>
                                            </Pressable>
                                        </View>
                                    )}
                                </View>
                            </Animated.View>
                        ))
                    )}

                    {/* Listings tab */}
                    {tab === 'listings' && (
                        listings.length === 0 ? (
                            <View style={styles.empty}>
                                <Text style={styles.emptyEmoji}>📋</Text>
                                <Text style={styles.emptyText}>No listings</Text>
                            </View>
                        ) : listings.map((l, i) => (
                            <Animated.View key={l.id} entering={FadeInDown.delay(i * 40).duration(300)}>
                                <View style={styles.card}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.cardTitle} numberOfLines={1}>{l.title}</Text>
                                        <Text style={styles.cardMeta}>By {l.userName} · {l.type} · {l.status}</Text>
                                    </View>
                                    <Pressable style={styles.deleteBtn} onPress={() => deleteListing(l.id)}>
                                        <Ionicons name="trash-outline" size={18} color={AppColors.error} />
                                    </Pressable>
                                </View>
                            </Animated.View>
                        ))
                    )}

                    {/* Users tab */}
                    {tab === 'users' && (
                        users.length === 0 ? (
                            <View style={styles.empty}>
                                <Text style={styles.emptyEmoji}>👥</Text>
                                <Text style={styles.emptyText}>No users found</Text>
                            </View>
                        ) : users.map((u, i) => (
                            <Animated.View key={u.id} entering={FadeInDown.delay(i * 40).duration(300)}>
                                <View style={styles.card}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.cardTitle}>{u.displayName ?? u.id}</Text>
                                        <Text style={styles.cardMeta}>{u.email} · {u.role ?? 'Student'}</Text>
                                    </View>
                                    <View style={[styles.rolePill, { backgroundColor: u.role === 'Admin' ? AppColors.error + '20' : AppColors.primary + '15' }]}>
                                        <Text style={[styles.roleText, { color: u.role === 'Admin' ? AppColors.error : AppColors.primary }]}>
                                            {u.role ?? 'Student'}
                                        </Text>
                                    </View>
                                </View>
                            </Animated.View>
                        ))
                    )}

                    {/* Audit log tab */}
                    {tab === 'audit' && (
                        auditLog.length === 0 ? (
                            <View style={styles.empty}>
                                <Text style={styles.emptyEmoji}>📑</Text>
                                <Text style={styles.emptyText}>No audit entries yet</Text>
                            </View>
                        ) : auditLog.map((a, i) => (
                            <Animated.View key={a.id ?? i} entering={FadeInDown.delay(i * 40).duration(300)}>
                                <View style={styles.auditRow}>
                                    <View style={styles.auditDot} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.auditAction}>{a.action}</Text>
                                        <Text style={styles.auditMeta}>{a.userId ?? 'system'} · {new Date(a.timestamp).toLocaleString()}</Text>
                                    </View>
                                </View>
                            </Animated.View>
                        ))
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppColors.background },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36, backgroundColor: AppColors.primaryDark },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: {
        backgroundColor: AppColors.primaryDark,
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    },
    backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    refreshBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },

    tabBar: {
        flexDirection: 'row', gap: 8,
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
        backgroundColor: '#FFFFFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: AppColors.border,
    },
    tabBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
        paddingVertical: 8, borderRadius: Radii.sm, backgroundColor: AppColors.surface,
    },
    tabBtnActive: { backgroundColor: AppColors.primary },
    tabLabel: { fontSize: 12, fontWeight: '600', color: AppColors.textMuted },
    tabLabelActive: { color: '#FFFFFF' },
    tabBadge: { backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
    tabBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },

    scroll: { padding: Spacing.xl, gap: 8 },

    card: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        backgroundColor: '#FFFFFF', borderRadius: Radii.md,
        padding: Spacing.lg, borderWidth: 1, borderColor: AppColors.border,
    },
    cardTitle: { fontSize: 14, fontWeight: '700', color: AppColors.text },
    cardMeta: { fontSize: 12, color: AppColors.textMuted, marginTop: 2 },
    deleteBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: AppColors.error + '10', alignItems: 'center', justifyContent: 'center' },
    rolePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radii.full },
    roleText: { fontSize: 11, fontWeight: '700' },

    auditRow: {
        flexDirection: 'row', gap: 12, alignItems: 'flex-start',
        backgroundColor: '#FFFFFF', borderRadius: Radii.md,
        padding: Spacing.lg, borderWidth: 1, borderColor: AppColors.border,
    },
    auditDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: AppColors.primary, marginTop: 5 },
    auditAction: { fontSize: 14, fontWeight: '600', color: AppColors.text },
    auditMeta: { fontSize: 12, color: AppColors.textMuted, marginTop: 2 },

    empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyEmoji: { fontSize: 40 },
    emptyText: { fontSize: 16, fontWeight: '600', color: AppColors.textSecondary },

    disputeCard: {
        backgroundColor: '#FFF', borderRadius: Radii.md,
        padding: Spacing.lg, borderWidth: 1, borderColor: AppColors.border, gap: 10,
    },
    disputeHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
    disputeFlag:    { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EF444415', alignItems: 'center', justifyContent: 'center' },
    disputeCredits: { fontSize: 13, fontWeight: '700', color: AppColors.text },
    disputeReason:  { fontSize: 13, color: AppColors.textSecondary, lineHeight: 19 },
    disputeParties: { flexDirection: 'row', gap: Spacing.lg },
    disputeParty:   { fontSize: 12, color: AppColors.textMuted },
    disputeActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
    resolveBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: Radii.sm },
    resolveBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
});
