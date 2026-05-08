/**
 * Read Email Screen
 *
 * Displays a single email in large, high-contrast text.
 * Reads it aloud and supports voice commands:
 * - "repeat" to hear again
 * - "delete" to delete
 * - "go back" to return
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../context/AuthContext';
import { useTTS } from '../../hooks/useTTS';
import { useScreenVoice } from '../../hooks/useScreenVoice';
import { parseCommand } from '../../services/commandParser';
import { getEmail, deleteEmail, EmailData } from '../../services/api';
import { VoiceButton } from '../../components/VoiceButton';
import { VoiceFeedback } from '../../components/VoiceFeedback';
import { HandsFreeIndicator } from '../../components/HandsFreeIndicator';
import { Colors } from '../../constants/colors';
import { VoicePrompts } from '../../constants/voicePrompts';

export default function ReadEmailScreen() {
  const router = useRouter();
  const { emailId } = useLocalSearchParams<{ emailId: string }>();
  const { getToken } = useAuthContext();
  const { speak, stop: stopSpeaking, isSpeaking } = useTTS();

  const [email, setEmail] = useState<EmailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('Loading email...');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Fetch the email on mount
  useEffect(() => {
    if (emailId) {
      fetchEmail(emailId);
    }
  }, [emailId]);

  const fetchEmail = async (id: string) => {
    const token = getToken();
    if (!token) {
      speak('Please log in first.');
      router.replace('/login');
      return;
    }

    try {
      setIsLoading(true);
      const result = await getEmail(token, id);
      setEmail(result.email);

      // Read the email aloud
      speak(
        VoicePrompts.readingEmail(
          result.email.sender,
          result.email.subject,
          result.email.message
        ) +
          '. ' +
          VoicePrompts.readInstructions
      );
      setStatus('Email loaded');
    } catch (err) {
      speak('Failed to load email. ' + VoicePrompts.tryAgain);
      setStatus('Failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  // Voice command handler
  const handleVoiceResult = useCallback(
    (text: string, isFinal: boolean) => {
      if (!isFinal) return;

      const command = parseCommand(text);

      // Handle delete confirmation
      if (confirmDelete) {
        if (command.action === 'yes') {
          handleDelete();
        } else {
          setConfirmDelete(false);
          speak('Delete cancelled.');
          setStatus('Email displayed');
        }
        return;
      }

      // Contextual responses for wrong-screen commands
      if (command.action === 'compose') {
        speak('Say go back to return to your inbox first.');
        return;
      }
      if (command.action === 'inbox') {
        speak('Going back to inbox.', () => router.back());
        return;
      }
      if (command.action === 'logout') {
        speak('Say go back first to return to the home screen.');
        return;
      }
      if (command.action === 'help') {
        speak(VoicePrompts.readInstructions);
        return;
      }

      switch (command.action) {
        case 'repeat':
          if (email) {
            speak(
              VoicePrompts.readingEmail(email.sender, email.subject, email.message)
            );
          }
          break;

        case 'delete':
          setConfirmDelete(true);
          speak(VoicePrompts.deleteConfirm);
          setStatus('Confirm delete?');
          break;

        case 'back':
          speak(VoicePrompts.goingBack, () => router.back());
          break;

        default:
          speak(VoicePrompts.unknownCommand + ' ' + VoicePrompts.readInstructions);
          break;
      }
    },
    [email, confirmDelete]
  );

  const { mode, isListening, transcript, activate, deactivate } = useScreenVoice({
    onResult: handleVoiceResult,
    onError: () => speak(VoicePrompts.pleaseRepeat),
    onModeChange: (newMode) => {
      if (newMode === 'active') {
        setStatus('Hands-free active');
      } else if (newMode === 'standby') {
        setStatus('Standby — say "Hey VoiceMail"');
      }
    },
    onAlreadyActive: () => {
      speak("I'm already listening! Say a command.");
    },
  });

  // Delete handler
  const handleDelete = async () => {
    setConfirmDelete(false);
    const token = getToken();
    if (!token || !emailId) return;

    try {
      await deleteEmail(token, emailId);
      speak(VoicePrompts.deleteSuccess + ' Returning to inbox.', () => {
        router.back();
      });
    } catch (err) {
      speak(VoicePrompts.deleteFailed);
    }
  };

  const toggleListening = () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    if (mode === 'active') {
      deactivate();
    } else {
      activate();
    }
  };

  const currentVoiceState =
    mode === 'active' && isListening
      ? 'listening'
      : isSpeaking
      ? 'speaking'
      : isLoading
      ? 'processing'
      : 'idle';

  // Format date
  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back to inbox"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Email</Text>
        <TouchableOpacity
          onPress={() => {
            setConfirmDelete(true);
            speak(VoicePrompts.deleteConfirm);
          }}
          style={styles.deleteButton}
          accessibilityLabel="Delete this email"
        >
          <Ionicons name="trash-outline" size={24} color={Colors.error} />
        </TouchableOpacity>
      </View>

      {/* Hands-free indicator */}
      <HandsFreeIndicator mode={mode} isListening={isListening} />

      {/* Voice feedback */}
      <VoiceFeedback
        status={status}
        transcript={transcript}
        state={currentVoiceState}
      />

      {/* Email content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading email...</Text>
        </View>
      ) : email ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
        >
          {/* Subject */}
          <Text style={styles.subject}>{email.subject || '(No Subject)'}</Text>

          {/* Metadata */}
          <View style={styles.metaContainer}>
            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.metaLabel}>From:</Text>
              <Text style={styles.metaValue}>{email.sender}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="mail-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.metaLabel}>To:</Text>
              <Text style={styles.metaValue}>{email.recipient}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.metaValue}>{formatDate(email.created_at)}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Message body */}
          <Text
            style={styles.messageBody}
            selectable
            accessibilityLabel={`Email message: ${email.message}`}
          >
            {email.message}
          </Text>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                if (email) {
                  speak(
                    VoicePrompts.readingEmail(
                      email.sender,
                      email.subject,
                      email.message
                    )
                  );
                }
              }}
              accessibilityLabel="Read email aloud again"
            >
              <Ionicons name="volume-high" size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>Read Aloud</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteActionButton]}
              onPress={() => {
                setConfirmDelete(true);
                speak(VoicePrompts.deleteConfirm);
              }}
              accessibilityLabel="Delete this email"
            >
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
              <Text style={[styles.actionButtonText, { color: Colors.error }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={Colors.error} />
          <Text style={styles.errorText}>Email not found</Text>
        </View>
      )}

      {/* Voice button */}
      <View style={styles.voiceArea}>
        <VoiceButton
          isListening={mode === 'active' && isListening}
          isSpeaking={isSpeaking}
          onPress={toggleListening}
          label={
            mode === 'active'
              ? 'Listening...'
              : 'Tap or say "Hey VoiceMail"'
          }
          size={90}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 20,
    paddingBottom: 40,
  },
  subject: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    lineHeight: 36,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  metaContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
    width: 45,
  },
  metaValue: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 20,
  },
  messageBody: {
    fontSize: 20,
    color: Colors.text,
    lineHeight: 32,
    letterSpacing: 0.2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deleteActionButton: {
    borderColor: Colors.error + '40',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 18,
    color: Colors.error,
    fontWeight: '600',
  },
  voiceArea: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
