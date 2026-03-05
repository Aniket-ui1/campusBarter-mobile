import { useAuth } from '@/context/AuthContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { useThemeColors } from '@/context/ThemeContext';
import { Redirect, Stack } from 'expo-router';

export default function OnboardingLayout() {
    const { user } = useAuth();
    const { hasSeenOnboarding } = useOnboarding();
    const colors = useThemeColors();

    if (!user) {
        return <Redirect href="/(auth)/welcome" />;
    }

    if (hasSeenOnboarding) {
        return <Redirect href="/(tabs)" />;
    }

    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="tutorial" />
        </Stack>
    );
}
