// app/reviews/[userId].tsx — Reviews Screen (Task 8)
// Shows all reviews for a user. Star rating + written review.
// Link from profile → /reviews/[userId]
// After exchange confirmed → prompt both users to leave a review.

import { EmptyState } from '@/components/ui/EmptyState';
import { AppColors, Radii, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getApiBase, resolveAuthToken } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Modal, Platform, Pressable,
    ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';


interface Review {
    id: string;
    reviewerId: string;
    reviewerName: string;
    rating: number;       // 1–5
    comment: string;
    createdAt: string;
}

function StarRow({ rating, size = 16, interactive = false, onSelect }: {
    rating: number; size?: number; interactive?: boolean; onSelect?: (r: number) => void;
}) {
    return (
        <View style={{ flexDirection: 'row', gap: 3 }}>
            {[1, 2, 3, 4, 5].map(i => (
                <Pressable key={i} onPress={() => interactive && onSelect?.(i)} disabled={!interactive}>
                    <Ionicons
                        name={i <= rating ? 'star' : 'star-outline'}
                        size={size}
                        color={i <= rating ? '#F59E0B' : AppColors.border}
                    />
                </Pressable>
            ))}
        </View>
    );
}

export default function ReviewsScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const router = useRouter();
    const navigation = useNavigation();
    const { user } = useAuth();

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
            const token = resolveAuthToken();
            const res = await fetch(`${getApiBase()}/api/reviews/${userId}`, {
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

    useFocusEffect(
        useCallback(() => {
            navigation.setOptions({
                headerShown: true,
            });
        }, [navigation])
    );

    useEffect(() => { void loadReviews(); }, [userId]);

    const handleSubmit = async () => {
        if (!newComment.trim()) { Alert.alert('Please write a review comment'); return; }
        setSubmitting(true);
        try {
            const token = resolveAuthToken();
            const res = await fetch(`${getApiBase()}/api/reviews`, {
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
        <View style={styles.container}>
            <View style={styles.statusSpacer} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={AppColors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Reviews</Text>
                {canReview ? (
                    <Pressable style={styles.addBtn} onPress={() => setShowModal(true)}>
                        <Ionicons name="add" size={20} color={AppColors.primary} />
                    </Pressable>
                ) : (
                    <View style={{ width: 40 }} />
                )}
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator color={AppColors.primary} /></View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    {/* Summary card */}
                    {reviews.length > 0 && (
                        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.summaryCard}>
                            <Text style={styles.avgNum}>{avgRating.toFixed(1)}</Text>
                            <StarRow rating={Math.round(avgRating)} size={22} />
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
                                <View style={styles.reviewCard}>
                                    <View style={styles.reviewHeader}>
                                        <View style={styles.reviewerInfo}>
                                            <Text style={styles.reviewerName}>{r.reviewerName}</Text>
                                            <Text style={styles.reviewDate}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                                        </View>
                                        <StarRow rating={r.rating} size={14} />
                                    </View>
                                    <Text style={styles.reviewComment}>{r.comment}</Text>
                                </View>
                            </Animated.View>
                        ))
                    )}
                </ScrollView>
            )}

            {/* Leave a review modal */}
            <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Leave a Review</Text>
                        <Text style={styles.modalLabel}>Rating</Text>
                        <StarRow rating={newRating} size={36} interactive onSelect={setNewRating} />
                        <Text style={[styles.modalLabel, { marginTop: Spacing.lg }]}>Comment</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Describe your experience..."
                            placeholderTextColor={AppColors.textMuted}
                            value={newComment}
                            onChangeText={setNewComment}
                            multiline
                            maxLength={500}
                        />
                        <View style={styles.modalBtns}>
                            <Pressable style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
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
    container: { flex: 1, backgroundColor: AppColors.background },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: AppColors.border,
    },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: AppColors.surface, alignItems: 'center', justifyContent: 'center' },
    addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: AppColors.primary + '15', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: AppColors.text },

    scroll: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl, gap: Spacing.md },

    summaryCard: {
        backgroundColor: AppColors.primaryDark, borderRadius: Radii.xl,
        padding: Spacing['2xl'], alignItems: 'center', gap: 8, ...(Shadows.md as any),
    },
    avgNum: { fontSize: 56, fontWeight: '900', color: '#FFFFFF', letterSpacing: -2 },
    reviewCount: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },

    reviewCard: {
        backgroundColor: '#FFFFFF', borderRadius: Radii.lg,
        padding: Spacing.lg, borderWidth: 1, borderColor: AppColors.border, gap: 8,
    },
    reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    reviewerInfo: { gap: 2 },
    reviewerName: { fontSize: 14, fontWeight: '700', color: AppColors.text },
    reviewDate: { fontSize: 11, color: AppColors.textMuted },
    reviewComment: { fontSize: 14, color: AppColors.textSecondary, lineHeight: 21 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalCard: {
        backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: Spacing['2xl'], paddingBottom: 48, gap: 8,
    },
    modalTitle: { fontSize: 20, fontWeight: '800', color: AppColors.text, marginBottom: 8 },
    modalLabel: { fontSize: 13, fontWeight: '600', color: AppColors.textSecondary },
    modalInput: {
        backgroundColor: AppColors.surface, borderRadius: Radii.md,
        padding: Spacing.md, fontSize: 15, color: AppColors.text,
        minHeight: 100, textAlignVertical: 'top',
        borderWidth: 1, borderColor: AppColors.border,
    },
    modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: {
        flex: 1, paddingVertical: 14, borderRadius: Radii.md,
        backgroundColor: AppColors.surface, alignItems: 'center',
        borderWidth: 1, borderColor: AppColors.border,
    },
    cancelText: { fontSize: 15, fontWeight: '600', color: AppColors.textSecondary },
    submitBtn: {
        flex: 1, paddingVertical: 14, borderRadius: Radii.md,
        backgroundColor: AppColors.primary, alignItems: 'center',
    },
    submitText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
