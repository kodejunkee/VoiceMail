/**
 * Splash Screen (Index)
 *
 * Entry point that:
 * - Displays the app name and logo
 * - Speaks a welcome message
 * - Auto-routes to login or home based on auth state
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import { useTTS } from '../hooks/useTTS';
import { Colors } from '../constants/colors';

export default function SplashScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuthContext();
  const { speak } = useTTS();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Show subtitle after main animation
      Animated.timing(subtitleFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  // Navigate once auth state is determined
  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (user) {
        speak('Welcome back to VoiceMail Assist. Say Hey VoiceMail to activate voice commands.');
        router.replace('/(tabs)/home');
      } else {
        speak('Welcome to VoiceMail Assist. Please log in to continue.');
        router.replace('/login');
      }
    }, 2000); // Show splash for 2 seconds

    return () => clearTimeout(timer);
  }, [isLoading, user]);

  return (
    <View style={styles.container}>
      {/* Animated logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="mail" size={60} color={Colors.text} />
        </View>

        <Text style={styles.title}>VoiceMail</Text>
        <Text style={styles.titleAccent}>Assist</Text>
      </Animated.View>

      {/* Subtitle */}
      <Animated.View style={[styles.subtitleContainer, { opacity: subtitleFade }]}>
        <Text style={styles.subtitle}>Voice-Powered Email</Text>
        <Text style={styles.tagline}>Designed for Accessibility</Text>
      </Animated.View>

      {/* Loading indicator */}
      <Animated.View style={[styles.loadingContainer, { opacity: subtitleFade }]}>
        <View style={styles.loadingDot} />
        <View style={[styles.loadingDot, styles.loadingDotDelay]} />
        <View style={[styles.loadingDot, styles.loadingDotDelay2]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  logoContainer: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    elevation: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -1,
  },
  titleAccent: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -1,
    marginTop: -12,
  },
  subtitleContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 48,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    opacity: 0.6,
  },
  loadingDotDelay: {
    opacity: 0.4,
  },
  loadingDotDelay2: {
    opacity: 0.2,
  },
});
