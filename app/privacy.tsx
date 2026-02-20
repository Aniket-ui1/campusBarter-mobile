import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppColors, Spacing } from '@/constants/theme';

export default function PrivacyScreen() {
    const router = useRouter();
    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={AppColors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Privacy Policy</Text>
                <View style={{ width: 40 }} />
            </View>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.heading}>CampusBarter Privacy Policy</Text>
                <Text style={styles.updated}>Last Updated: January 2025</Text>
                <Text style={styles.body}>
                    CampusBarter is committed to protecting your privacy in compliance with Canada's Personal Information Protection and Electronic Documents Act (PIPEDA).{'\n\n'}
                    <Text style={styles.subhead}>Information We Collect{'\n'}</Text>
                    We collect: your SAIT email, display name, program, semester, profile photo (optional), skill listings, messages, and reviews. We do not collect or store external passwords — authentication is handled by Azure AD / Microsoft Entra ID.{'\n\n'}
                    <Text style={styles.subhead}>How We Use Your Data{'\n'}</Text>
                    Your data is used to: operate the app, display your profile and listings, facilitate messaging and skill exchanges, generate aggregate analytics, and improve our services.{'\n\n'}
                    <Text style={styles.subhead}>Data Sharing{'\n'}</Text>
                    We do not sell or share your personal information with third parties. We use Firebase (Google Cloud) for data storage and authentication, which processes data under their own privacy policies and with appropriate data processing agreements.{'\n\n'}
                    <Text style={styles.subhead}>Your Rights{'\n'}</Text>
                    Under PIPEDA, you have the right to: access your personal data, request correction of inaccurate data, withdraw consent and delete your account, and file a complaint with the Privacy Commissioner of Canada. To exercise these rights, use the 'Delete Account' option in Settings or contact us.{'\n\n'}
                    <Text style={styles.subhead}>Data Retention{'\n'}</Text>
                    We retain your data while your account is active. Upon deletion, all personal data is removed within 30 days. Anonymized usage data may be retained for analytics.{'\n\n'}
                    <Text style={styles.subhead}>Security{'\n'}</Text>
                    We use encryption in transit (TLS) and at rest, Firebase security rules, and role-based access to protect your data.
                </Text>
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
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
    heading: { fontSize: 22, fontWeight: '900', color: AppColors.text, marginBottom: 4 },
    updated: { fontSize: 12, color: AppColors.textMuted, marginBottom: Spacing.xl },
    subhead: { fontWeight: '800', color: AppColors.text },
    body: { fontSize: 14, color: AppColors.textSecondary, lineHeight: 24 },
});
