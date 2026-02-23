import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppColors, Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { PROGRAMS, SEMESTERS } from '@/constants/categories';

export default function EditProfileScreen() {
    const router = useRouter();
    const { user, updateProfile } = useAuth();
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [program, setProgram] = useState(user?.program || '');
    const [major, setMajor] = useState(user?.major || '');
    const [semester, setSemester] = useState(String(user?.semester || ''));

    const handleSave = () => {
        updateProfile({ displayName, bio, program, major, semester: Number(semester) });
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
                <View style={styles.avatarSection}>
                    <Avatar name={displayName} size={80} />
                    <Pressable style={styles.changePhotoBtn}>
                        <Ionicons name="camera-outline" size={16} color={AppColors.primary} />
                        <Text style={styles.changePhotoText}>Change Photo</Text>
                    </Pressable>
                </View>

                <View style={styles.form}>
                    <Input label="Display Name" value={displayName} onChangeText={setDisplayName}
                        icon={<Ionicons name="person-outline" size={18} color={AppColors.textMuted} />} />
                    <Input label="Bio" value={bio} onChangeText={setBio} multiline numberOfLines={3}
                        style={{ minHeight: 80, textAlignVertical: 'top' }}
                        icon={<Ionicons name="document-text-outline" size={18} color={AppColors.textMuted} />} />
                    <Input label="Major" value={major} onChangeText={setMajor}
                        icon={<Ionicons name="school-outline" size={18} color={AppColors.textMuted} />} />
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
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
    avatarSection: { alignItems: 'center', gap: Spacing.md, marginBottom: Spacing['2xl'] },
    changePhotoBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 8, borderWidth: 1, borderColor: AppColors.primary,
    },
    changePhotoText: { color: AppColors.primary, fontSize: 13, fontWeight: '600' },
    form: { gap: Spacing.xl },
});
