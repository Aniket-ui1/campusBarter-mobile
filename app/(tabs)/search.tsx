import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, CATEGORY_EMOJIS, Radii, Shadows, Spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { CATEGORIES, SKILLS_OPTIONS } from '@/constants/categories';
import { useData } from '@/context/DataContext';

export default function SearchScreen() {
    const router = useRouter();
    const { listings } = useData();
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
        <View style={styles.container}>
            <View style={styles.statusSpacer} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Discover</Text>
                <Text style={styles.headerSubtitle}>Find the perfect skill match</Text>
            </View>

            {/* Search bar */}
            <View style={styles.searchWrap}>
                <Ionicons name="search-outline" size={18} color={AppColors.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search skills, topics..."
                    placeholderTextColor={AppColors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                />
                {search.length > 0 && (
                    <Pressable onPress={() => setSearch('')}>
                        <Ionicons name="close-circle" size={18} color={AppColors.textMuted} />
                    </Pressable>
                )}
            </View>

            {/* Categories */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={styles.catScroll} contentContainerStyle={styles.catContent}>
                <Pressable
                    style={[styles.catPill, activeCategory === 'all' && styles.catPillActive]}
                    onPress={() => setActiveCategory('all')}>
                    <Text style={[styles.catPillText, activeCategory === 'all' && styles.catPillTextActive]}>
                        🔥 All
                    </Text>
                </Pressable>
                {CATEGORIES.filter(c => c.key !== 'all').map((cat) => (
                    <Pressable key={cat.key}
                        style={[styles.catPill, activeCategory === cat.key && styles.catPillActive]}
                        onPress={() => setActiveCategory(cat.key)}>
                        <Text style={[styles.catPillText, activeCategory === cat.key && styles.catPillTextActive]}>
                            {CATEGORY_EMOJIS[cat.key] ?? '✨'} {cat.label}
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>

            {/* Skill Filter */}
            <View style={styles.filterRow}>
                <Pressable
                    style={[styles.filterToggle, showSkillFilter && styles.filterToggleActive]}
                    onPress={() => setShowSkillFilter(!showSkillFilter)}>
                    <Ionicons name="options-outline" size={15} color={showSkillFilter ? '#FFFFFF' : AppColors.primary} />
                    <Text style={[styles.filterToggleText, showSkillFilter && styles.filterToggleTextActive]}>
                        Skills {selectedSkills.length > 0 ? `(${selectedSkills.length})` : ''}
                    </Text>
                </Pressable>
                <View style={styles.resultPill}>
                    <Text style={styles.resultPillText}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</Text>
                </View>
            </View>

            {showSkillFilter && (
                <Animated.View entering={FadeInDown.duration(250)} style={styles.skillFilterWrap}>
                    <View style={styles.skillChipGrid}>
                        {SKILLS_OPTIONS.map((skill) => (
                            <Pressable key={skill}
                                style={[styles.skillChip, selectedSkills.includes(skill) && styles.skillChipActive]}
                                onPress={() => toggleSkill(skill)}>
                                <Text style={[styles.skillChipText, selectedSkills.includes(skill) && styles.skillChipTextActive]}>
                                    {skill}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                    {selectedSkills.length > 0 && (
                        <Pressable style={styles.clearBtn} onPress={() => setSelectedSkills([])}>
                            <Text style={styles.clearBtnText}>Clear all</Text>
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
    container: { flex: 1, backgroundColor: AppColors.background },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },

    header: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
    headerTitle: { fontSize: 28, fontWeight: '900', color: AppColors.text, letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 14, color: AppColors.textMuted, marginTop: 2 },

    searchWrap: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        marginHorizontal: Spacing.xl, marginBottom: Spacing.lg,
        backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: AppColors.border,
        borderRadius: Radii.xl, paddingHorizontal: Spacing.lg,
        paddingVertical: Platform.OS === 'ios' ? 13 : 9,
        ...Shadows.sm,
    } as any,
    searchInput: { flex: 1, color: AppColors.text, fontSize: 15 },

    catScroll: { maxHeight: 44, marginBottom: Spacing.md },
    catContent: { paddingHorizontal: Spacing.xl, gap: Spacing.sm },
    catPill: {
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: Radii.full, borderWidth: 1,
        borderColor: AppColors.border, backgroundColor: '#FFFFFF',
    },
    catPillActive: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
    catPillText: { fontSize: 13, fontWeight: '600', color: AppColors.textSecondary },
    catPillTextActive: { color: '#FFFFFF' },

    filterRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm,
    },
    filterToggle: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: Radii.sm, borderWidth: 1, borderColor: AppColors.primary,
    },
    filterToggleActive: { backgroundColor: AppColors.primary },
    filterToggleText: { fontSize: 12, fontWeight: '600', color: AppColors.primary },
    filterToggleTextActive: { color: '#FFFFFF' },
    resultPill: {
        backgroundColor: AppColors.primary + '10', paddingHorizontal: 10,
        paddingVertical: 5, borderRadius: Radii.full,
    },
    resultPillText: { fontSize: 11, fontWeight: '700', color: AppColors.primary },

    skillFilterWrap: {
        marginHorizontal: Spacing.xl, marginBottom: Spacing.lg,
        padding: Spacing.md, backgroundColor: '#FFFFFF',
        borderWidth: 1, borderColor: AppColors.border, borderRadius: Radii.md,
        ...Shadows.sm,
    } as any,
    skillChipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    skillChip: {
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
        borderWidth: 1, borderColor: AppColors.border, backgroundColor: AppColors.surface,
    },
    skillChipActive: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
    skillChipText: { fontSize: 11, fontWeight: '500', color: AppColors.textSecondary },
    skillChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
    clearBtn: { marginTop: 8, alignSelf: 'flex-end' },
    clearBtnText: { fontSize: 11, color: AppColors.error, fontWeight: '600' },

    results: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
});
