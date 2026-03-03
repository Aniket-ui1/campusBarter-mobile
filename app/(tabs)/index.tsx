
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { AppColors, CATEGORY_EMOJIS, Radii, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { useData } from '@/context/DataContext';
import { getRecommendedUsers, MatchedUser } from '@/lib/matching';
import { CATEGORIES } from '@/constants/categories';

export default function HomeScreen() {
  const { user } = useAuth();
  const { unreadCount, listings } = useData();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);
  const [matches, setMatches] = useState<MatchedUser[]>([]);

  const activeListings = listings.filter((l) => l.status === 'OPEN');
  const myListingsCount = listings.filter((l) => l.userId === user?.id).length;

  useEffect(() => {
    if (!user?.id || !user.profileComplete) return;
    getRecommendedUsers(user.id, user.skills ?? [], user.weaknesses ?? [], user.interests ?? [])
      .then(setMatches).catch(console.warn);
  }, [user?.id, user?.profileComplete]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (user?.id) {
      try {
        const m = await getRecommendedUsers(user.id, user.skills ?? [], user.weaknesses ?? [], user.interests ?? []);
        setMatches(m);
      } catch { }
    }
    await new Promise((r) => setTimeout(r, 400));
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusSpacer} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerLeft} onPress={() => router.push('/(tabs)/profile')}>
          <Avatar name={user?.displayName || 'User'} uri={user?.avatarUrl} size={42} />
          <View>
            <Text style={styles.greeting}>Welcome back 👋</Text>
            <Text style={styles.userName}>{user?.displayName?.split(' ')[0] || 'Student'}</Text>
          </View>
        </Pressable>
        <View style={styles.headerRight}>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={21} color={AppColors.text} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppColors.primary} />}
      >
        {/* Hero Banner */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.heroBanner}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Trade skills{'\n'}with students 🎓</Text>
            <Text style={styles.heroSubtitle}>Teach what you know, learn what you don&apos;t</Text>
            <Pressable style={styles.heroBtn} onPress={() => router.push('/(tabs)/search')}>
              <Text style={styles.heroBtnText}>Explore Skills</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
          {/* Stats pills */}
          <View style={styles.heroStats}>
            <Pressable style={styles.heroPill} onPress={() => router.push('/my-listings')}>
              <Text style={styles.heroPillNum}>{myListingsCount}</Text>
              <Text style={styles.heroPillLabel}>Listings</Text>
            </Pressable>
            <View style={styles.heroPillDivider} />
            <View style={styles.heroPill}>
              <Text style={styles.heroPillNum}>{user?.rating?.toFixed(1) || '—'}</Text>
              <Text style={styles.heroPillLabel}>Rating</Text>
            </View>
            <View style={styles.heroPillDivider} />
            <View style={styles.heroPill}>
              <Text style={styles.heroPillNum}>{activeListings.length}</Text>
              <Text style={styles.heroPillLabel}>Trending</Text>
            </View>
          </View>
        </Animated.View>

        {/* Categories */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <Text style={styles.sectionTitle}>Browse Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={styles.catScroll} contentContainerStyle={styles.catContent}>
            {CATEGORIES.filter(c => c.key !== 'all').map((cat, i) => (
              <Pressable key={cat.key} style={styles.catCard}
                onPress={() => router.push('/(tabs)/search')}>
                <Text style={styles.catEmoji}>{CATEGORY_EMOJIS[cat.key] ?? '✨'}</Text>
                <Text style={styles.catLabel}>{cat.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Recommended */}
        {matches.length > 0 && (
          <>
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🤝 Recommended</Text>
            </Animated.View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={styles.matchScroll} contentContainerStyle={styles.matchContent}>
              {matches.map((match, i) => (
                <Animated.View key={match.id} entering={FadeInRight.delay(i * 70).duration(400)}>
                  <Pressable style={styles.matchCard}
                    onPress={() => router.push({ pathname: '/user/[id]' as any, params: { id: match.id } })}>
                    <View style={styles.matchScoreBadge}>
                      <Text style={styles.matchScoreText}>{match.score}%</Text>
                    </View>
                    <Avatar name={match.displayName} uri={match.avatarUrl} size={48} />
                    <Text style={styles.matchName} numberOfLines={1}>{match.displayName}</Text>
                    {match.program && <Text style={styles.matchProgram} numberOfLines={1}>{match.program}</Text>}
                    {match.matchingSkills.length > 0 && (
                      <View style={styles.matchTag}>
                        <Text style={styles.matchTagText} numberOfLines={1}>
                          {match.matchingSkills.slice(0, 2).join(', ')}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                </Animated.View>
              ))}
            </ScrollView>
          </>
        )}

        {/* Feed */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🔥 Trending Skills</Text>
          <Pressable style={styles.seeAllPill} onPress={() => router.push('/(tabs)/search')}>
            <Text style={styles.seeAllText}>See all</Text>
            <Ionicons name="arrow-forward" size={12} color={AppColors.primary} />
          </Pressable>
        </Animated.View>

        {activeListings.map((listing, i) => (
          <Animated.View key={listing.id} entering={FadeInDown.delay(300 + i * 50).duration(400)}>
            <Card
              title={listing.title}
              userName={listing.userName}
              description={listing.description}
              credits={listing.credits}
              createdAt={listing.createdAt}
              onPress={() => router.push({ pathname: '/skill/[id]', params: { id: listing.id } })}
              onConnect={() => router.push({ pathname: '/skill/[id]', params: { id: listing.id } })}
              style={{ marginBottom: Spacing.md }}
            />
          </Animated.View>
        ))}

        {activeListings.length === 0 && (
          <View style={styles.emptyFeed}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>No skills posted yet</Text>
            <Text style={styles.emptyDesc}>Be the first to share your talent!</Text>
            <Pressable style={styles.heroBtn} onPress={() => router.push('/(tabs)/post')}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.heroBtnText}>Post a Skill</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  greeting: { fontSize: 12, color: AppColors.textMuted, fontWeight: '500' },
  userName: { fontSize: 18, fontWeight: '800', color: AppColors.text, letterSpacing: -0.3 },
  headerRight: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: {
    width: 42, height: 42, borderRadius: Radii.md,
    backgroundColor: AppColors.surface, borderWidth: 1, borderColor: AppColors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute', top: 2, right: 2,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: AppColors.error, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4, borderWidth: 2, borderColor: AppColors.background,
  },
  notifBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },

  scrollContent: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },

  // Hero
  heroBanner: {
    backgroundColor: AppColors.primaryDark,
    borderRadius: Radii.xl,
    overflow: 'hidden',
    marginBottom: Spacing['2xl'],
    ...Shadows.lg,
  } as any,
  heroContent: { padding: Spacing['2xl'], paddingBottom: Spacing.lg },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5, lineHeight: 34 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: Spacing.sm, lineHeight: 20 },
  heroBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radii.sm,
    marginTop: Spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  heroBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  heroStats: {
    flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.15)',
    paddingVertical: Spacing.md,
  },
  heroPill: { flex: 1, alignItems: 'center' },
  heroPillNum: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  heroPillLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginTop: 2 },
  heroPillDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 },

  // Categories
  catScroll: { marginBottom: Spacing['2xl'], marginHorizontal: -Spacing.xl },
  catContent: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
  catCard: {
    width: 80, paddingVertical: Spacing.lg,
    backgroundColor: '#FFFFFF', borderRadius: Radii.lg,
    alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: AppColors.border,
    ...Shadows.sm,
  } as any,
  catEmoji: { fontSize: 24 },
  catLabel: { fontSize: 11, fontWeight: '600', color: AppColors.textSecondary, textAlign: 'center' },

  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: AppColors.text, letterSpacing: -0.3 },
  seeAllPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: AppColors.primary + '12', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radii.full,
  },
  seeAllText: { fontSize: 12, color: AppColors.primary, fontWeight: '600' },

  // Matches
  matchScroll: { marginBottom: Spacing['2xl'], marginHorizontal: -Spacing.xl },
  matchContent: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
  matchCard: {
    width: 140, padding: Spacing.lg,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: AppColors.border,
    borderRadius: Radii.lg, alignItems: 'center', gap: 6,
    ...Shadows.sm,
  } as any,
  matchScoreBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: AppColors.primary, borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  matchScoreText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  matchName: { fontSize: 14, fontWeight: '700', color: AppColors.text, textAlign: 'center' },
  matchProgram: { fontSize: 11, color: AppColors.textMuted, textAlign: 'center' },
  matchTag: {
    backgroundColor: AppColors.primary + '12', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
  },
  matchTagText: { fontSize: 10, fontWeight: '600', color: AppColors.primary },

  // Empty
  emptyFeed: { alignItems: 'center', paddingVertical: Spacing['5xl'], gap: Spacing.md },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: AppColors.text },
  emptyDesc: { fontSize: 14, color: AppColors.textMuted },
});
