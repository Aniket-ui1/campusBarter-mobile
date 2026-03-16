import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
<<<<<<< Updated upstream
import { Platform, StyleSheet, View } from 'react-native';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import ProfileSetupOverlay from '@/components/ProfileSetupOverlay';

export default function TabLayout() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/(auth)/welcome" />;
=======

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
>>>>>>> Stashed changes

  return (
    <>
      {!user.profileComplete && <ProfileSetupOverlay />}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: AppColors.primary,
          tabBarInactiveTintColor: AppColors.textMuted,
          tabBarStyle: {
            backgroundColor: AppColors.background,
            borderTopWidth: 1,
            borderTopColor: AppColors.border,
            height: Platform.OS === 'ios' ? 88 : 64,
            paddingBottom: Platform.OS === 'ios' ? 28 : 8,
            paddingTop: 8,
            elevation: 0,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 0.3,
          },
        }}
      >
        <Tabs.Screen name="index" options={{
          title: 'Home',
<<<<<<< Updated upstream
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeWrap : undefined}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            </View>
          ),
        }} />
        <Tabs.Screen name="search" options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeWrap : undefined}>
              <Ionicons name={focused ? 'search' : 'search-outline'} size={22} color={color} />
            </View>
          ),
        }} />
        <Tabs.Screen name="post" options={{
          title: 'Post',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.postWrap, focused && styles.postWrapActive]}>
              <Ionicons name="add" size={26} color={focused ? '#FFFFFF' : color} />
            </View>
          ),
        }} />
        <Tabs.Screen name="chats" options={{
          title: 'Chats',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeWrap : undefined}>
              <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={22} color={color} />
            </View>
          ),
        }} />
        <Tabs.Screen name="profile" options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeWrap : undefined}>
              <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
            </View>
          ),
        }} />
        {/* Hide explore from tab bar */}
        <Tabs.Screen name="explore" options={{ href: null }} />
      </Tabs>
    </>
=======
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="message.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="shield.fill" color={color} />,
        }}
      />
    </Tabs>
>>>>>>> Stashed changes
  );
}

const styles = StyleSheet.create({
  activeWrap: {
    backgroundColor: 'rgba(107,143,113,0.15)',
    borderRadius: 10,
    padding: 4,
  },
  postWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: AppColors.surface,
    borderWidth: 1, borderColor: AppColors.border,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  postWrapActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
});
