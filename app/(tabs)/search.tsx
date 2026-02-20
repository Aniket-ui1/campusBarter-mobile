import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { EmptyState } from '@/components/ui/EmptyState';
import { CATEGORIES } from '@/constants/categories';
import { MOCK_LISTINGS } from '@/data/mock';

export default function SearchScreen() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');

    const filtered = MOCK_LISTINGS.filter((l) => {
        if (l.status !== 'active') return false;
        const matchCat = activeCategory === 'all' || l.category === activeCategory;
        const matchSearch = l.title.toLowerCase().includes(search.toLowerCase()) ||
            l.description.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
    });

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Search</Text>
                <Text style={styles.headerSubtitle}>Find skills offered by students</Text>
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
                    <Ionicons name="close-circle" size={18} color={AppColors.textMuted} onPress={() => setSearch('')} />
                )}
            </View>

            {/* Categories */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={styles.catScroll} contentContainerStyle={styles.catContent}>
                {CATEGORIES.map((cat) => (
                    <CategoryChip
                        key={cat.key}
                        label={cat.label}
                        icon={cat.icon}
                        active={activeCategory === cat.key}
                        onPress={() => setActiveCategory(cat.key)}
                    />
                ))}
            </ScrollView>

            {/* Results */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.results} showsVerticalScrollIndicator={false}>
                <Text style={styles.resultCount}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</Text>

                {filtered.length === 0 ? (
                    <EmptyState
                        icon="🍃"
                        title="No skills found"
                        description="Try a different search or category."
                    />
                ) : (
                    filtered.map((listing, i) => (
                        <Animated.View key={listing.id} entering={FadeInDown.delay(i * 60).duration(400)}>
                            <Card
                                title={listing.title}
                                userName={listing.userName}
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
    headerSubtitle: { fontSize: 14, color: AppColors.textSecondary, marginTop: 2 },
    searchWrap: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        marginHorizontal: Spacing.xl, marginBottom: Spacing.lg,
        backgroundColor: AppColors.surface, borderWidth: 1, borderColor: AppColors.border,
        borderRadius: Radii.md, paddingHorizontal: Spacing.lg, paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    },
    searchInput: { flex: 1, color: AppColors.text, fontSize: 15 },
    catScroll: { maxHeight: 48, marginBottom: Spacing.lg },
    catContent: { paddingHorizontal: Spacing.xl, gap: Spacing.sm },
    results: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
    resultCount: { fontSize: 12, color: AppColors.textMuted, fontWeight: '600', marginBottom: Spacing.md, letterSpacing: 0.5 },
});
