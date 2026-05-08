/**
 * HandsFreeIndicator Component
 *
 * Small persistent badge showing the current hands-free mode:
 * - Standby: dim dot + "Say Hey VoiceMail"
 * - Active:  pulsing green dot + "Listening..."
 * - Disabled: hidden
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import type { HandsFreeMode } from '../hooks/useHandsFree';

interface HandsFreeIndicatorProps {
  mode: HandsFreeMode;
  isListening: boolean;
}

export function HandsFreeIndicator({ mode, isListening }: HandsFreeIndicatorProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (mode === 'active' && isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [mode, isListening]);

  if (mode === 'disabled') return null;

  const isActive = mode === 'active';
  const dotColor = isActive ? Colors.accent : Colors.textMuted;
  const label = isActive
    ? 'Hands-free active'
    : 'Say "Hey VoiceMail"';
  const icon = isActive ? 'ear' : 'ear-outline';

  return (
    <View style={[styles.container, isActive && styles.containerActive]}>
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: dotColor, transform: [{ scale: pulseAnim }] },
        ]}
      />
      <Ionicons name={icon as any} size={14} color={dotColor} style={styles.icon} />
      <Text style={[styles.label, { color: dotColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignSelf: 'center',
  },
  containerActive: {
    borderColor: Colors.accent,
    backgroundColor: `${Colors.accent}15`,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
