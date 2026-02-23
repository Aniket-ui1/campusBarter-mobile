
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { MOCK_LISTINGS } from '@/data/mock';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const activeListings = MOCK_LISTINGS.filter((l) => l.status === 'active');

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusSpacer} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Avatar name={user?.displayName || 'User'} size={40} />
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.displayName?.split(' ')[0] || 'Student'}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={22} color={AppColors.text} />
            <View style={styles.notifDot} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppColors.primary} />}
      >
        {/* Quick stats */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statsRow}>
          <Pressable style={styles.statCard} onPress={() => router.push('/my-listings')}>
            <Text style={styles.statNum}>{MOCK_LISTINGS.filter((l) => l.userId === user?.id).length}</Text>
            <Text style={styles.statLabel}>My Listings</Text>
          </Pressable>
          <Pressable style={styles.statCard} onPress={() => router.push('/my-requests')}>
            <Text style={styles.statNum}>3</Text>
            <Text style={styles.statLabel}>Requests</Text>
          </Pressable>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{user?.rating?.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </Animated.View>

        {/* Section header */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending Skills</Text>
          <Pressable onPress={() => router.push('/(tabs)/search')}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </Animated.View>

        {/* Listing cards */}
        {activeListings.map((listing, i) => (
          <Animated.View key={listing.id} entering={FadeInDown.delay(250 + i * 60).duration(400)}>
            <Card
              title={listing.title}
              userName={listing.userName}
              userAvatar={listing.userAvatar}
              category={listing.category}
              description={listing.description}
              credits={listing.credits}
              rating={listing.rating}
              availability={listing.availability}
              onPress={() => router.push({ pathname: '/skill/[id]', params: { id: listing.id } })}
              onConnect={() => router.push({ pathname: '/skill/[id]', params: { id: listing.id } })}
              style={{ marginBottom: Spacing.md }}
            />
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: AppColors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  greeting: { fontSize: 12, color: AppColors.textSecondary },
  userName: { fontSize: 17, fontWeight: '800', color: AppColors.text },
  headerRight: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: AppColors.surface, borderWidth: 1, borderColor: AppColors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: AppColors.error,
  },

  scrollContent: { padding: Spacing.xl, paddingBottom: 40 },

  statsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  statCard: {
    flex: 1, backgroundColor: AppColors.surfaceLight,
    borderWidth: 1, borderColor: AppColors.border, borderRadius: Radii.lg,
    paddingVertical: Spacing.lg, alignItems: 'center', gap: 4,
  },
  statNum: { fontSize: 22, fontWeight: '900', color: AppColors.primary },
  statLabel: { fontSize: 11, color: AppColors.textSecondary, fontWeight: '500' },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.lg,

  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: AppColors.text },
  seeAll: { fontSize: 13, color: AppColors.primary, fontWeight: '600' },
});
