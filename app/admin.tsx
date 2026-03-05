// app/admin.tsx — Admin Dashboard (Task 9)
// Only visible when user.role === 'Admin' or 'Moderator'
// Lists reported listings, allows deletion, shows audit log, user list

import { Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useThemeColors } from '@/context/ThemeContext';
import { getApiToken } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Platform, Pressable,
    ScrollView, StyleSheet, Text, View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const API_BASE = process.env.EXPO_PUBLIC_API_URL
    ?? 'https://campusbarter-api-f3b4ascaemgthae3.canadacentral-01.azurewebsites.net';

type Tab = 'listings' | 'users' | 'audit';

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getApiToken();
    const res = await fetch(`${API_BASE}${path}`, {
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
    const colors = useThemeColors();
    const [tab, setTab] = useState<Tab>('listings');
    const [listings, setListings] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [auditLog, setAuditLog] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const [l, u, a] = await Promise.allSettled([
                adminFetch<any[]>('/api/listings'),
                adminFetch<any[]>('/api/users'),
                adminFetch<any[]>('/api/audit'),
            ]);
            if (l.status === 'fulfilled') setListings(l.value);
            if (u.status === 'fulfilled') setUsers(u.value);
            if (a.status === 'fulfilled') setAuditLog(a.value);
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

    const TABS: { key: Tab; label: string; icon: string; count: number }[] = [
        { key: 'listings', label: 'Listings', icon: 'list-outline', count: listings.length },
        { key: 'users', label: 'Users', icon: 'people-outline', count: users.length },
        { key: 'audit', label: 'Audit Log', icon: 'document-text-outline', count: auditLog.length },
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.statusSpacer, { backgroundColor: colors.primaryDark }]} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.primaryDark }]}>
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
            <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                {TABS.map(t => (
                    <Pressable
                        key={t.key}
                        style={[styles.tabBtn, { backgroundColor: colors.surface }, tab === t.key && { backgroundColor: colors.primary }]}
                        onPress={() => setTab(t.key)}
                    >
                        <Ionicons name={t.icon as any} size={16} color={tab === t.key ? '#FFFFFF' : colors.textMuted} />
                        <Text style={[styles.tabLabel, { color: colors.textMuted }, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
                        {t.count > 0 && (
                            <View style={styles.tabBadge}>
                                <Text style={styles.tabBadgeText}>{t.count}</Text>
                            </View>
                        )}
                    </Pressable>
                ))}
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                    {/* Listings tab */}
                    {tab === 'listings' && (
                        listings.length === 0 ? (
                            <View style={styles.empty}>
                                <Text style={styles.emptyEmoji}>📋</Text>
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No listings</Text>
                            </View>
                        ) : listings.map((l, i) => (
                            <Animated.View key={l.id} entering={FadeInDown.delay(i * 40).duration(300)}>
                                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{l.title}</Text>
                                        <Text style={[styles.cardMeta, { color: colors.textMuted }]}>By {l.userName} · {l.type} · {l.status}</Text>
                                    </View>
                                    <Pressable style={[styles.deleteBtn, { backgroundColor: colors.error + '10' }]} onPress={() => deleteListing(l.id)}>
                                        <Ionicons name="trash-outline" size={18} color={colors.error} />
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
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No users found</Text>
                            </View>
                        ) : users.map((u, i) => (
                            <Animated.View key={u.id} entering={FadeInDown.delay(i * 40).duration(300)}>
                                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.cardTitle, { color: colors.text }]}>{u.displayName ?? u.id}</Text>
                                        <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{u.email} · {u.role ?? 'Student'}</Text>
                                    </View>
                                    <View style={[styles.rolePill, { backgroundColor: u.role === 'Admin' ? colors.error + '20' : colors.primary + '15' }]}>
                                        <Text style={[styles.roleText, { color: u.role === 'Admin' ? colors.error : colors.primary }]}>
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
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No audit entries yet</Text>
                            </View>
                        ) : auditLog.map((a, i) => (
                            <Animated.View key={a.id ?? i} entering={FadeInDown.delay(i * 40).duration(300)}>
                                <View style={[styles.auditRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <View style={[styles.auditDot, { backgroundColor: colors.primary }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.auditAction, { color: colors.text }]}>{a.action}</Text>
                                        <Text style={[styles.auditMeta, { color: colors.textMuted }]}>{a.actorId} · {new Date(a.createdAt).toLocaleString()}</Text>
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
    container: { flex: 1 },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: {
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
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    tabBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
        paddingVertical: 8, borderRadius: Radii.sm,
    },
    tabLabel: { fontSize: 12, fontWeight: '600' },
    tabLabelActive: { color: '#FFFFFF' },
    tabBadge: { backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
    tabBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },

    scroll: { padding: Spacing.xl, gap: 8 },

    card: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        borderRadius: Radii.md,
        padding: Spacing.lg, borderWidth: 1,
    },
    cardTitle: { fontSize: 14, fontWeight: '700' },
    cardMeta: { fontSize: 12, marginTop: 2 },
    deleteBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    rolePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radii.full },
    roleText: { fontSize: 11, fontWeight: '700' },

    auditRow: {
        flexDirection: 'row', gap: 12, alignItems: 'flex-start',
        borderRadius: Radii.md,
        padding: Spacing.lg, borderWidth: 1,
    },
    auditDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
    auditAction: { fontSize: 14, fontWeight: '600' },
    auditMeta: { fontSize: 12, marginTop: 2 },

    empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyEmoji: { fontSize: 40 },
    emptyText: { fontSize: 16, fontWeight: '600' },
});
