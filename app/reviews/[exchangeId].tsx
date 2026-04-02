import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

export default function LeaveReviewScreen() {
  const { exchangeId } = useLocalSearchParams<{ exchangeId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { getChatById, getPendingReviewForExchange, submitReview } = useData();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const chat = getChatById(exchangeId);
  const pendingReview = user ? getPendingReviewForExchange(exchangeId, user.id) : undefined;

  if (!user || !chat || !pendingReview) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="checkmark-done-circle-outline" size={56} color="#2e7d32" />
        <Text style={styles.emptyStateTitle}>Review unavailable</Text>
        <Text style={styles.emptyStateText}>
          This review has already been submitted, or the exchange is not ready for review yet.
        </Text>
        <Pressable style={styles.secondaryButton} onPress={() => router.replace('/(tabs)/explore')}>
          <Text style={styles.secondaryButtonText}>Back to Profile</Text>
        </Pressable>
      </View>
    );
  }

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert('Rating required', 'Please choose a star rating before submitting.');
      return;
    }

    if (!comment.trim()) {
      Alert.alert('Written review required', 'Please add a few words about the exchange.');
      return;
    }

    submitReview({
      exchangeId: chat.id,
      reviewerId: user.id,
      reviewerName: user.name,
      revieweeId: pendingReview.revieweeId,
      revieweeName: pendingReview.revieweeName,
      rating,
      comment,
    });

    Alert.alert('Review submitted', 'Your feedback is now visible on the user profile.', [
      {
        text: 'View profile',
        onPress: () => router.replace('/(tabs)/explore'),
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>Leave a review</Text>
        <Text style={styles.title}>How was your exchange with {pendingReview.revieweeName}?</Text>
        <Text style={styles.subtitle}>{chat.listingTitle}</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Star rating</Text>
          <View style={styles.starsRow}>
            {Array.from({ length: 5 }, (_, index) => {
              const starValue = index + 1;

              return (
                <Pressable
                  key={starValue}
                  onPress={() => setRating(starValue)}
                  style={styles.starButton}>
                  <Ionicons
                    name={rating >= starValue ? 'star' : 'star-outline'}
                    size={34}
                    color={rating >= starValue ? '#fbc02d' : '#c7c7c7'}
                  />
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.ratingHint}>
            {rating === 0 ? 'Tap a star to rate the exchange.' : `${rating} out of 5 stars`}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Written review</Text>
          <TextInput
            style={styles.input}
            placeholder="Share what went well, how responsive they were, and whether you would barter again."
            multiline
            numberOfLines={6}
            value={comment}
            onChangeText={setComment}
            textAlignVertical="top"
          />
        </View>

        <Pressable style={styles.primaryButton} onPress={handleSubmit}>
          <Text style={styles.primaryButtonText}>Submit Review</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  eyebrow: {
    color: '#d32f2f',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#222',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: -6,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 18,
    gap: 14,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  starButton: {
    padding: 6,
  },
  ratingHint: {
    color: '#666',
  },
  input: {
    minHeight: 140,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    padding: 14,
    backgroundColor: '#fafafa',
    fontSize: 16,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: '#0056b3',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
  },
  emptyStateText: {
    color: '#666',
    textAlign: 'center',
    lineHeight: 21,
  },
  secondaryButton: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#eef4ff',
  },
  secondaryButtonText: {
    color: '#0056b3',
    fontWeight: '700',
  },
});