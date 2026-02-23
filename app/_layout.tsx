import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { AppColors } from '@/constants/theme';
import { AuthProvider } from '@/context/AuthContext';
import { OnboardingProvider } from '@/context/OnboardingContext';


const CampusBarterTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: AppColors.primary,
    background: AppColors.background,
    card: AppColors.surface,
    text: AppColors.text,
    border: AppColors.border,
    notification: AppColors.accent,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={CampusBarterTheme}>
      <AuthProvider>
        <OnboardingProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: AppColors.background },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="skill/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="chat/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="edit-profile" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="reviews/[userId]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="rate/[userId]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="my-listings" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="my-requests" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="drafts" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="report" options={{ presentation: 'modal' }} />
            <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="terms" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="privacy" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="about" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true, title: 'Info', headerStyle: { backgroundColor: AppColors.background }, headerTintColor: AppColors.text }} />
          </Stack>
          <StatusBar style="dark" />
        </OnboardingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}