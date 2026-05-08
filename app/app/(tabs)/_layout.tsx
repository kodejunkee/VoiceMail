/**
 * Tabs Layout
 *
 * Hidden tab bar — navigation is voice-driven.
 * Tabs exist for expo-router structure but aren't shown.
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // Hidden — voice-driven navigation
        sceneStyle: { backgroundColor: Colors.background },
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="compose" />
      <Tabs.Screen name="inbox" />
      <Tabs.Screen name="read" />
    </Tabs>
  );
}
