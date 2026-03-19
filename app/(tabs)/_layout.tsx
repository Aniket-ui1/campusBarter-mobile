import ProfileSetupOverlay from '@/components/ProfileSetupOverlay';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useChatBadge } from '@/context/ChatBadgeContext';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

export default function TabLayout() {
  const { user } = useAuth();
  const { totalUnreadCount } = useChatBadge();
  const chatsBadgeText = totalUnreadCount > 99 ? '99+' : String(totalUnreadCount);

  React.useEffect(() => {
    console.log('[ChatBadge][TabLayout] chats badge state', {
      totalUnreadCount,
      chatsBadgeText,
    });
  }, [totalUnreadCount, chatsBadgeText]);
  
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
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.chatIconWrap}>
              <View style={focused ? styles.activeWrap : undefined}>
                <Ionicons name="chatbubbles" size={22} color={color} />
              </View>
              {totalUnreadCount > 0 && (
                <View style={styles.chatTabBadge}>
                  <Text style={styles.chatTabBadgeText}>{chatsBadgeText}</Text>
                </View>
              )}
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
  chatIconWrap: {
    position: 'relative',
    overflow: 'visible',
  },
  activeWrap: {
    backgroundColor: 'rgba(107,143,113,0.15)',
    borderRadius: 10,
    padding: 4,
  },
  chatTabBadge: {
    position: 'absolute',
    top: -6,
    right: -12,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1,
    borderColor: AppColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 10,
  },
  chatTabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 11,
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
