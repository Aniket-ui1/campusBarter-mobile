import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppColors, CATEGORY_EMOJIS, Radii, Shadows, Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CATEGORIES, LOCATION_OPTIONS } from '@/constants/categories';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';

const SKILL_CATEGORIES = CATEGORIES.filter((c) => c.key !== 'all');

export default function PostScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { addListing } = useData();
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
                category: category,
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
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.statusSpacer} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Post a Skill</Text>
                <Pressable onPress={() => router.push('/drafts')}>
                    <Text style={styles.draftsLink}>Drafts</Text>
                </Pressable>
            </View>

            {/* Progress bar */}
            <Animated.View entering={FadeInDown.duration(300)} style={styles.progressWrap}>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${(progress / 3) * 100}%` }]} />
                </View>
                <Text style={styles.progressText}>{progress}/3 completed</Text>
            </Animated.View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.duration(400)} style={styles.form}>
                    <Input label="Title" placeholder="e.g. Python Tutoring" value={title} onChangeText={setTitle} error={errors.title}
                        icon={<Ionicons name="create-outline" size={18} color={AppColors.textMuted} />} />

                    <Input label="Description" placeholder="Describe what you'll teach or help with..."
                        value={description} onChangeText={setDescription} multiline numberOfLines={4}
                        error={errors.description} style={{ minHeight: 100, textAlignVertical: 'top' }}
                        icon={<Ionicons name="document-text-outline" size={18} color={AppColors.textMuted} />} />

                    {/* Category */}
                    <View style={{ gap: 6 }}>
                        <Text style={styles.label}>Category</Text>
                        <View style={styles.chipGrid}>
                            {SKILL_CATEGORIES.map((c) => (
                                <Pressable key={c.key}
                                    style={[styles.catChip, category === c.key && styles.catChipActive]}
                                    onPress={() => setCategory(c.key)}>
                                    <Text style={styles.catChipEmoji}>{CATEGORY_EMOJIS[c.key] ?? '✨'}</Text>
                                    <Text style={[styles.catChipText, category === c.key && styles.catChipTextActive]}>
                                        {c.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                        {errors.category && <Text style={styles.error}>{errors.category}</Text>}
                    </View>

                    {/* Location */}
                    <View style={{ gap: 6 }}>
                        <Text style={styles.label}>Location</Text>
                        <View style={styles.locRow}>
                            {LOCATION_OPTIONS.map((loc) => (
                                <Pressable key={loc.key} style={[styles.locBtn, location === loc.key && styles.locBtnActive]}
                                    onPress={() => setLocation(loc.key)}>
                                    <Text style={[styles.locText, location === loc.key && styles.locTextActive]}>{loc.label}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    <Input label="Tags (optional)" placeholder="Comma-separated, e.g. python, beginner"
                        value={tags} onChangeText={setTags}
                        icon={<Ionicons name="pricetag-outline" size={18} color={AppColors.textMuted} />} />

                    {/* Draft toggle */}
                    <View style={styles.draftRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.draftLabel}>Save as Draft</Text>
                            <Text style={styles.draftHint}>Post later instead of publishing now</Text>
                        </View>
                        <Switch value={isDraft} onValueChange={setIsDraft}
                            trackColor={{ true: AppColors.primary, false: AppColors.border }}
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
    container: { flex: 1, backgroundColor: AppColors.background },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.xl, marginBottom: Spacing.md,
    },
    headerTitle: { fontSize: 28, fontWeight: '900', color: AppColors.text, letterSpacing: -0.5 },
    draftsLink: { fontSize: 14, color: AppColors.primary, fontWeight: '600' },

    // Progress
    progressWrap: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        marginHorizontal: Spacing.xl, marginBottom: Spacing.lg,
    },
    progressBar: {
        flex: 1, height: 6, backgroundColor: AppColors.surface,
        borderRadius: 3, overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: AppColors.primary, borderRadius: 3 },
    progressText: { fontSize: 12, color: AppColors.textMuted, fontWeight: '600' },

    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
    form: { gap: Spacing.xl },
    label: { color: AppColors.textSecondary, fontSize: 13, fontWeight: '600', marginLeft: 2 },

    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    catChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radii.sm,
        borderWidth: 1, borderColor: AppColors.border, backgroundColor: '#FFFFFF',
    },
    catChipActive: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
    catChipEmoji: { fontSize: 14 },
    catChipText: { fontSize: 12, fontWeight: '600', color: AppColors.textSecondary },
    catChipTextActive: { color: '#FFFFFF' },
    error: { color: AppColors.error, fontSize: 12, fontWeight: '500', marginLeft: 2 },

    locRow: { flexDirection: 'row', gap: 8 },
    locBtn: {
        flex: 1, paddingVertical: 12, borderRadius: Radii.sm,
        borderWidth: 1, borderColor: AppColors.border, backgroundColor: '#FFFFFF',
        alignItems: 'center',
    },
    locBtnActive: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
    locText: { color: AppColors.textSecondary, fontSize: 13, fontWeight: '600' },
    locTextActive: { color: '#FFFFFF' },
    draftRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: AppColors.border,
        borderRadius: Radii.md, padding: Spacing.lg,
    },
    draftLabel: { color: AppColors.text, fontSize: 15, fontWeight: '600' },
    draftHint: { color: AppColors.textMuted, fontSize: 12, marginTop: 2 },
});
