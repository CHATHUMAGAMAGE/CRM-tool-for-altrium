import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme } from '@/context/ThemeContext';

const BLUE = '#1557E8';

const LIGHT_TAB_BACKGROUND = '#FFFFFF';
const LIGHT_INACTIVE = '#8A8F98';

const DARK_TAB_BACKGROUND = '#111111';
const DARK_INACTIVE = '#8F949C';

export default function TabLayout() {
  const { theme } = useAppTheme();

  const isDark = theme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,

        tabBarActiveTintColor: BLUE,

        tabBarInactiveTintColor: isDark
          ? DARK_INACTIVE
          : LIGHT_INACTIVE,

        tabBarStyle: {
          backgroundColor: isDark
            ? DARK_TAB_BACKGROUND
            : LIGHT_TAB_BACKGROUND,
          borderTopWidth: 0,
          elevation: 0,
        },

        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="house.fill"
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="leads"
        options={{
          title: 'Assigned Leads',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="person.2.fill"
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="person.fill"
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}