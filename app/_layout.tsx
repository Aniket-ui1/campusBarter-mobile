import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/context/AuthContext';
import { DataProvider } from '@/context/DataContext';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

function AppInner() {
  const { colors, mode } = useTheme();

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  };

  return (
    <NavThemeProvider value={navTheme}>
      <AuthProvider>
        <DataProvider>
          <OnboardingProvider>
            <ToastProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.background },
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
                <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true, title: 'Info', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
              </Stack>
              <StatusBar style={colors.statusBar} />
            </ToastProvider>
          </OnboardingProvider>
        </DataProvider>
      </AuthProvider>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}