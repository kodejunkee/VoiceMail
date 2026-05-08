/**
 * VoiceFeedback Component
 *
 * Displays the current voice status and transcription text.
 * Acts as visual confirmation of what the system heard.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface VoiceFeedbackProps {
  /** Current status message */
  status: string;
  /** The transcribed text */
  transcript?: string;
  /** Current voice state */
  state: 'idle' | 'listening' | 'processing' | 'speaking';
}

export function VoiceFeedback({ status, transcript, state }: VoiceFeedbackProps) {
  const stateConfig = {
    idle: { icon: 'ellipsis-horizontal' as const, color: Colors.idle },
    listening: { icon: 'ear' as const, color: Colors.listening },
    processing: { icon: 'hourglass' as const, color: Colors.processing },
    speaking: { icon: 'volume-high' as const, color: Colors.speaking },
  };

  const { icon, color } = stateConfig[state];

  return (
    <View style={styles.container}>
      {/* Status indicator */}
      <View style={[styles.statusRow]}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={[styles.statusText, { color }]}>
          {status}
        </Text>
      </View>

      {/* Transcription display */}
      {transcript ? (
        <View style={styles.transcriptContainer}>
          <Text style={styles.transcriptLabel}>You said:</Text>
          <Text
            style={styles.transcriptText}
            accessibilityLiveRegion="polite"
          >
            "{transcript}"
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    width: '100%',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  transcriptContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  transcriptText: {
    fontSize: 18,
    color: Colors.text,
    fontWeight: '500',
    lineHeight: 26,
  },
});
