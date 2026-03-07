import ProfileSetupOverlay from '@/components/ProfileSetupOverlay';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

export default function TabLayout() {
  const { user } = useAuth();
  const { colors, isSait } = useTheme();
  if (!user) return <Redirect href="/(auth)/welcome" />;

  // In SAIT mode, use blue for tab bar accents so it's not all red
  const tabAccent = isSait ? colors.secondary : colors.primary;

  return (
    <>
      {!user.profileComplete && <ProfileSetupOverlay />}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: tabAccent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
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
            <View style={focused ? [styles.activeWrap, { backgroundColor: tabAccent + '20' }] : undefined}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            </View>
          ),
        }} />
        <Tabs.Screen name="search" options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeWrap, { backgroundColor: tabAccent + '20' }] : undefined}>
              <Ionicons name={focused ? 'search' : 'search-outline'} size={22} color={color} />
            </View>
          ),
        }} />
        <Tabs.Screen name="post" options={{
          title: 'Post',
          tabBarShowLabel: false,
          tabBarLabel: () => null,
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.postColumn}>
              {focused ? (
                <LinearGradient
                  colors={[colors.gradientFrom, colors.gradientTo]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.postWrap, { borderWidth: 0 }]}
                >
                  <Ionicons name="add" size={26} color="#FFFFFF" />
                </LinearGradient>
              ) : (
                <View style={[styles.postWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="add" size={26} color={color} />
                </View>
              )}
              <Text style={[styles.postLabel, { color: focused ? colors.primary : colors.textMuted }]}>Post</Text>
            </View>
          ),
        }} />
        <Tabs.Screen name="chats" options={{
          title: 'Chats',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeWrap, { backgroundColor: tabAccent + '20' }] : undefined}>
              <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={22} color={color} />
            </View>
          ),
        }} />
        <Tabs.Screen name="profile" options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeWrap, { backgroundColor: tabAccent + '20' }] : undefined}>
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
    borderRadius: 10,
    padding: 4,
  },
  postColumn: {
    alignItems: 'center', justifyContent: 'center',
  },
  postWrap: {
    width: 44, height: 44, borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  postLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 2,
  },
});
