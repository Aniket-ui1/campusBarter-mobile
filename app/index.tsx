import { useAuth } from '@/context/AuthContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { useThemeColors } from '@/context/ThemeContext';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
    const { user, isLoading } = useAuth();
    const { hasSeenOnboarding, isReady } = useOnboarding();
    const colors = useThemeColors();

    if (isLoading || !isReady) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
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

