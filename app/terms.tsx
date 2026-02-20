import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppColors, Spacing } from '@/constants/theme';

export default function TermsScreen() {
    const router = useRouter();
    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={AppColors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Terms of Service</Text>
                <View style={{ width: 40 }} />
            </View>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.heading}>CampusBarter Terms of Service</Text>
                <Text style={styles.updated}>Last Updated: January 2025</Text>
                <Text style={styles.body}>
                    Welcome to CampusBarter. By using this application, you agree to the following terms.{'\n\n'}
                    <Text style={styles.subhead}>1. Eligibility{'\n'}</Text>
                    You must be a currently enrolled student at SAIT (Southern Alberta Institute of Technology) with a valid SAIT email address to create an account and use CampusBarter.{'\n\n'}
                    <Text style={styles.subhead}>2. User Conduct{'\n'}</Text>
                    You agree to post only genuine skill offerings and to engage respectfully with other users. Harassment, spam, scams, impersonation, or other abusive behavior is strictly prohibited.{'\n\n'}
                    <Text style={styles.subhead}>3. Time Credits{'\n'}</Text>
                    Time credits are an internal unit of exchange within CampusBarter. They have no monetary value and cannot be converted to real currency. Credits are earned and spent through skill exchanges.{'\n\n'}
                    <Text style={styles.subhead}>4. Content Ownership{'\n'}</Text>
                    You retain ownership of any content you post. By posting, you grant CampusBarter a license to display your content within the app.{'\n\n'}
                    <Text style={styles.subhead}>5. Privacy (PIPEDA){'\n'}</Text>
                    We comply with the Personal Information Protection and Electronic Documents Act (PIPEDA). See our Privacy Policy for details on data collection, use, and your rights.{'\n\n'}
                    <Text style={styles.subhead}>6. Termination{'\n'}</Text>
                    We may suspend or terminate accounts that violate these terms. You may also delete your account at any time through Settings.{'\n\n'}
                    <Text style={styles.subhead}>7. Limitation of Liability{'\n'}</Text>
                    CampusBarter is provided "as is". We are not liable for any damages arising from your use of the app or from interactions with other users.
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
