// app/reviews/[userId].tsx — Reviews Screen (Task 8)
// Shows all reviews for a user. Star rating + written review.
// Link from profile → /reviews/[userId]
// After exchange confirmed → prompt both users to leave a review.

import { EmptyState } from '@/components/ui/EmptyState';
import { Radii, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useThemeColors } from '@/context/ThemeContext';
import { getApiToken } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Modal, Platform, Pressable,
    ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const API_BASE = process.env.EXPO_PUBLIC_API_URL
    ?? 'https://campusbarter-api-f3b4ascaemgthae3.canadacentral-01.azurewebsites.net';

interface Review {
    id: string;
    reviewerId: string;
    reviewerName: string;
    rating: number;       // 1–5
    comment: string;
    createdAt: string;
}

function StarRow({ rating, size = 16, interactive = false, onSelect, colors }: {
    rating: number; size?: number; interactive?: boolean; onSelect?: (r: number) => void; colors: any;
}) {
    return (
        <View style={{ flexDirection: 'row', gap: 3 }}>
            {[1, 2, 3, 4, 5].map(i => (
                <Pressable key={i} onPress={() => interactive && onSelect?.(i)} disabled={!interactive}>
                    <Ionicons
                        name={i <= rating ? 'star' : 'star-outline'}
                        size={size}
                        color={i <= rating ? '#F59E0B' : colors.border}
                    />
                </Pressable>
            ))}
        </View>
    );
}

export default function ReviewsScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const colors = useThemeColors();

    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newRating, setNewRating] = useState(5);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const avgRating = reviews.length
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : 0;

    const loadReviews = async () => {
        try {
            const token = getApiToken();
            const res = await fetch(`${API_BASE}/api/reviews/${userId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) return;
            const data = await res.json();
            setReviews(data);
        } catch (e) {
            console.warn('[Reviews] Load error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void loadReviews(); }, [userId]);

    const handleSubmit = async () => {
        if (!newComment.trim()) { Alert.alert('Please write a review comment'); return; }
        setSubmitting(true);
        try {
            const token = getApiToken();
            const res = await fetch(`${API_BASE}/api/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ subjectId: userId, rating: newRating, comment: newComment.trim() }),
            });
            if (!res.ok) throw new Error('Failed');
            Alert.alert('✅ Review submitted!');
            setShowModal(false);
            setNewComment('');
            setNewRating(5);
            await loadReviews();
        } catch {
            Alert.alert('Error', 'Could not submit review. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const canReview = user && user.id !== userId;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.statusSpacer} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Pressable style={[styles.backBtn, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Reviews</Text>
                {canReview ? (
                    <Pressable style={[styles.addBtn, { backgroundColor: colors.primary + '15' }]} onPress={() => setShowModal(true)}>
                        <Ionicons name="add" size={20} color={colors.primary} />
                    </Pressable>
                ) : (
                    <View style={{ width: 40 }} />
                )}
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    {/* Summary card */}
                    {reviews.length > 0 && (
                        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={[styles.summaryCard, { backgroundColor: colors.primaryDark }]}>
                            <Text style={styles.avgNum}>{avgRating.toFixed(1)}</Text>
                            <StarRow rating={Math.round(avgRating)} size={22} colors={colors} />
                            <Text style={styles.reviewCount}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</Text>
                        </Animated.View>
                    )}

                    {reviews.length === 0 ? (
                        <EmptyState
                            icon="⭐"
                            title="No reviews yet"
                            description="Reviews from completed exchanges will appear here."
                        />
                    ) : (
                        reviews.map((r, i) => (
                            <Animated.View key={r.id} entering={FadeInDown.delay(130 + i * 60).duration(400)}>
                                <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <View style={styles.reviewHeader}>
                                        <View style={styles.reviewerInfo}>
                                            <Text style={[styles.reviewerName, { color: colors.text }]}>{r.reviewerName}</Text>
                                            <Text style={[styles.reviewDate, { color: colors.textMuted }]}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                                        </View>
                                        <StarRow rating={r.rating} size={14} colors={colors} />
                                    </View>
                                    <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>{r.comment}</Text>
                                </View>
                            </Animated.View>
                        ))
                    )}
                </ScrollView>
            )}

            {/* Leave a review modal */}
            <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Leave a Review</Text>
                        <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Rating</Text>
                        <StarRow rating={newRating} size={36} interactive onSelect={setNewRating} colors={colors} />
                        <Text style={[styles.modalLabel, { marginTop: Spacing.lg, color: colors.textSecondary }]}>Comment</Text>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                            placeholder="Describe your experience..."
                            placeholderTextColor={colors.textMuted}
                            value={newComment}
                            onChangeText={setNewComment}
                            multiline
                            maxLength={500}
                        />
                        <View style={styles.modalBtns}>
                            <Pressable style={[styles.cancelBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowModal(false)}>
                                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                            </Pressable>
                            <Pressable style={[styles.submitBtn, { backgroundColor: colors.primary }, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
                                <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit'}</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700' },

    scroll: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl, gap: Spacing.md },

    summaryCard: {
        borderRadius: Radii.xl,
        padding: Spacing['2xl'], alignItems: 'center', gap: 8, ...(Shadows.md as any),
    },
    avgNum: { fontSize: 56, fontWeight: '900', color: '#FFFFFF', letterSpacing: -2 },
    reviewCount: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },

    reviewCard: {
        borderRadius: Radii.lg,
        padding: Spacing.lg, borderWidth: 1, gap: 8,
    },
    reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    reviewerInfo: { gap: 2 },
    reviewerName: { fontSize: 14, fontWeight: '700' },
    reviewDate: { fontSize: 11 },
    reviewComment: { fontSize: 14, lineHeight: 21 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalCard: {
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: Spacing['2xl'], paddingBottom: 48, gap: 8,
    },
    modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
    modalLabel: { fontSize: 13, fontWeight: '600' },
    modalInput: {
        borderRadius: Radii.md,
        padding: Spacing.md, fontSize: 15,
        minHeight: 100, textAlignVertical: 'top',
        borderWidth: 1,
    },
    modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: {
        flex: 1, paddingVertical: 14, borderRadius: Radii.md,
        alignItems: 'center',
        borderWidth: 1,
    },
    cancelText: { fontSize: 15, fontWeight: '600' },
    submitBtn: {
        flex: 1, paddingVertical: 14, borderRadius: Radii.md,
        alignItems: 'center',
    },
    submitText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
