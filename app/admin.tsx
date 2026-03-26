import { AppColors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
    AdminAuditLogEntry,
    AdminReportedListing,
    ApiUserProfile,
    deleteListing,
    getAdminAuditLog,
    getAdminReportedListings,
    getAllUsers,
} from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

type Tab = 'reports' | 'users' | 'audit';

export default function AdminDashboard() {
    const router = useRouter();
    const { user } = useAuth();

    const [tab, setTab] = useState<Tab>('reports');
    const [reportedListings, setReportedListings] = useState<AdminReportedListing[]>([]);
    const [users, setUsers] = useState<ApiUserProfile[]>([]);
    const [auditLog, setAuditLog] = useState<AdminAuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const role = (user as { role?: string } | null)?.role;
    const isAdmin = typeof role === 'string' && role.toLowerCase() === 'admin';

    const loadData = async () => {
        if (!isAdmin) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const [reportsRes, usersRes, auditRes] = await Promise.allSettled([
                getAdminReportedListings(),
                getAllUsers(),
                getAdminAuditLog(200),
            ]);

            if (reportsRes.status === 'fulfilled') {
                setReportedListings(reportsRes.value);
            }
            if (usersRes.status === 'fulfilled') {
                setUsers(usersRes.value);
            }
            if (auditRes.status === 'fulfilled') {
                setAuditLog(auditRes.value);
            }
        } catch (error) {
            console.warn('[Admin] Failed to load admin data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin]);

    const handleDeleteListing = (listingId: string) => {
        Alert.alert('Delete Listing', 'This permanently removes the listing. Continue?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteListing(listingId);
                        setReportedListings((prev) => prev.filter((item) => item.listingId !== listingId));
                        Alert.alert('Listing deleted');
                    } catch {
                        Alert.alert('Error', 'Could not delete listing.');
                    }
                },
            },
        ]);
    };

    const tabs = useMemo(() => ([
        { key: 'reports' as const, label: 'Reports', icon: 'flag-outline', count: reportedListings.length },
        { key: 'users' as const, label: 'Users', icon: 'people-outline', count: users.length },
        { key: 'audit' as const, label: 'Audit', icon: 'document-text-outline', count: auditLog.length },
    ]), [auditLog.length, reportedListings.length, users.length]);

    if (!user) return null;

    if (!isAdmin) {
        return (
            <View style={styles.container}>
                <View style={styles.statusSpacer} />
                <View style={styles.header}>
                    <Pressable style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </Pressable>
                    <Text style={styles.headerTitle}>Admin Dashboard</Text>
                    <View style={{ width: 36 }} />
                </View>

                <View style={styles.center}>
                    <Ionicons name="lock-closed-outline" size={36} color={AppColors.textMuted} />
                    <Text style={styles.emptyText}>Admin access required.</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />

            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                </Pressable>
                <Text style={styles.headerTitle}>Admin Dashboard</Text>
                <Pressable style={styles.refreshBtn} onPress={loadData}>
                    <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
                </Pressable>
            </View>

            <View style={styles.tabBar}>
                {tabs.map((item) => (
                    <Pressable
                        key={item.key}
                        style={[styles.tabBtn, tab === item.key && styles.tabBtnActive]}
                        onPress={() => setTab(item.key)}
                    >
                        <Ionicons
                            name={item.icon as never}
                            size={16}
                            color={tab === item.key ? '#FFFFFF' : AppColors.textMuted}
                        />
                        <Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>{item.label}</Text>
                        {item.count > 0 ? (
                            <View style={styles.tabBadge}>
                                <Text style={styles.tabBadgeText}>{item.count}</Text>
                            </View>
                        ) : null}
                    </Pressable>
                ))}
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={AppColors.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    {tab === 'reports' && (
                        reportedListings.length === 0 ? (
                            <View style={styles.emptyBlock}>
                                <Text style={styles.emptyText}>No reported listings right now.</Text>
                            </View>
                        ) : reportedListings.map((item, idx) => (
                            <Animated.View key={item.listingId} entering={FadeInDown.delay(idx * 40).duration(250)}>
                                <View style={styles.card}>
                                    <View style={{ flex: 1, gap: 3 }}>
                                        <Text style={styles.cardTitle} numberOfLines={1}>{item.listingTitle}</Text>
                                        <Text style={styles.cardMeta}>
                                            Reports: {item.reportCount} · {new Date(item.latestReportedAt).toLocaleDateString()}
                                        </Text>
                                        <Text style={styles.cardMeta} numberOfLines={2}>Reason: {item.latestReason}</Text>
                                        <Text style={styles.cardMeta} numberOfLines={1}>
                                            Parties: {item.requesterName} / {item.providerName}
                                        </Text>
                                    </View>
                                    <Pressable style={styles.deleteBtn} onPress={() => handleDeleteListing(item.listingId)}>
                                        <Ionicons name="trash-outline" size={18} color={AppColors.error} />
                                    </Pressable>
                                </View>
                            </Animated.View>
                        ))
                    )}

                    {tab === 'users' && (
                        users.length === 0 ? (
                            <View style={styles.emptyBlock}>
                                <Text style={styles.emptyText}>No users found.</Text>
                            </View>
                        ) : users.map((u, idx) => (
                            <Animated.View key={u.id} entering={FadeInDown.delay(idx * 35).duration(220)}>
                                <View style={styles.card}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.cardTitle}>{u.displayName || u.id}</Text>
                                        <Text style={styles.cardMeta}>{u.email}</Text>
                                    </View>
                                    <View style={[styles.rolePill, { backgroundColor: (u.role === 'Admin' ? AppColors.error : AppColors.primary) + '15' }]}> 
                                        <Text style={[styles.roleText, { color: u.role === 'Admin' ? AppColors.error : AppColors.primary }]}>
                                            {u.role || 'Student'}
                                        </Text>
                                    </View>
                                </View>
                            </Animated.View>
                        ))
                    )}

                    {tab === 'audit' && (
                        auditLog.length === 0 ? (
                            <View style={styles.emptyBlock}>
                                <Text style={styles.emptyText}>No audit entries available.</Text>
                            </View>
                        ) : auditLog.map((entry, idx) => (
                            <Animated.View key={`${entry.createdAt}-${idx}`} entering={FadeInDown.delay(idx * 25).duration(200)}>
                                <View style={styles.auditRow}>
                                    <View style={styles.auditDot} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.cardTitle}>{entry.action}</Text>
                                        <Text style={styles.cardMeta}>
                                            {(entry.actorId || 'system')} · {new Date(entry.createdAt).toLocaleString()}
                                        </Text>
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
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: Spacing.xl },

    header: {
        backgroundColor: AppColors.primaryDark,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
    },
    backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    refreshBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },

    tabBar: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: AppColors.border,
    },
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 8,
        borderRadius: Radii.sm,
        backgroundColor: AppColors.surface,
    },
    tabBtnActive: { backgroundColor: AppColors.primary },
    tabText: { fontSize: 12, fontWeight: '600', color: AppColors.textMuted },
    tabTextActive: { color: '#FFFFFF' },
    tabBadge: { backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
    tabBadgeText: { fontSize: 10, color: '#FFFFFF', fontWeight: '700' },

    scroll: { padding: Spacing.xl, gap: 8 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: '#FFFFFF',
        borderRadius: Radii.md,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    cardTitle: { fontSize: 14, color: AppColors.text, fontWeight: '700' },
    cardMeta: { fontSize: 12, color: AppColors.textMuted },

    deleteBtn: {
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: AppColors.error + '10',
    },

    rolePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radii.full },
    roleText: { fontSize: 11, fontWeight: '700' },

    auditRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
        backgroundColor: '#FFFFFF',
        borderRadius: Radii.md,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    auditDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: AppColors.primary, marginTop: 5 },

    emptyBlock: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 15, fontWeight: '600', color: AppColors.textSecondary, textAlign: 'center' },
});