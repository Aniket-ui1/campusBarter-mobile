import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PROGRAMS, SEMESTERS, SKILLS_OPTIONS } from '@/constants/categories';
import { Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useThemeColors } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function EditProfileScreen() {
    const router = useRouter();
    const { user, updateProfile } = useAuth();
    const colors = useThemeColors();
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [program, setProgram] = useState(user?.program || '');
    const [major, setMajor] = useState(user?.major || '');
    const [semester, setSemester] = useState(String(user?.semester || ''));
    const [skills, setSkills] = useState<string[]>(user?.skills || []);
    const [weaknesses, setWeaknesses] = useState<string[]>(user?.weaknesses || []);
    const [interests, setInterests] = useState<string[]>(user?.interests || []);
    const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

    const toggleItem = (
        list: string[],
        setList: React.Dispatch<React.SetStateAction<string[]>>,
        item: string
    ) => {
        setList((prev) =>
            prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
        );
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow access to your photo library.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            if (asset.base64) {
                const dataUri = `data:image/jpeg;base64,${asset.base64}`;
                setAvatarUrl(dataUri);
            } else if (asset.uri) {
                setAvatarUrl(asset.uri);
            }
        }
    };

    const handleSave = () => {
        updateProfile({
            displayName, bio, program, major,
            semester: Number(semester),
            skills, weaknesses, interests, avatarUrl,
        });
        Alert.alert('Profile Updated', 'Your changes have been saved.');
        router.back();
    };

    return (
        <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.statusSpacer} />
            <View style={styles.header}>
                <Pressable style={[styles.backBtn, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Avatar + Photo Picker */}
                <View style={styles.avatarSection}>
                    <Avatar name={displayName} uri={avatarUrl || undefined} size={80} />
                    <Pressable style={[styles.changePhotoBtn, { borderColor: colors.primary }]} onPress={pickImage}>
                        <Ionicons name="camera-outline" size={16} color={colors.primary} />
                        <Text style={[styles.changePhotoText, { color: colors.primary }]}>Change Photo</Text>
                    </Pressable>
                </View>

                <View style={styles.form}>
                    {/* Basic Info */}
                    <Input label="Display Name" value={displayName} onChangeText={setDisplayName}
                        icon={<Ionicons name="person-outline" size={18} color={colors.textMuted} />} />
                    <Input label="Bio" value={bio} onChangeText={setBio} multiline numberOfLines={3}
                        style={{ minHeight: 80, textAlignVertical: 'top' }}
                        icon={<Ionicons name="document-text-outline" size={18} color={colors.textMuted} />} />
                    <Input label="Major / Focus Area" value={major} onChangeText={setMajor}
                        icon={<Ionicons name="school-outline" size={18} color={colors.textMuted} />} />

                    {/* Program */}
                    <View style={styles.section}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Program</Text>
                        <View style={styles.chipGrid}>
                            {PROGRAMS.map((p) => (
                                <Pressable key={p} style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surface }, program === p && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                    onPress={() => setProgram(p)}>
                                    <Text style={[styles.chipText, { color: colors.textSecondary }, program === p && styles.chipTextActive]}>{p}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Semester */}
                    <View style={styles.section}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Semester</Text>
                        <View style={styles.semRow}>
                            {SEMESTERS.map((s) => (
                                <Pressable key={s} style={[styles.semBtn, { borderColor: colors.border, backgroundColor: colors.surface }, semester === String(s) && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                    onPress={() => setSemester(String(s))}>
                                    <Text style={[styles.semText, { color: colors.textSecondary }, semester === String(s) && styles.semTextActive]}>{s}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Divider */}
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Skills */}
                    <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>💪 Skills</Text>
                        <Text style={[styles.sectionHint, { color: colors.textMuted }]}>What you're good at</Text>
                        <View style={styles.chipGrid}>
                            {SKILLS_OPTIONS.map((s) => (
                                <Pressable key={s} style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.card }, skills.includes(s) && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                    onPress={() => toggleItem(skills, setSkills, s)}>
                                    <Text style={[styles.chipText, { color: colors.textSecondary }, skills.includes(s) && styles.chipTextActive]}>{s}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Areas to Improve */}
                    <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>📚 Areas to Improve</Text>
                        <Text style={[styles.sectionHint, { color: colors.textMuted }]}>What you want to learn</Text>
                        <View style={styles.chipGrid}>
                            {SKILLS_OPTIONS.map((s) => (
                                <Pressable key={s} style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.card }, weaknesses.includes(s) && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                    onPress={() => toggleItem(weaknesses, setWeaknesses, s)}>
                                    <Text style={[styles.chipText, { color: colors.textSecondary }, weaknesses.includes(s) && styles.chipTextActive]}>{s}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Interests */}
                    <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>✨ Interests</Text>
                        <Text style={[styles.sectionHint, { color: colors.textMuted }]}>Topics you enjoy</Text>
                        <View style={styles.chipGrid}>
                            {SKILLS_OPTIONS.map((s) => (
                                <Pressable key={s} style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.card }, interests.includes(s) && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                    onPress={() => toggleItem(interests, setInterests, s)}>
                                    <Text style={[styles.chipText, { color: colors.textSecondary }, interests.includes(s) && styles.chipTextActive]}>{s}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    <Button title="Save Changes" onPress={handleSave} fullWidth size="lg"
                        icon={<Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />} />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 60 },
    avatarSection: { alignItems: 'center', gap: Spacing.md, marginBottom: Spacing['2xl'] },
    changePhotoBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 8, borderWidth: 1,
    },
    changePhotoText: { fontSize: 13, fontWeight: '600' },
    form: { gap: Spacing.xl },

    section: { gap: 8 },
    sectionTitle: { fontSize: 15, fontWeight: '700' },
    sectionHint: { fontSize: 12, marginTop: -2 },
    label: { fontSize: 13, fontWeight: '500', marginLeft: 2 },
    divider: { height: 1, marginVertical: Spacing.xs },
    groupCard: {
        gap: 8,
        padding: Spacing.md,
        borderRadius: Radii.md,
        borderWidth: 1,
    },

    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radii.sm,
        borderWidth: 1,
    },
    chipActive: {},
    chipText: { fontSize: 12, fontWeight: '500' },
    chipTextActive: { color: '#FFFFFF', fontWeight: '700' },

    semRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    semBtn: {
        width: 40, height: 40, borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center', justifyContent: 'center',
    },
    semBtnActive: {},
    semText: { fontSize: 14, fontWeight: '600' },
    semTextActive: { color: '#FFFFFF' },
});
