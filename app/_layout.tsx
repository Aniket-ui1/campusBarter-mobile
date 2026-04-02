import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { AppColors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { DataProvider } from '@/context/DataContext';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { setupNotificationHandler, setupNotificationResponseListener } from '@/lib/notifications';
// import { ActionSheetProvider } from '@expo/react-native-action-sheet';

// Configure foreground notification display once, before any screen mounts
setupNotificationHandler();

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

function isAdminEmail(email?: string): boolean {
  if (!email) return false;
  const csv = process.env.EXPO_PUBLIC_ADMIN_EMAILS ?? 'admin@campusbarter.onmicrosoft.com';
  const allowed = new Set(csv.split(',').map(x => x.trim().toLowerCase()).filter(Boolean));
  return allowed.has(email.toLowerCase().trim());
}

function RoleRouteGuard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const firstSegment = segments[0];
    const isAdminRoute = firstSegment === 'admin';
    const isAdminUser = user?.role === 'Admin' || isAdminEmail(user?.email);

    if (isAdminUser) {
      if (!isAdminRoute) {
        router.replace('/admin');
      }
      return;
    }

    if (isAdminRoute) {
      router.replace(user ? '/(tabs)' : '/(auth)/welcome');
    }
  }, [isLoading, router, segments, user]);

  return null;
}

export default function RootLayout() {
  // Register the notification tap handler and clean it up when layout unmounts
  useEffect(() => {
    return setupNotificationResponseListener();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider value={CampusBarterTheme}>
        <AuthProvider>
          <DataProvider>
            <OnboardingProvider>
              <RoleRouteGuard />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: AppColors.background },
                  animation: 'fade',
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="admin" />
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
              <OfflineBanner />
              <StatusBar style="dark" />
            </OnboardingProvider>
          </DataProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
