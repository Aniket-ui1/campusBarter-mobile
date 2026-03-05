import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Radii, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const REASONS = ['Inappropriate behavior', 'Spam or scam', 'Harassment', 'Fake listing', 'Other'];

export default function ReportScreen() {
    const router = useRouter();
    const colors = useThemeColors();
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = () => {
        if (!reason) { Alert.alert('Please select a reason'); return; }
        Alert.alert('Report Submitted', 'Thank you. We will review this report and take action.');
        router.back();
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.statusSpacer} />
            <View style={styles.header}>
                <Pressable style={[styles.backBtn, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
                    <Ionicons name="close" size={22} color={colors.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Report</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={[styles.label, { color: colors.text }]}>Why are you reporting?</Text>
                {REASONS.map((r) => (
                    <Pressable key={r} style={[styles.option, { backgroundColor: colors.surface, borderColor: colors.border }, reason === r && { borderColor: colors.primary, backgroundColor: 'rgba(107,143,113,0.12)' }]} onPress={() => setReason(r)}>
                        <Text style={[styles.optionText, { color: colors.textSecondary }, reason === r && { color: colors.text, fontWeight: '600' }]}>{r}</Text>
                        {reason === r && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                    </Pressable>
                ))}
                <Input label="Additional details (optional)" placeholder="Describe the issue..."
                    value={description} onChangeText={setDescription} multiline numberOfLines={3}
                    style={{ minHeight: 80, textAlignVertical: 'top' }} />
                <Button title="Submit Report" onPress={handleSubmit} variant="danger" fullWidth size="lg" />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
    backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40, gap: Spacing.lg },
    label: { fontSize: 16, fontWeight: '600' },
    option: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: Spacing.lg, borderRadius: Radii.md,
        borderWidth: 1,
    },
    optionText: { fontSize: 14 },
});
