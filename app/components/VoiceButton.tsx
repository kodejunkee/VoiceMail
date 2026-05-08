/**
 * VoiceButton Component
 *
 * Large, accessible microphone button with pulsing animation
 * when actively listening. Primary interaction point for the app.
 */

import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  View,
  Text,
  AccessibilityInfo,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface VoiceButtonProps {
  /** Whether the mic is currently listening */
  isListening: boolean;
  /** Whether TTS is currently speaking */
  isSpeaking?: boolean;
  /** Called when the button is pressed */
  onPress: () => void;
  /** Optional label below the button */
  label?: string;
  /** Size of the button (default: 120) */
  size?: number;
}

export function VoiceButton({
  isListening,
  isSpeaking = false,
  onPress,
  label,
  size = 120,
}: VoiceButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation when listening
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.15,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      glowAnim.stopAnimation();
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isListening]);

  // Determine button color based on state
  const buttonColor = isListening
    ? Colors.listening
    : isSpeaking
    ? Colors.speaking
    : Colors.primary;

  const iconName = isListening ? 'mic' : 'mic-outline';
  const accessLabel = isListening
    ? 'Microphone is active. Tap to stop listening.'
    : 'Tap to start listening for voice commands.';

  return (
    <View style={styles.container}>
      {/* Outer glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            width: size + 40,
            height: size + 40,
            borderRadius: (size + 40) / 2,
            borderColor: buttonColor,
            opacity: glowAnim,
          },
        ]}
      />

      {/* Main button */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[
            styles.button,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: buttonColor,
            },
          ]}
          onPress={onPress}
          activeOpacity={0.7}
          accessibilityLabel={accessLabel}
          accessibilityRole="button"
          accessibilityState={{ selected: isListening }}
        >
          <Ionicons
            name={iconName}
            size={size * 0.45}
            color={Colors.textOnPrimary}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Status label */}
      {label && (
        <Text
          style={[styles.label, { color: buttonColor }]}
          accessibilityLiveRegion="polite"
        >
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  label: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
