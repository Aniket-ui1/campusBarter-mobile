import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import ProfileSetupOverlay from '@/components/ProfileSetupOverlay';

export default function TabLayout() {
  const { user } = useAuth();
  const { unreadChatsCount } = useData();

  console.log('[TabLayout] 🔔 Unread chats count for badge:', unreadChatsCount);

  if (!user) return <Redirect href="/(auth)/welcome" />;

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
          tabBarBadge: unreadChatsCount > 0 ? unreadChatsCount : undefined,
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
