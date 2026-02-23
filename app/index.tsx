import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useOnboarding } from '@/context/OnboardingContext';

export default function Index() {
    const { user } = useAuth();
    const { hasSeenOnboarding } = useOnboarding();

    if (!user) {
        return <Redirect href="/(auth)/welcome" />;
    }

    if (!hasSeenOnboarding) {
        return <Redirect href="/(onboarding)/tutorial" />;
    }

    return <Redirect href="/(tabs)" />;
}

