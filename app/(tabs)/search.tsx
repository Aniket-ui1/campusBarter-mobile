import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { CATEGORIES, SKILLS_OPTIONS } from '@/constants/categories';
import { CATEGORY_EMOJIS, Radii, Shadows, Spacing } from '@/constants/theme';
import { useData } from '@/context/DataContext';
import { useThemeColors } from '@/context/ThemeContext';
import { triggerHaptic } from '@/hooks/useAnimations';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function SearchScreen() {
    const router = useRouter();
    const { listings } = useData();
    const colors = useThemeColors();
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [showSkillFilter, setShowSkillFilter] = useState(false);

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
                <Text style={[styles.headerTitle, { color: colors.text }]}>Discover</Text>
                <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Find the perfect skill match</Text>
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

            {/* Categories */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={styles.catScroll} contentContainerStyle={styles.catContent}>
                <Pressable
                    style={[styles.catPill, { borderColor: colors.border, backgroundColor: colors.card }, activeCategory === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => { setActiveCategory('all'); triggerHaptic('light'); }}>
                    <Text style={[styles.catPillText, { color: colors.textSecondary }, activeCategory === 'all' && { color: '#FFFFFF' }]}>
                        🔥 All
                    </Text>
                </Pressable>
                {CATEGORIES.filter(c => c.key !== 'all').map((cat) => (
                    <Pressable key={cat.key}
                        style={[styles.catPill, { borderColor: colors.border, backgroundColor: colors.card }, activeCategory === cat.key && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        onPress={() => { setActiveCategory(cat.key); triggerHaptic('light'); }}>
                        <Text style={[styles.catPillText, { color: colors.textSecondary }, activeCategory === cat.key && { color: '#FFFFFF' }]}>
                            {CATEGORY_EMOJIS[cat.key] ?? '✨'} {cat.label}
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>

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
                ) : (
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

    header: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
    headerTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 14, marginTop: 2 },

    searchWrap: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        marginHorizontal: Spacing.xl, marginBottom: Spacing.lg,
        borderWidth: 1,
        borderRadius: Radii.xl, paddingHorizontal: Spacing.lg,
        paddingVertical: Platform.OS === 'ios' ? 13 : 9,
        ...Shadows.sm,
    } as any,
    searchInput: { flex: 1, fontSize: 15 },

    catScroll: { maxHeight: 44, marginBottom: Spacing.md },
    catContent: { paddingHorizontal: Spacing.xl, gap: Spacing.sm },
    catPill: {
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: Radii.full, borderWidth: 1,
    },
    catPillText: { fontSize: 13, fontWeight: '600' },

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
});
