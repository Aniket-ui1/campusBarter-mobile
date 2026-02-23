import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { AppColors } from '@/constants/theme';

export default function OnboardingLayout() {
    const { user } = useAuth();
    const { hasSeenOnboarding } = useOnboarding();

    if (!user) {
        return <Redirect href="/(auth)/welcome" />;
    }

    if (hasSeenOnboarding) {
        return <Redirect href="/(tabs)" />;
    }

    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: AppColors.background } }}>
            <Stack.Screen name="tutorial" />
        </Stack>
    );
}
