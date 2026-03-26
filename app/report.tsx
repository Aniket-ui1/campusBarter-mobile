import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { submitReport } from '@/lib/api';

const REASONS = ['Inappropriate behavior', 'Spam or scam', 'Harassment', 'Fake listing', 'Other'];

export default function ReportScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ targetType?: string; targetId?: string }>();
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const resolveTargetType = (): 'LISTING' | 'USER' | 'CHAT' | 'MESSAGE' | 'REVIEW' | 'OTHER' => {
        const raw = String(params.targetType ?? 'OTHER').toUpperCase();
        if (['LISTING', 'USER', 'CHAT', 'MESSAGE', 'REVIEW', 'OTHER'].includes(raw)) {
            return raw as any;
        }
        return 'OTHER';
    };

    const handleSubmit = async () => {
        if (!reason) { Alert.alert('Please select a reason'); return; }

        const rawTargetId = String(params.targetId ?? '').trim();
        const targetId = rawTargetId || `MANUAL-${Date.now()}`;

        try {
            setSubmitting(true);
            await submitReport({
                targetType: resolveTargetType(),
                targetId,
                reason,
                details: description,
            });

            Alert.alert('Report Submitted', 'Thank you. We will review this report and take action.');
            router.back();
        } catch {
            Alert.alert('Could not submit', 'Please try again in a moment.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="close" size={22} color={AppColors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Report</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.label}>Why are you reporting?</Text>
                {REASONS.map((r) => (
                    <Pressable key={r} style={[styles.option, reason === r && styles.optionActive]} onPress={() => setReason(r)}>
                        <Text style={[styles.optionText, reason === r && styles.optionTextActive]}>{r}</Text>
                        {reason === r && <Ionicons name="checkmark" size={18} color={AppColors.primary} />}
                    </Pressable>
                ))}
                <Input label="Additional details (optional)" placeholder="Describe the issue..."
                    value={description} onChangeText={setDescription} multiline numberOfLines={3}
                    style={{ minHeight: 80, textAlignVertical: 'top' }} />
                <Button title={submitting ? 'Submitting...' : 'Submit Report'} onPress={handleSubmit} variant="danger" fullWidth size="lg" disabled={submitting} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppColors.background },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: AppColors.surface, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: AppColors.text },
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40, gap: Spacing.lg },
    label: { fontSize: 16, color: AppColors.text, fontWeight: '600' },
    option: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: Spacing.lg, borderRadius: Radii.md, backgroundColor: AppColors.surface,
        borderWidth: 1, borderColor: AppColors.border,
    },
    optionActive: { borderColor: AppColors.primary, backgroundColor: 'rgba(107,143,113,0.12)' },
    optionText: { fontSize: 14, color: AppColors.textSecondary },
    optionTextActive: { color: AppColors.text, fontWeight: '600' },
});
