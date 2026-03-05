import { useAuth } from '@/context/AuthContext';
import { useThemeColors } from '@/context/ThemeContext';
import { Redirect, Stack } from 'expo-router';

export default function AuthLayout() {
    const { user } = useAuth();
    const colors = useThemeColors();

    if (user) {
        return <Redirect href="/(tabs)" />;
    }

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
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
