<<<<<<< Updated upstream
import { Redirect } from 'expo-router';

/**
 * This screen is hidden from the tab bar (href: null in _layout.tsx).
 * It exists only because Expo Router requires the file for the registered route.
 * All explore content is now in (tabs)/index.tsx.
 */
export default function ExploreScreen() {
  return <Redirect href="/(tabs)" />;
}
=======
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

const renderStars = (rating: number) =>
  Array.from({ length: 5 }, (_, index) => (
    <Ionicons
      key={`${rating}-${index}`}
      name={index < rating ? 'star' : 'star-outline'}
      size={16}
      color="#fbc02d"
    />
  ));

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { getAverageRatingForUser, getPendingReviewsForUser, getReviewsForUser } = useData();

  if (!user) {
    return (
      <View style={styles.emptyScreen}>
        <Text style={styles.emptyScreenTitle}>No profile available</Text>
      </View>
    );
  }

  const pendingReviews = getPendingReviewsForUser(user.id);
  const receivedReviews = getReviewsForUser(user.id);
  const averageRating = getAverageRatingForUser(user.id);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={30} color="#d32f2f" />
          </View>
          <View style={styles.profileMeta}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
          <Pressable style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutButtonText}>Log out</Text>
          </Pressable>
        </View>
        <Text style={styles.bio}>{user.bio || 'Trusted campus barter member.'}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{user.credits}</Text>
          <Text style={styles.statLabel}>Credits</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{receivedReviews.length > 0 ? averageRating.toFixed(1) : 'New'}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{receivedReviews.length}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending Reviews</Text>
        {pendingReviews.length > 0 ? (
          pendingReviews.map((review) => (
            <View key={`${review.exchangeId}-${review.revieweeId}`} style={styles.pendingCard}>
              <View style={styles.pendingCopy}>
                <Text style={styles.pendingTitle}>Review {review.revieweeName}</Text>
                <Text style={styles.pendingText}>{review.listingTitle}</Text>
              </View>
              <Pressable
                style={styles.pendingButton}
                onPress={() => router.push(`/reviews/${review.exchangeId}`)}>
                <Text style={styles.pendingButtonText}>Leave Review</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardTitle}>Nothing waiting right now</Text>
            <Text style={styles.emptyCardText}>
              Confirm an exchange in chat and the review prompt will appear here.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reviews on Your Profile</Text>
        {receivedReviews.length > 0 ? (
          receivedReviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View>
                  <Text style={styles.reviewAuthor}>{review.reviewerName}</Text>
                  <View style={styles.reviewStars}>{renderStars(review.rating)}</View>
                </View>
                <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.reviewText}>{review.comment}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardTitle}>No reviews yet</Text>
            <Text style={styles.emptyCardText}>
              Your received ratings and written feedback will appear here after completed exchanges.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    gap: 18,
    paddingBottom: 40,
  },
  emptyScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyScreenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fdecea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMeta: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#222',
  },
  email: {
    color: '#666',
  },
  bio: {
    color: '#444',
    lineHeight: 21,
  },
  logoutButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#eef4ff',
  },
  logoutButtonText: {
    color: '#0056b3',
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#222',
  },
  statLabel: {
    color: '#666',
    fontWeight: '600',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#222',
  },
  pendingCard: {
    backgroundColor: '#fff8e1',
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  pendingCopy: {
    gap: 4,
  },
  pendingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#7a4f01',
  },
  pendingText: {
    color: '#8a6d1d',
    lineHeight: 20,
  },
  pendingButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#f57c00',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pendingButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  reviewCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  reviewAuthor: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 6,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    color: '#999',
    fontSize: 12,
  },
  reviewText: {
    color: '#444',
    lineHeight: 21,
  },
  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 18,
    gap: 8,
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  emptyCardText: {
    color: '#666',
    lineHeight: 21,
  },
});
>>>>>>> Stashed changes
