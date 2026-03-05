
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeletonList } from '@/components/ui/Skeleton';
import { CATEGORIES } from '@/constants/categories';
import { CATEGORY_EMOJIS, Radii, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { triggerHaptic } from '@/hooks/useAnimations';
import { getRecommendedUsers, MatchedUser } from '@/lib/matching';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

export default function HomeScreen() {
  const { user } = useAuth();
  const { mode, colors } = useTheme();
  const { unreadCount, listings } = useData();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);
  const [matches, setMatches] = useState<MatchedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const activeListings = listings.filter((l) => l.status === 'OPEN');
  const myListingsCount = listings.filter((l) => l.userId === user?.id).length;

  useEffect(() => {
    if (!user?.id || !user.profileComplete) {
      setIsLoading(false);
      return;
    }
    getRecommendedUsers(user.id, user.skills ?? [], user.weaknesses ?? [], user.interests ?? [])
      .then(setMatches).catch(console.warn).finally(() => setIsLoading(false));
  }, [user?.id, user?.profileComplete]);

  const onRefresh = async () => {
    setRefreshing(true);
    triggerHaptic('light');
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.statusSpacer} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerLeft} onPress={() => router.push('/(tabs)/profile')}>
          <Avatar name={user?.displayName || 'User'} uri={user?.avatarUrl} size={42} />
          <View>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>Welcome back 👋</Text>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.displayName?.split(' ')[0] || 'Student'}</Text>
          </View>
        </Pressable>
        <View style={styles.headerRight}>
          <Pressable style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={21} color={colors.text} />
            {unreadCount > 0 && (
              <View style={[styles.notifBadge, { backgroundColor: colors.error, borderColor: colors.background }]}>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Hero Banner */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.heroBanner}>
          <LinearGradient
            colors={[colors.gradientFrom, colors.gradientTo]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>Trade skills{'\n'}with students 🎓</Text>
              <Text style={styles.heroSubtitle}>Teach what you know, learn what you don&apos;t</Text>
              <Pressable style={styles.heroBtn} onPress={() => { triggerHaptic('light'); router.push('/(tabs)/search'); }}>
                <Text style={styles.heroBtnText}>Explore Skills</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
            {/* Stats pills */}
            <View style={[styles.heroStats, { backgroundColor: colors.secondary + '30' }]}>
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
          </LinearGradient>
        </Animated.View>

        {/* Categories */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Browse Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={styles.catScroll} contentContainerStyle={styles.catContent}>
            {CATEGORIES.filter(c => c.key !== 'all').map((cat, i) => (
              <Pressable key={cat.key} style={[styles.catCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => { triggerHaptic('light'); router.push('/(tabs)/search'); }}>
                <Text style={styles.catEmoji}>{CATEGORY_EMOJIS[cat.key] ?? '✨'}</Text>
                <Text style={[styles.catLabel, { color: colors.textSecondary }]}>{cat.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Recommended */}
        {matches.length > 0 && (
          <>
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>🤝 Recommended</Text>
            </Animated.View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={styles.matchScroll} contentContainerStyle={styles.matchContent}>
              {matches.map((match, i) => (
                <Animated.View key={match.id} entering={FadeInRight.delay(i * 70).duration(400)}>
                  <Pressable style={[styles.matchCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => { triggerHaptic('light'); router.push({ pathname: '/user/[id]' as any, params: { id: match.id } }); }}>
                    <View style={[styles.matchScoreBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.matchScoreText}>{match.score}%</Text>
                    </View>
                    <Avatar name={match.displayName} uri={match.avatarUrl} size={48} />
                    <Text style={[styles.matchName, { color: colors.text }]} numberOfLines={1}>{match.displayName}</Text>
                    {match.program && <Text style={[styles.matchProgram, { color: colors.textMuted }]} numberOfLines={1}>{match.program}</Text>}
                    {match.matchingSkills.length > 0 && (
                      <View style={[styles.matchTag, { backgroundColor: colors.primary + '12' }]}>
                        <Text style={[styles.matchTagText, { color: colors.primary }]} numberOfLines={1}>
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🔥 Trending Skills</Text>
          <Pressable style={[styles.seeAllPill, { backgroundColor: colors.primary + '12' }]} onPress={() => router.push('/(tabs)/search')}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>See all</Text>
            <Ionicons name="arrow-forward" size={12} color={colors.primary} />
          </Pressable>
        </Animated.View>

        {isLoading ? (
          <CardSkeletonList count={3} />
        ) : activeListings.length === 0 ? (
          <EmptyState
            icon="🌱"
            title="No skills posted yet"
            description="Be the first to share your talent!"
            actionLabel="Post a Skill"
            onAction={() => router.push('/(tabs)/post')}
          />
        ) : (
          activeListings.map((listing, i) => (
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
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  greeting: { fontSize: 12, fontWeight: '500' },
  userName: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  headerRight: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: {
    width: 42, height: 42, borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute', top: 2, right: 2,
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4, borderWidth: 2,
  },
  notifBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },

  scrollContent: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },

  // Hero
  heroBanner: {
    borderRadius: Radii.xl,
    overflow: 'hidden',
    marginBottom: Spacing['2xl'],
    ...Shadows.lg,
  } as any,
  heroGradient: {
    borderRadius: Radii.xl,
  },
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
    borderRadius: Radii.lg,
    alignItems: 'center', gap: 6,
    borderWidth: 1,
    ...Shadows.sm,
  } as any,
  catEmoji: { fontSize: 24 },
  catLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  sectionTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  seeAllPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radii.full,
  },
  seeAllText: { fontSize: 12, fontWeight: '600' },

  // Matches
  matchScroll: { marginBottom: Spacing['2xl'], marginHorizontal: -Spacing.xl },
  matchContent: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
  matchCard: {
    width: 140, padding: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radii.lg, alignItems: 'center', gap: 6,
    ...Shadows.sm,
  } as any,
  matchScoreBadge: {
    position: 'absolute', top: 8, right: 8,
    borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  matchScoreText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  matchName: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  matchProgram: { fontSize: 11, textAlign: 'center' },
  matchTag: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
  },
  matchTagText: { fontSize: 10, fontWeight: '600' },
});
