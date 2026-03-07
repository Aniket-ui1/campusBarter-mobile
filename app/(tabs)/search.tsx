import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { CATEGORIES, SKILLS_OPTIONS } from '@/constants/categories';
import { CATEGORY_COLORS, CATEGORY_EMOJIS, Radii, Shadows, Spacing } from '@/constants/theme';
import { useData } from '@/context/DataContext';
import { useThemeColors } from '@/context/ThemeContext';
import { triggerHaptic } from '@/hooks/useAnimations';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function SearchScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ category?: string }>();
    const { listings } = useData();
    const colors = useThemeColors();
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState(params.category || 'all');
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [showSkillFilter, setShowSkillFilter] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>(params.category ? 'grid' : 'list');
    const catScrollRef = useRef<ScrollView>(null);
    const screenWidth = Dimensions.get('window').width;

    // When navigated with a category param, auto-select it
    useEffect(() => {
        if (params.category && params.category !== activeCategory) {
            setActiveCategory(params.category);
            setViewMode('grid');
        }
    }, [params.category]);

    const gridCols = screenWidth < 500 ? 2 : 3;
    const gridCardWidth = (screenWidth - Spacing.xl * 2 - Spacing.md * (gridCols - 1)) / gridCols;

    const toggleSkill = (skill: string) => {
        setSelectedSkills((prev) =>
            prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
        );
    };

    const filtered = listings.filter((l) => {
        if (l.status !== 'OPEN') return false;
        const matchCat = activeCategory === 'all' || (l as any).category === activeCategory;
        const matchSearch = l.title.toLowerCase().includes(search.toLowerCase()) ||
            l.description.toLowerCase().includes(search.toLowerCase());
        const matchSkill = selectedSkills.length === 0 || selectedSkills.some((skill) =>
            (l as any).tags?.some((t: string) => t.toLowerCase().includes(skill.toLowerCase())) ||
            l.title.toLowerCase().includes(skill.toLowerCase()) ||
            l.description.toLowerCase().includes(skill.toLowerCase())
        );
        return matchCat && matchSearch && matchSkill;
    });

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.statusSpacer} />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        {activeCategory !== 'all' ? 'Browse' : 'Discover'}
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                        {activeCategory !== 'all' ? 'Discover what you love' : 'Find the perfect skill match'}
                    </Text>
                </View>
                {/* View toggle */}
                <View style={styles.viewToggle}>
                    <Pressable
                        style={[styles.viewToggleBtn, viewMode === 'list' && { backgroundColor: colors.primary }]}
                        onPress={() => setViewMode('list')}
                    >
                        <Ionicons name="list" size={16} color={viewMode === 'list' ? '#FFFFFF' : colors.textMuted} />
                    </Pressable>
                    <Pressable
                        style={[styles.viewToggleBtn, viewMode === 'grid' && { backgroundColor: colors.primary }]}
                        onPress={() => setViewMode('grid')}
                    >
                        <Ionicons name="grid" size={16} color={viewMode === 'grid' ? '#FFFFFF' : colors.textMuted} />
                    </Pressable>
                </View>
            </View>

            {/* Search bar */}
            <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={18} color={colors.textMuted} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Search skills, topics..."
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                />
                {search.length > 0 && (
                    <Pressable onPress={() => setSearch('')}>
                        <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </Pressable>
                )}
            </View>

            {/* Categories — swipeable pills */}
            <ScrollView
                ref={catScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                style={styles.catScroll}
                contentContainerStyle={styles.catContent}
            >
                <Pressable
                    style={[styles.catPill, { borderColor: colors.border, backgroundColor: colors.card }, activeCategory === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => { setActiveCategory('all'); setViewMode('list'); triggerHaptic('light'); }}>
                    <Text style={[styles.catPillText, { color: colors.textSecondary }, activeCategory === 'all' && { color: '#FFFFFF' }]}>
                        🔥 All
                    </Text>
                </Pressable>
                {CATEGORIES.filter(c => c.key !== 'all').map((cat) => {
                    const catColor = CATEGORY_COLORS[cat.key] ?? colors.primary;
                    const isActive = activeCategory === cat.key;
                    return (
                        <Pressable key={cat.key}
                            style={[styles.catPill, { borderColor: colors.border, backgroundColor: colors.card }, isActive && { backgroundColor: catColor, borderColor: catColor }]}
                            onPress={() => { setActiveCategory(cat.key); triggerHaptic('light'); }}>
                            <Text style={[styles.catPillText, { color: colors.textSecondary }, isActive && { color: '#FFFFFF' }]}>
                                {CATEGORY_EMOJIS[cat.key] ?? '✨'} {cat.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {/* Active category header with count */}
            {activeCategory !== 'all' && (
                <Animated.View entering={FadeInDown.duration(200)} style={styles.catDetailHeader}>
                    <Text style={{ fontSize: 20 }}>{CATEGORY_EMOJIS[activeCategory] ?? '✨'}</Text>
                    <Text style={[styles.catDetailTitle, { color: colors.text }]}>
                        {CATEGORIES.find(c => c.key === activeCategory)?.label}
                    </Text>
                    <Text style={[styles.catDetailCount, { color: colors.textMuted }]}>
                        {filtered.length} item{filtered.length !== 1 ? 's' : ''}
                    </Text>
                </Animated.View>
            )}

            {/* Skill Filter */}
            <View style={styles.filterRow}>
                <Pressable
                    style={[styles.filterToggle, { borderColor: colors.primary }, showSkillFilter && { backgroundColor: colors.primary }]}
                    onPress={() => { setShowSkillFilter(!showSkillFilter); triggerHaptic('light'); }}>
                    <Ionicons name="options-outline" size={15} color={showSkillFilter ? '#FFFFFF' : colors.primary} />
                    <Text style={[styles.filterToggleText, { color: colors.primary }, showSkillFilter && { color: '#FFFFFF' }]}>
                        Skills {selectedSkills.length > 0 ? `(${selectedSkills.length})` : ''}
                    </Text>
                </Pressable>
                <View style={[styles.resultPill, { backgroundColor: colors.primary + '10' }]}>
                    <Text style={[styles.resultPillText, { color: colors.primary }]}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</Text>
                </View>
            </View>

            {showSkillFilter && (
                <Animated.View entering={FadeInDown.duration(250)} style={[styles.skillFilterWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.skillChipGrid}>
                        {SKILLS_OPTIONS.map((skill) => (
                            <Pressable key={skill}
                                style={[styles.skillChip, { borderColor: colors.border, backgroundColor: colors.surface }, selectedSkills.includes(skill) && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                onPress={() => toggleSkill(skill)}>
                                <Text style={[styles.skillChipText, { color: colors.textSecondary }, selectedSkills.includes(skill) && { color: '#FFFFFF', fontWeight: '700' }]}>
                                    {skill}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                    {selectedSkills.length > 0 && (
                        <Pressable style={styles.clearBtn} onPress={() => setSelectedSkills([])}>
                            <Text style={[styles.clearBtnText, { color: colors.error }]}>Clear all</Text>
                        </Pressable>
                    )}
                </Animated.View>
            )}

            {/* Results */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.results} showsVerticalScrollIndicator={false}>
                {filtered.length === 0 ? (
                    <EmptyState icon="🍃" title="No skills found" description="Try a different search or filter." />
                ) : viewMode === 'grid' ? (
                    /* Grid view — like reference photos */
                    <View style={styles.gridContainer}>
                        {filtered.map((listing, i) => {
                            const catColor = CATEGORY_COLORS[(listing as any).category] ?? colors.primary;
                            return (
                                <Animated.View key={listing.id} entering={FadeInDown.delay(i * 40).duration(300)}>
                                    <Pressable
                                        style={[styles.gridCard, { width: gridCardWidth, backgroundColor: catColor + '08', borderColor: catColor + '20' }]}
                                        onPress={() => { triggerHaptic('light'); router.push({ pathname: '/skill/[id]', params: { id: listing.id } }); }}
                                    >
                                        <View style={[styles.gridImagePlaceholder, { backgroundColor: catColor + '15' }]}>
                                            <Text style={{ fontSize: 32 }}>{CATEGORY_EMOJIS[(listing as any).category] ?? '✨'}</Text>
                                        </View>
                                        <View style={styles.gridCardBody}>
                                            <Text style={[styles.gridTitle, { color: colors.text }]} numberOfLines={1}>{listing.title}</Text>
                                            <View style={styles.gridFooter}>
                                                <Text style={[styles.gridExplore, { color: catColor }]}>Explore →</Text>
                                            </View>
                                        </View>
                                    </Pressable>
                                </Animated.View>
                            );
                        })}
                    </View>
                ) : (
                    /* List view — original card layout */
                    filtered.map((listing, i) => (
                        <Animated.View key={listing.id} entering={FadeInDown.delay(i * 50).duration(350)}>
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

    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg,
    },
    headerTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 14, marginTop: 2 },
    viewToggle: {
        flexDirection: 'row', borderRadius: Radii.sm, overflow: 'hidden',
        borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    },
    viewToggleBtn: {
        paddingHorizontal: 10, paddingVertical: 7,
    },

    searchWrap: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        marginHorizontal: Spacing.xl, marginBottom: Spacing.lg,
        borderWidth: 1,
        borderRadius: Radii.xl, paddingHorizontal: Spacing.lg,
        paddingVertical: Platform.OS === 'ios' ? 13 : 9,
        ...Shadows.sm,
    } as any,
    searchInput: { flex: 1, fontSize: 15 },

    catScroll: { maxHeight: 48, marginBottom: Spacing.md },
    catContent: { paddingHorizontal: Spacing.xl, gap: Spacing.sm },
    catPill: {
        paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: Radii.full, borderWidth: 1,
    },
    catPillText: { fontSize: 13, fontWeight: '600' },

    catDetailHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: Spacing.xl, marginBottom: Spacing.md,
    },
    catDetailTitle: { fontSize: 20, fontWeight: '800' },
    catDetailCount: { fontSize: 14, fontWeight: '500' },

    filterRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm,
    },
    filterToggle: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: Radii.sm, borderWidth: 1,
    },
    filterToggleText: { fontSize: 12, fontWeight: '600' },
    resultPill: {
        paddingHorizontal: 10,
        paddingVertical: 5, borderRadius: Radii.full,
    },
    resultPillText: { fontSize: 11, fontWeight: '700' },

    skillFilterWrap: {
        marginHorizontal: Spacing.xl, marginBottom: Spacing.lg,
        padding: Spacing.md,
        borderWidth: 1, borderRadius: Radii.md,
        ...Shadows.sm,
    } as any,
    skillChipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    skillChip: {
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
        borderWidth: 1,
    },
    skillChipText: { fontSize: 11, fontWeight: '500' },
    clearBtn: { marginTop: 8, alignSelf: 'flex-end' },
    clearBtnText: { fontSize: 11, fontWeight: '600' },

    results: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },

    // Grid view
    gridContainer: {
        flexDirection: 'row', flexWrap: 'wrap',
        gap: Spacing.md,
    },
    gridCard: {
        borderRadius: Radii.lg,
        borderWidth: 1,
        overflow: 'hidden',
        ...(Platform.OS === 'web' ? {} : Shadows.sm),
    } as any,
    gridImagePlaceholder: {
        height: 100,
        alignItems: 'center', justifyContent: 'center',
    },
    gridCardBody: {
        padding: Spacing.md,
        gap: 4,
    },
    gridTitle: { fontSize: 13, fontWeight: '700' },
    gridFooter: { flexDirection: 'row', alignItems: 'center' },
    gridExplore: { fontSize: 12, fontWeight: '600' },
});
