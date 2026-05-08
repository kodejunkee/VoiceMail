/**
 * Root Layout
 *
 * App entry point that:
 * - Wraps the app in AuthProvider
 * - Wraps in HandsFreeProvider (single speech recognizer)
 * - Sets up the navigation stack
 * - Handles auth-based routing
 */

import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { AuthProvider } from '../context/AuthContext';
import { HandsFreeProvider } from '../context/HandsFreeContext';
import { Colors } from '../constants/colors';

export default function RootLayout() {
  return (
    <AuthProvider>
      <HandsFreeProvider>
        <View style={styles.container}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.background },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </View>
      </HandsFreeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
