/**
 * Home Screen — Voice Command Hub
 *
 * Central hub where users interact with the app via voice.
 * Supports both hands-free (wake word) and button-press modes.
 *
 * Hands-free: Say "Hey VoiceMail" to activate, "Go to sleep" to deactivate.
 * Button: Tap the mic button to toggle listening.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../context/AuthContext';
import { useTTS } from '../../hooks/useTTS';
import { useScreenVoice } from '../../hooks/useScreenVoice';
import { parseCommand } from '../../services/commandParser';
import { VoiceButton } from '../../components/VoiceButton';
import { VoiceFeedback } from '../../components/VoiceFeedback';
import { HandsFreeIndicator } from '../../components/HandsFreeIndicator';
import { Colors } from '../../constants/colors';
import { VoicePrompts } from '../../constants/voicePrompts';

export default function HomeScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthContext();
  const { speak, stop: stopSpeaking, isSpeaking } = useTTS();
  const [status, setStatus] = useState('Ready');
  const [hasGreeted, setHasGreeted] = useState(false);

  // Handle voice results (same logic as before)
  const handleVoiceResult = useCallback(
    (text: string, isFinal: boolean) => {
      if (!isFinal) return;

      const command = parseCommand(text);

      switch (command.action) {
        case 'compose':
          speak('Opening compose email.', () => {
            router.push('/(tabs)/compose');
          });
          setStatus('Opening compose...');
          break;

        case 'inbox':
          speak('Opening your inbox.', () => {
            router.push('/(tabs)/inbox');
          });
          setStatus('Opening inbox...');
          break;

        case 'logout':
          speak(VoicePrompts.goodbye, () => {
            signOut();
            router.replace('/login');
          });
          setStatus('Logging out...');
          break;

        case 'help':
          speak(VoicePrompts.homeInstructions);
          setStatus('Listing commands...');
          break;

        case 'repeat':
          speak(VoicePrompts.homeInstructions);
          break;

        case 'back':
          speak("You're already on the home screen. " + VoicePrompts.homeInstructions);
          break;

        default:
          speak(VoicePrompts.unknownCommand + ' ' + VoicePrompts.homeInstructions);
          setStatus('Unknown command');
          break;
      }
    },
    [router, signOut]
  );

  // Hands-free voice with wake word (uses global singleton)
  const {
    mode,
    isListening,
    transcript,
    activate,
    deactivate,
  } = useScreenVoice({
    onResult: handleVoiceResult,
    onModeChange: (newMode) => {
      if (newMode === 'active') {
        speak("I'm listening. What would you like to do?");
        setStatus('Hands-free active');
      } else if (newMode === 'standby') {
        speak('Going to sleep. Say Hey VoiceMail to wake me up.');
        setStatus('Standby — say "Hey VoiceMail"');
      }
    },
    onAlreadyActive: () => {
      speak("I'm already listening! Go ahead and say a command.");
    },
    onError: () => {
      speak(VoicePrompts.pleaseRepeat);
      setStatus('Voice error');
    },
  });

  // Set initial status (splash screen handles the spoken greeting)
  useEffect(() => {
    if (!hasGreeted) {
      setHasGreeted(true);
      setStatus('Standby — say "Hey VoiceMail"');
    }
  }, [hasGreeted]);

  // Button press — manually toggle active/standby
  const toggleListening = () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    if (mode === 'active') {
      deactivate();
      setStatus('Standby — say "Hey VoiceMail"');
    } else {
      activate();
      setStatus('Listening...');
    }
  };

  const currentVoiceState =
    mode === 'active' && isListening
      ? 'listening'
      : isSpeaking
      ? 'speaking'
      : 'idle';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hello{user?.email ? `, ${user.email.split('@')[0]}` : ''}
          </Text>
          <Text style={styles.headerSubtitle}>VoiceMail Assist</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            speak(VoicePrompts.goodbye, () => {
              signOut();
              router.replace('/login');
            });
          }}
          style={styles.logoutButton}
          accessibilityLabel="Logout button"
        >
          <Ionicons name="log-out-outline" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Hands-free indicator */}
      <HandsFreeIndicator mode={mode} isListening={isListening} />

      {/* Voice feedback area */}
      <View style={styles.feedbackArea}>
        <VoiceFeedback
          status={status}
          transcript={transcript}
          state={currentVoiceState}
        />
      </View>

      {/* Main voice button */}
      <View style={styles.voiceArea}>
        <VoiceButton
          isListening={mode === 'active' && isListening}
          isSpeaking={isSpeaking}
          onPress={toggleListening}
          label={
            mode === 'active'
              ? 'Listening...'
              : isSpeaking
              ? 'Speaking...'
              : 'Tap or say "Hey VoiceMail"'
          }
          size={140}
        />
      </View>

      {/* Quick action buttons */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            speak('Opening compose email.', () => {
              router.push('/(tabs)/compose');
            });
          }}
          accessibilityLabel="Compose new email"
          accessibilityRole="button"
        >
          <Ionicons name="create-outline" size={28} color={Colors.primary} />
          <Text style={styles.actionText}>Compose</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            speak('Opening your inbox.', () => {
              router.push('/(tabs)/inbox');
            });
          }}
          accessibilityLabel="Read inbox"
          accessibilityRole="button"
        >
          <Ionicons name="mail-outline" size={28} color={Colors.accent} />
          <Text style={styles.actionText}>Inbox</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => speak(VoicePrompts.homeInstructions)}
          accessibilityLabel="Help with voice commands"
          accessibilityRole="button"
        >
          <Ionicons name="help-circle-outline" size={28} color={Colors.warning} />
          <Text style={styles.actionText}>Help</Text>
        </TouchableOpacity>
      </View>

      {/* Command hints */}
      <View style={styles.hints}>
        <Text style={styles.hintTitle}>Voice Commands:</Text>
        <Text style={styles.hintText}>• "Hey VoiceMail" — wake up</Text>
        <Text style={styles.hintText}>• "Compose email"</Text>
        <Text style={styles.hintText}>• "Read inbox"</Text>
        <Text style={styles.hintText}>• "Go to sleep" — standby</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 2,
  },
  logoutButton: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  feedbackArea: {
    marginTop: 8,
  },
  voiceArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 8,
  },
  hints: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hintTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  hintText: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 22,
  },
});
