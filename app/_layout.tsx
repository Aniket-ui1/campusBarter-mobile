import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/context/AuthContext';
import { DataProvider } from '@/context/DataContext';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

function AppInner() {
  const { colors, mode, mobileView } = useTheme();

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

  const useMobileFrame = Platform.OS === 'web' && mobileView;

  const content = (
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

  if (!useMobileFrame) return content;

  return (
    <View style={mobileFrameStyles.outer}>
      <View style={[mobileFrameStyles.phone, { backgroundColor: colors.background, borderColor: colors.border }]}>
        {content}
      </View>
    </View>
  );
}

const mobileFrameStyles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
  },
  phone: {
    width: 390,
    height: '95%',
    maxHeight: 844,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 3,
    ...Platform.select({ web: { boxShadow: '0 25px 60px rgba(0,0,0,0.5)' } as any }),
  },
});

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}