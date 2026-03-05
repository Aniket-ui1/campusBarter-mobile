import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useThemeColors } from '@/context/ThemeContext';
import { getUserProfile } from '@/lib/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function UserProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const { listings, startChat } = useData();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const colors = useThemeColors();

    useEffect(() => {
        if (!id) return;
        getUserProfile(id).then((p) => {
            setProfile(p);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [id]);

    const userListings = listings.filter((l) => l.userId === id && l.status === 'OPEN');
    const isMe = currentUser?.id === id;

    const handleMessage = async () => {
        if (!currentUser || !id) return;
        try {
            const chatId = await startChat('profile', `Chat with ${profile?.displayName || 'User'}`, [currentUser.id, id]);
            router.push({ pathname: '/chat/[id]', params: { id: chatId } });
        } catch { }
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.statusSpacer} />
                <View style={styles.header}>
                    <Pressable style={[styles.backBtn, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={colors.text} />
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.center}><Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text></View>
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.statusSpacer} />
                <View style={styles.header}>
                    <Pressable style={[styles.backBtn, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={colors.text} />
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.center}>
                    <Text style={styles.emptyEmoji}>👤</Text>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>User not found</Text>
                    <Button title="Go Back" onPress={() => router.back()} variant="secondary" />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.statusSpacer} />

            <View style={styles.header}>
                <Pressable style={[styles.backBtn, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Profile Card */}
                <Animated.View entering={FadeInDown.delay(100).duration(400)} style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Avatar name={profile.displayName || 'User'} size={80} />
                    <Text style={[styles.name, { color: colors.text }]}>{profile.displayName || 'User'}</Text>
                    {profile.program && (
                        <Text style={[styles.program, { color: colors.textSecondary }]}>{profile.program}{profile.semester ? ` · Sem ${profile.semester}` : ''}</Text>
                    )}
                    {profile.bio && <Text style={[styles.bio, { color: colors.textSecondary }]}>{profile.bio}</Text>}

                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Text style={[styles.statNum, { color: colors.primary }]}>{userListings.length}</Text>
                            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Listings</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={[styles.statNum, { color: colors.primary }]}>{profile.rating?.toFixed(1) || '—'}</Text>
                            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Rating</Text>
                        </View>
                    </View>

                    {/* Skills */}
                    {profile.skills?.length > 0 && (
                        <View style={styles.tagsSection}>
                            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SKILLS</Text>
                            <View style={styles.tagsRow}>
                                {profile.skills.map((s: string) => (
                                    <Badge key={s} label={s} variant="primary" />
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Interests */}
                    {profile.interests?.length > 0 && (
                        <View style={styles.tagsSection}>
                            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>INTERESTS</Text>
                            <View style={styles.tagsRow}>
                                {profile.interests.map((s: string) => (
                                    <Badge key={s} label={s} variant="subtle" />
                                ))}
                            </View>
                        </View>
                    )}
                </Animated.View>

                {/* Message CTA */}
                {!isMe && (
                    <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.ctaRow}>
                        <Button
                            title="Send Message"
                            onPress={handleMessage}
                            fullWidth
                            icon={<Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />}
                        />
                    </Animated.View>
                )}

                {/* Their listings */}
                {userListings.length > 0 && (
                    <>
                        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                {isMe ? 'Your Listings' : `${(profile.displayName || 'User').split(' ')[0]}'s Listings`}
                            </Text>
                        </Animated.View>
                        {userListings.map((listing, i) => (
                            <Animated.View key={listing.id} entering={FadeInDown.delay(350 + i * 60).duration(400)}>
                                <Card
                                    title={listing.title}
                                    userName={listing.userName}
                                    description={listing.description}
                                    credits={listing.credits}
                                    onPress={() => router.push({ pathname: '/skill/[id]', params: { id: listing.id } })}
                                    style={{ marginBottom: Spacing.md }}
                                />
                            </Animated.View>
                        ))}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg,
    },
    backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: Spacing.md },
    loadingText: { fontSize: 15 },
    emptyEmoji: { fontSize: 48 },
    emptyTitle: { fontSize: 20, fontWeight: '700' },

    profileCard: {
        borderWidth: 1,
        borderRadius: Radii.lg, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    name: { fontSize: 22, fontWeight: '900' },
    program: { fontSize: 14 },
    bio: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
    statsRow: { flexDirection: 'row', gap: Spacing.xl, marginTop: Spacing.sm },
    stat: { alignItems: 'center' },
    statNum: { fontSize: 20, fontWeight: '900' },
    statLabel: { fontSize: 11, fontWeight: '500' },
    tagsSection: { width: '100%', marginTop: Spacing.sm },
    sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5, marginBottom: Spacing.sm },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    ctaRow: { marginBottom: Spacing.xl },
    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: Spacing.md },
});
