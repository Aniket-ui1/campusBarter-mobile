import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CATEGORIES, LOCATION_OPTIONS } from '@/constants/categories';
import { CATEGORY_EMOJIS, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useThemeColors } from '@/context/ThemeContext';
import { triggerHaptic } from '@/hooks/useAnimations';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const SKILL_CATEGORIES = CATEGORIES.filter((c) => c.key !== 'all');

export default function PostScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { addListing } = useData();
    const colors = useThemeColors();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [location, setLocation] = useState('online');
    const [tags, setTags] = useState('');
    const [isDraft, setIsDraft] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!title.trim()) e.title = 'Title is required';
        if (!description.trim()) e.description = 'Description is required';
        if (description.trim().length < 20) e.description = 'Provide at least 20 characters';
        if (!category) e.category = 'Select a category';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handlePublish = async () => {
        if (!validate()) return;
        if (!user) { Alert.alert('Error', 'You must be logged in to post.'); return; }

        setIsSubmitting(true);
        try {
            await addListing({
                type: 'OFFER',
                title: title.trim(),
                description: description.trim(),
                credits: 1,
                userId: user.id,
                userName: user.displayName || user.name,
            });

            Alert.alert(
                isDraft ? 'Draft Saved' : 'Published! 🚀',
                isDraft ? 'You can edit it later from Drafts.' : 'Your skill is now live.',
                [{ text: 'OK' }]
            );
            setTitle(''); setDescription(''); setCategory('');
            setLocation('online'); setTags(''); setIsDraft(false); setErrors({});
        } catch (err) {
            Alert.alert('Error', 'Failed to publish. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Progress: title → description → category → done
    const steps = [!!title.trim(), !!description.trim() && description.trim().length >= 20, !!category];
    const progress = steps.filter(Boolean).length;

    return (
        <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.statusSpacer} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Post a Skill</Text>
                <Pressable onPress={() => router.push('/drafts')}>
                    <Text style={[styles.draftsLink, { color: colors.primary }]}>Drafts</Text>
                </Pressable>
            </View>

            {/* Progress bar */}
            <Animated.View entering={FadeInDown.duration(300)} style={styles.progressWrap}>
                <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
                    <LinearGradient
                        colors={[colors.gradientFrom, colors.gradientTo]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressFill, { width: `${(progress / 3) * 100}%` }]}
                    />
                </View>
                <Text style={[styles.progressText, { color: colors.textMuted }]}>{progress}/3 completed</Text>
            </Animated.View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.duration(400)} style={styles.form}>
                    <Input label="Title" placeholder="e.g. Python Tutoring" value={title} onChangeText={setTitle} error={errors.title}
                        icon={<Ionicons name="create-outline" size={18} color={colors.textMuted} />} />

                    <Input label="Description" placeholder="Describe what you'll teach or help with..."
                        value={description} onChangeText={setDescription} multiline numberOfLines={4}
                        error={errors.description} style={{ minHeight: 100, textAlignVertical: 'top' }}
                        icon={<Ionicons name="document-text-outline" size={18} color={colors.textMuted} />} />

                    {/* Category */}
                    <View style={{ gap: 6 }}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
                        <View style={styles.chipGrid}>
                            {SKILL_CATEGORIES.map((c) => (
                                <Pressable key={c.key}
                                    style={[styles.catChip, { borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' }, category === c.key && { borderColor: 'transparent' }]}
                                    onPress={() => { setCategory(c.key); triggerHaptic('light'); }}>
                                    {category === c.key && (
                                        <LinearGradient
                                            colors={[colors.gradientFrom, colors.gradientTo]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={StyleSheet.absoluteFill}
                                        />
                                    )}
                                    <Text style={styles.catChipEmoji}>{CATEGORY_EMOJIS[c.key] ?? '✨'}</Text>
                                    <Text style={[styles.catChipText, { color: colors.textSecondary }, category === c.key && { color: '#FFFFFF' }]}>
                                        {c.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                        {errors.category && <Text style={[styles.error, { color: colors.error }]}>{errors.category}</Text>}
                    </View>

                    {/* Location */}
                    <View style={{ gap: 6 }}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Location</Text>
                        <View style={styles.locRow}>
                            {LOCATION_OPTIONS.map((loc) => (
                                <Pressable key={loc.key} style={[styles.locBtn, { borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' }, location === loc.key && { borderColor: 'transparent' }]}
                                    onPress={() => { setLocation(loc.key); triggerHaptic('light'); }}>
                                    {location === loc.key && (
                                        <LinearGradient
                                            colors={[colors.gradientFrom, colors.gradientTo]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={StyleSheet.absoluteFill}
                                        />
                                    )}
                                    <Text style={[styles.locText, { color: colors.textSecondary }, location === loc.key && { color: '#FFFFFF' }]}>{loc.label}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    <Input label="Tags (optional)" placeholder="Comma-separated, e.g. python, beginner"
                        value={tags} onChangeText={setTags}
                        icon={<Ionicons name="pricetag-outline" size={18} color={colors.textMuted} />} />

                    {/* Draft toggle */}
                    <View style={[styles.draftRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.draftLabel, { color: colors.text }]}>Save as Draft</Text>
                            <Text style={[styles.draftHint, { color: colors.textMuted }]}>Post later instead of publishing now</Text>
                        </View>
                        <Switch value={isDraft} onValueChange={setIsDraft}
                            trackColor={{ true: colors.primary, false: colors.border }}
                            thumbColor="#FFFFFF" />
                    </View>

                    <Button
                        title={isDraft ? 'Save Draft' : 'Publish Skill'}
                        onPress={handlePublish}
                        fullWidth size="lg"
                        loading={isSubmitting} disabled={isSubmitting}
                        icon={<Ionicons name={isDraft ? 'bookmark-outline' : 'rocket-outline'} size={20} color="#FFFFFF" />}
                    />
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.xl, marginBottom: Spacing.md,
    },
    headerTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
    draftsLink: { fontSize: 14, fontWeight: '600' },

    // Progress
    progressWrap: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        marginHorizontal: Spacing.xl, marginBottom: Spacing.lg,
    },
    progressBar: {
        flex: 1, height: 6,
        borderRadius: 3, overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 3 },
    progressText: { fontSize: 12, fontWeight: '600' },

    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
    form: { gap: Spacing.xl },
    label: { fontSize: 13, fontWeight: '600', marginLeft: 2 },

    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    catChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radii.sm,
        borderWidth: 1,
    },
    catChipEmoji: { fontSize: 14 },
    catChipText: { fontSize: 12, fontWeight: '600' },
    error: { fontSize: 12, fontWeight: '500', marginLeft: 2 },

    locRow: { flexDirection: 'row', gap: 8 },
    locBtn: {
        flex: 1, paddingVertical: 12, borderRadius: Radii.sm,
        borderWidth: 1, alignItems: 'center',
    },
    locText: { fontSize: 13, fontWeight: '600' },
    draftRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        borderWidth: 1,
        borderRadius: Radii.md, padding: Spacing.lg,
    },
    draftLabel: { fontSize: 15, fontWeight: '600' },
    draftHint: { fontSize: 12, marginTop: 2 },
});
