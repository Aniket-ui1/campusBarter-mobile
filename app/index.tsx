import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { AppColors } from '@/constants/theme';

export default function Index() {
    const { user, isLoading } = useAuth();
    const { hasSeenOnboarding } = useOnboarding();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: AppColors.background }}>
                <ActivityIndicator size="large" color={AppColors.primary} />
            </View>
        );
    }

    if (!user) {
        return <Redirect href="/(auth)/welcome" />;
    }

    if (!hasSeenOnboarding) {
        return <Redirect href="/(onboarding)/tutorial" />;
    }

    return <Redirect href="/(tabs)" />;
}
