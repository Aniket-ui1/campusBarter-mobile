import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { PROGRAMS, SEMESTERS, SKILLS_OPTIONS } from '@/constants/categories';
import * as ImagePicker from 'expo-image-picker';

export default function EditProfileScreen() {
    const router = useRouter();
    const { user, updateProfile } = useAuth();
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
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.statusSpacer} />
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={AppColors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Avatar + Photo Picker */}
                <View style={styles.avatarSection}>
                    <Avatar name={displayName} uri={avatarUrl || undefined} size={80} />
                    <Pressable style={styles.changePhotoBtn} onPress={pickImage}>
                        <Ionicons name="camera-outline" size={16} color={AppColors.primary} />
                        <Text style={styles.changePhotoText}>Change Photo</Text>
                    </Pressable>
                </View>

                <View style={styles.form}>
                    {/* Basic Info */}
                    <Input label="Display Name" value={displayName} onChangeText={setDisplayName}
                        icon={<Ionicons name="person-outline" size={18} color={AppColors.textMuted} />} />
                    <Input label="Bio" value={bio} onChangeText={setBio} multiline numberOfLines={3}
                        style={{ minHeight: 80, textAlignVertical: 'top' }}
                        icon={<Ionicons name="document-text-outline" size={18} color={AppColors.textMuted} />} />
                    <Input label="Major / Focus Area" value={major} onChangeText={setMajor}
                        icon={<Ionicons name="school-outline" size={18} color={AppColors.textMuted} />} />

                    {/* Program */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Program</Text>
                        <View style={styles.chipGrid}>
                            {PROGRAMS.map((p) => (
                                <Pressable key={p} style={[styles.chip, program === p && styles.chipActive]}
                                    onPress={() => setProgram(p)}>
                                    <Text style={[styles.chipText, program === p && styles.chipTextActive]}>{p}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Semester */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Semester</Text>
                        <View style={styles.semRow}>
                            {SEMESTERS.map((s) => (
                                <Pressable key={s} style={[styles.semBtn, semester === String(s) && styles.semBtnActive]}
                                    onPress={() => setSemester(String(s))}>
                                    <Text style={[styles.semText, semester === String(s) && styles.semTextActive]}>{s}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Skills */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>💪 Skills</Text>
                        <View style={styles.chipGrid}>
                            {SKILLS_OPTIONS.map((s) => (
                                <Pressable key={s} style={[styles.chip, skills.includes(s) && styles.chipActive]}
                                    onPress={() => toggleItem(skills, setSkills, s)}>
                                    <Text style={[styles.chipText, skills.includes(s) && styles.chipTextActive]}>{s}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Areas to Improve */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📚 Areas to Improve</Text>
                        <View style={styles.chipGrid}>
                            {SKILLS_OPTIONS.map((s) => (
                                <Pressable key={s} style={[styles.chip, weaknesses.includes(s) && styles.chipActive]}
                                    onPress={() => toggleItem(weaknesses, setWeaknesses, s)}>
                                    <Text style={[styles.chipText, weaknesses.includes(s) && styles.chipTextActive]}>{s}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Interests */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>✨ Interests</Text>
                        <View style={styles.chipGrid}>
                            {SKILLS_OPTIONS.map((s) => (
                                <Pressable key={s} style={[styles.chip, interests.includes(s) && styles.chipActiveAlt]}
                                    onPress={() => toggleItem(interests, setInterests, s)}>
                                    <Text style={[styles.chipText, interests.includes(s) && styles.chipTextActive]}>{s}</Text>
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
    container: { flex: 1, backgroundColor: AppColors.background },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: AppColors.surface, alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: AppColors.text },
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 60 },
    avatarSection: { alignItems: 'center', gap: Spacing.md, marginBottom: Spacing['2xl'] },
    changePhotoBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 8, borderWidth: 1, borderColor: AppColors.primary,
    },
    changePhotoText: { color: AppColors.primary, fontSize: 13, fontWeight: '600' },
    form: { gap: Spacing.xl },

    section: { gap: 8 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: AppColors.text },
    label: { color: AppColors.textSecondary, fontSize: 13, fontWeight: '500', marginLeft: 2 },
    divider: { height: 1, backgroundColor: AppColors.border, marginVertical: Spacing.xs },

    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radii.sm,
        borderWidth: 1, borderColor: AppColors.border, backgroundColor: AppColors.surface,
    },
    chipActive: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
    chipActiveAlt: { backgroundColor: '#6B8F71', borderColor: '#6B8F71' },
    chipText: { color: AppColors.textSecondary, fontSize: 12, fontWeight: '500' },
    chipTextActive: { color: '#FFFFFF', fontWeight: '700' },

    semRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    semBtn: {
        width: 40, height: 40, borderRadius: 10,
        borderWidth: 1, borderColor: AppColors.border, backgroundColor: AppColors.surface,
        alignItems: 'center', justifyContent: 'center',
    },
    semBtnActive: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
    semText: { color: AppColors.textSecondary, fontSize: 14, fontWeight: '600' },
    semTextActive: { color: '#FFFFFF' },
});
