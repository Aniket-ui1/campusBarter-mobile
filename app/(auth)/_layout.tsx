import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { AppColors } from '@/constants/theme';

export default function AuthLayout() {
    const { user } = useAuth();

    if (user) {
        return <Redirect href="/(tabs)" />;
    }

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: AppColors.background },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="welcome" />
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="register-step1" />
            <Stack.Screen name="register-step2" />
            <Stack.Screen name="register-step3" />
        </Stack>
    );
}
