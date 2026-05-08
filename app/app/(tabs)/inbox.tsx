/**
 * Inbox Screen
 *
 * Fetches and displays emails from the backend.
 * Reads email summaries aloud and supports voice navigation.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../context/AuthContext';
import { useTTS } from '../../hooks/useTTS';
import { useScreenVoice } from '../../hooks/useScreenVoice';
import { parseCommand } from '../../services/commandParser';
import { getEmails, deleteEmail, EmailData } from '../../services/api';
import { AccessibleCard } from '../../components/AccessibleCard';
import { VoiceButton } from '../../components/VoiceButton';
import { VoiceFeedback } from '../../components/VoiceFeedback';
import { HandsFreeIndicator } from '../../components/HandsFreeIndicator';
import { Colors } from '../../constants/colors';
import { VoicePrompts } from '../../constants/voicePrompts';

export default function InboxScreen() {
  const router = useRouter();
  const { getToken } = useAuthContext();
  const { speak, stop: stopSpeaking, isSpeaking } = useTTS();

  const [emails, setEmails] = useState<EmailData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState('Loading inbox...');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const emailsRef = useRef<EmailData[]>([]);
  const currentIndexRef = useRef(0);

  // Keep refs in sync
  useEffect(() => {
    emailsRef.current = emails;
  }, [emails]);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Fetch emails on mount
  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    const token = getToken();
    if (!token) {
      speak('Please log in first.');
      router.replace('/login');
      return;
    }

    try {
      setIsLoading(true);
      speak(VoicePrompts.inboxLoading);
      const result = await getEmails(token);
      setEmails(result.emails);
      setCurrentIndex(0);

      if (result.emails.length === 0) {
        speak(VoicePrompts.inboxEmpty);
        setStatus('No emails');
      } else {
        const count = result.count;
        speak(
          VoicePrompts.inboxCount(count) +
            ' ' +
            VoicePrompts.emailSummary(
              1,
              result.emails[0].sender,
              result.emails[0].subject
            ) +
            ' ' +
            VoicePrompts.inboxInstructions
        );
        setStatus(`${count} emails — Email 1`);
      }
    } catch (err) {
      speak(VoicePrompts.networkError);
      setStatus('Failed to load');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Voice command handler
  const handleVoiceResult = useCallback(
    (text: string, isFinal: boolean) => {
      if (!isFinal) return;

      const command = parseCommand(text);
      const currentEmails = emailsRef.current;
      const idx = currentIndexRef.current;

      // Handle delete confirmation
      if (confirmDelete) {
        if (command.action === 'yes') {
          handleDeleteEmail(currentEmails[idx]?.id);
        } else {
          setConfirmDelete(false);
          speak('Delete cancelled.');
          setStatus(`Email ${idx + 1}`);
        }
        return;
      }

      // Contextual responses for redundant/wrong-screen commands
      if (command.action === 'inbox') {
        speak("You're already in your inbox. Say next, previous, or open to navigate.");
        return;
      }
      if (command.action === 'compose') {
        speak('Going to compose.', () => router.push('/(tabs)/compose'));
        return;
      }
      if (command.action === 'logout') {
        speak('Say go back first to return to the home screen.');
        return;
      }
      if (command.action === 'help') {
        speak(VoicePrompts.inboxInstructions);
        return;
      }

      switch (command.action) {
        case 'next': {
          if (idx < currentEmails.length - 1) {
            const newIdx = idx + 1;
            setCurrentIndex(newIdx);
            const email = currentEmails[newIdx];
            speak(VoicePrompts.emailSummary(newIdx + 1, email.sender, email.subject));
            setStatus(`Email ${newIdx + 1} of ${currentEmails.length}`);
          } else {
            speak(VoicePrompts.noMoreEmails);
          }
          break;
        }

        case 'previous': {
          if (idx > 0) {
            const newIdx = idx - 1;
            setCurrentIndex(newIdx);
            const email = currentEmails[newIdx];
            speak(VoicePrompts.emailSummary(newIdx + 1, email.sender, email.subject));
            setStatus(`Email ${newIdx + 1} of ${currentEmails.length}`);
          } else {
            speak(VoicePrompts.noPreviousEmails);
          }
          break;
        }

        case 'open': {
          const openIdx = command.index ? command.index - 1 : idx;
          if (openIdx >= 0 && openIdx < currentEmails.length) {
            const email = currentEmails[openIdx];
            router.push({
              pathname: '/(tabs)/read',
              params: { emailId: email.id },
            });
          } else {
            speak('That email does not exist.');
          }
          break;
        }

        case 'repeat': {
          if (currentEmails.length > 0) {
            const email = currentEmails[idx];
            speak(VoicePrompts.emailSummary(idx + 1, email.sender, email.subject));
          } else {
            speak(VoicePrompts.inboxEmpty);
          }
          break;
        }

        case 'delete': {
          if (currentEmails.length > 0) {
            setConfirmDelete(true);
            speak(VoicePrompts.deleteConfirm);
            setStatus('Confirm delete?');
          }
          break;
        }

        case 'back': {
          speak(VoicePrompts.goingBack, () => router.back());
          break;
        }

        default:
          speak(VoicePrompts.unknownCommand + ' ' + VoicePrompts.inboxInstructions);
          break;
      }
    },
    [confirmDelete]
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

  // Delete email handler
  const handleDeleteEmail = async (emailId?: string) => {
    if (!emailId) return;
    setConfirmDelete(false);

    const token = getToken();
    if (!token) return;

    try {
      await deleteEmail(token, emailId);
      speak(VoicePrompts.deleteSuccess);
      // Remove from local state
      const newEmails = emails.filter((e) => e.id !== emailId);
      setEmails(newEmails);
      if (currentIndex >= newEmails.length && newEmails.length > 0) {
        setCurrentIndex(newEmails.length - 1);
      }
      setStatus(`Deleted. ${newEmails.length} emails remaining.`);
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Inbox</Text>
        <TouchableOpacity
          onPress={() => {
            setIsRefreshing(true);
            fetchEmails();
          }}
          style={styles.backButton}
          accessibilityLabel="Refresh inbox"
        >
          <Ionicons name="refresh" size={24} color={Colors.text} />
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

      {/* Email list */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading emails...</Text>
        </View>
      ) : emails.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="mail-open-outline" size={80} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No Emails</Text>
          <Text style={styles.emptyText}>Your inbox is empty</Text>
        </View>
      ) : (
        <FlatList
          data={emails}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                fetchEmails();
              }}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item, index }) => (
            <View
              style={[
                index === currentIndex && styles.selectedCard,
              ]}
            >
              <AccessibleCard
                sender={item.sender}
                subject={item.subject}
                preview={item.message.substring(0, 80)}
                time={item.created_at}
                isRead={item.is_read}
                index={index + 1}
                onPress={() => {
                  setCurrentIndex(index);
                  router.push({
                    pathname: '/(tabs)/read',
                    params: { emailId: item.id },
                  });
                }}
              />
            </View>
          )}
        />
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: -0.5,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  selectedCard: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    padding: 2,
  },
  voiceArea: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
