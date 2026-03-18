import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { AppColors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ChatBadgeProvider } from '@/context/ChatBadgeContext';
import { DataProvider } from '@/context/DataContext';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { connectChatSocket } from '@/services/socketService';
import { Ionicons } from '@expo/vector-icons';
import { DefaultTheme, ThemeProvider, useNavigation } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Pressable } from 'react-native';
import 'react-native-reanimated';

function BackButtonHeader() {
  const navigation = useNavigation();
  const router = useRouter();
  
  const handleGoBack = () => {
    // Check if there's a valid navigation history
    if (navigation.canGoBack?.()) {
      navigation.goBack();
    } else {
      // Fallback: navigate to home/tabs if there's nowhere to go back to
      // This handles the case where user refreshes on a nested screen
      router.replace('/(tabs)');
    }
  };
  
  return (
    <Pressable 
      hitSlop={10} 
      onPress={handleGoBack}
      style={{ marginLeft: 16, paddingRight: 8 }}
    >
      <Ionicons name="chevron-back" size={28} color={AppColors.text} />
    </Pressable>
  );
}

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

const headerOptions = (title: string) => ({
  animation: 'slide_from_right' as const,
  headerShown: true,
  title,
  headerStyle: { backgroundColor: AppColors.background },
  headerTintColor: AppColors.text,
  headerLeft: () => <BackButtonHeader />,
});

// 🔥 Socket initializer - must be inside AuthProvider
function SocketInitializer({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // 🔥 Force socket connection on login
      const socket = connectChatSocket();
      console.log('[App] Socket initialized:', socket.connected);
    }
  }, [user]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider value={CampusBarterTheme}>
        <AuthProvider>
          <SocketInitializer>
            <ChatBadgeProvider>
              <DataProvider>
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
                    <Stack.Screen name="chat/[id]" options={headerOptions('Chat')} />
                    <Stack.Screen name="edit-profile" options={headerOptions('Edit Profile')} />
                    <Stack.Screen name="reviews/[userId]" options={headerOptions('Reviews')} />
                    <Stack.Screen name="rate/[userId]" options={{ presentation: 'modal' }} />
                    <Stack.Screen name="my-listings" options={headerOptions('My Listings')} />
                    <Stack.Screen name="my-requests" options={headerOptions('My Requests')} />
                    <Stack.Screen name="credits" options={headerOptions('Time Credits')} />
                    <Stack.Screen name="drafts" options={headerOptions('Drafts')} />
                    <Stack.Screen name="notifications" options={headerOptions('Notifications')} />
                    <Stack.Screen name="report" options={{ presentation: 'modal' }} />
                    <Stack.Screen name="settings" options={headerOptions('Settings')} />
                    <Stack.Screen name="terms" options={headerOptions('Terms of Service')} />
                    <Stack.Screen name="privacy" options={headerOptions('Privacy Policy')} />
                    <Stack.Screen name="about" options={headerOptions('About')} />
                    <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true, title: 'Info', headerStyle: { backgroundColor: AppColors.background }, headerTintColor: AppColors.text }} />
                  </Stack>
                  <OfflineBanner />
                  <StatusBar style="dark" />
                </OnboardingProvider>
              </DataProvider>
            </ChatBadgeProvider>
          </SocketInitializer>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
