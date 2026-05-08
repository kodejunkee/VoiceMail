/**
 * Compose Screen — Voice-Based Email Composition
 *
 * Guided multi-step flow:
 * 1. Ask for recipient → confirm
 * 2. Ask for subject → confirm
 * 3. Ask for message body → confirm
 * 4. Send email
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../context/AuthContext';
import { useTTS } from '../../hooks/useTTS';
import { useScreenVoice } from '../../hooks/useScreenVoice';
import { parseCommand, extractEmail } from '../../services/commandParser';
import { sendEmail } from '../../services/api';
import { VoiceButton } from '../../components/VoiceButton';
import { VoiceFeedback } from '../../components/VoiceFeedback';
import { HandsFreeIndicator } from '../../components/HandsFreeIndicator';
import { Colors } from '../../constants/colors';
import { VoicePrompts } from '../../constants/voicePrompts';

type ComposeStep =
  | 'recipient'
  | 'confirm_recipient'
  | 'subject'
  | 'confirm_subject'
  | 'message'
  | 'confirm_message'
  | 'sending'
  | 'done';

export default function ComposeScreen() {
  const router = useRouter();
  const { getToken } = useAuthContext();
  const { speak, stop: stopSpeaking, isSpeaking } = useTTS();

  const [step, setStep] = useState<ComposeStep>('recipient');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  // Greet on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      speak(VoicePrompts.composeStart);
      setStatus('Who is this email for?');
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Voice result handler — drives the compose state machine
  const handleVoiceResult = useCallback(
    (text: string, isFinal: boolean) => {
      if (!isFinal) return;

      const command = parseCommand(text);

      // Global commands that work in any step
      if (command.action === 'back') {
        speak(VoicePrompts.goingBack, () => router.back());
        return;
      }
      if (command.action === 'start_over') {
        setRecipient('');
        setSubject('');
        setMessage('');
        setStep('recipient');
        speak('Starting over. ' + VoicePrompts.askRecipient);
        setStatus('Who is this email for?');
        return;
      }

      // Contextual responses for redundant/wrong-screen commands
      if (command.action === 'compose') {
        speak("You're already composing an email. Go ahead and continue.");
        return;
      }
      if (command.action === 'inbox') {
        speak('You are currently composing an email. Say go back to return home first, or say start over to restart.');
        return;
      }
      if (command.action === 'logout') {
        speak('You are in the middle of composing. Say go back first if you want to leave.');
        return;
      }
      if (command.action === 'help') {
        const stepHints: Record<string, string> = {
          recipient: 'Say the email address of who you want to send to.',
          confirm_recipient: 'Say yes to confirm the email address, or no to try again.',
          subject: 'Say the subject of your email.',
          confirm_subject: 'Say yes to confirm the subject, or no to try again.',
          message: 'Speak your message now.',
          confirm_message: 'Say send to send the email, repeat to hear it again, or no to redo your message.',
        };
        speak(stepHints[step] || 'Say go back to return home, or start over to restart.');
        return;
      }

      switch (step) {
        case 'recipient': {
          const email = extractEmail(text);
          if (email) {
            setRecipient(email);
            setStep('confirm_recipient');
            speak(VoicePrompts.confirmRecipient(email));
            setStatus(`Confirm: ${email}`);
          } else {
            speak("I couldn't understand that email address. Please say it again slowly, for example: john at gmail dot com.");
            setStatus('Please repeat the email');
          }
          break;
        }

        case 'confirm_recipient': {
          if (command.action === 'yes') {
            setStep('subject');
            speak(VoicePrompts.askSubject);
            setStatus('What is the subject?');
          } else if (command.action === 'no') {
            setRecipient('');
            setStep('recipient');
            speak(VoicePrompts.askRecipient);
            setStatus('Who is this email for?');
          }
          break;
        }

        case 'subject': {
          setSubject(text.trim());
          setStep('confirm_subject');
          speak(VoicePrompts.confirmSubject(text.trim()));
          setStatus(`Subject: ${text.trim()}`);
          break;
        }

        case 'confirm_subject': {
          if (command.action === 'yes') {
            setStep('message');
            speak(VoicePrompts.askMessage);
            setStatus('Speak your message');
          } else if (command.action === 'no') {
            setSubject('');
            setStep('subject');
            speak(VoicePrompts.askSubject);
            setStatus('What is the subject?');
          }
          break;
        }

        case 'message': {
          setMessage(text.trim());
          setStep('confirm_message');
          speak(VoicePrompts.confirmMessage(text.trim()));
          setStatus('Review your message');
          break;
        }

        case 'confirm_message': {
          if (command.action === 'send' || command.action === 'yes') {
            handleSendEmail();
          } else if (command.action === 'repeat') {
            speak(VoicePrompts.confirmMessage(message));
          } else if (command.action === 'no') {
            setMessage('');
            setStep('message');
            speak(VoicePrompts.askMessage);
            setStatus('Speak your message again');
          }
          break;
        }
      }
    },
    [step, recipient, subject, message]
  );

  const { mode, isListening, transcript, activate, deactivate } = useScreenVoice({
    onResult: handleVoiceResult,
    onError: () => {
      speak(VoicePrompts.pleaseRepeat);
    },
    onModeChange: (newMode) => {
      if (newMode === 'active') {
        setStatus('Hands-free active');
      } else if (newMode === 'standby') {
        setStatus('Standby — say "Hey VoiceMail"');
      }
    },
    onAlreadyActive: () => {
      speak("I'm already listening! Go ahead with your command.");
    },
  });

  // Send the email via backend API
  const handleSendEmail = async () => {
    setStep('sending');
    setStatus('Sending email...');
    speak(VoicePrompts.sending);

    const token = getToken();
    if (!token) {
      speak('Authentication error. Please log in again.');
      router.replace('/login');
      return;
    }

    try {
      await sendEmail(token, {
        recipient,
        subject: subject || '(No Subject)',
        message,
      });

      setStep('done');
      setStatus('Email sent!');
      speak(VoicePrompts.sendSuccess + ' Returning to home.', () => {
        router.back();
      });
    } catch (err: any) {
      console.error('Send email failed:', err.message || err);
      setStep('confirm_message');
      setStatus(`Send failed: ${err.message || 'Unknown error'}`);
      speak(VoicePrompts.sendFailed + ' Say send to try again.');
    }
  };

  // Manual send via button
  const handleManualSend = () => {
    if (!recipient || !message) {
      speak('Please fill in the recipient and message before sending.');
      return;
    }
    handleSendEmail();
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
      : step === 'sending'
      ? 'processing'
      : 'idle';

  // Step indicator
  const stepNumber =
    step === 'recipient' || step === 'confirm_recipient'
      ? 1
      : step === 'subject' || step === 'confirm_subject'
      ? 2
      : step === 'message' || step === 'confirm_message'
      ? 3
      : step === 'sending' || step === 'done'
      ? 4
      : 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            speak(VoicePrompts.goingBack, () => router.back());
          }}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Compose Email</Text>
        <View style={styles.backButton} />
      </View>

      {/* Hands-free indicator */}
      <HandsFreeIndicator mode={mode} isListening={isListening} />

      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        {[1, 2, 3, 4].map((s) => (
          <View
            key={s}
            style={[
              styles.stepDot,
              s <= stepNumber && styles.stepDotActive,
              s === stepNumber && styles.stepDotCurrent,
            ]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        keyboardShouldPersistTaps="handled"
      >
        {/* Voice feedback */}
        <VoiceFeedback
          status={status}
          transcript={transcript}
          state={currentVoiceState}
        />

        {/* Compose fields (visual display) */}
        <View style={styles.fieldsContainer}>
          {/* Recipient */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>To:</Text>
            <TextInput
              style={styles.fieldInput}
              value={recipient}
              onChangeText={setRecipient}
              placeholder="recipient@email.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              accessibilityLabel="Recipient email"
            />
            {recipient ? (
              <Ionicons name="checkmark-circle" size={24} color={Colors.accent} />
            ) : null}
          </View>

          {/* Subject */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Subject:</Text>
            <TextInput
              style={styles.fieldInput}
              value={subject}
              onChangeText={setSubject}
              placeholder="Email subject"
              placeholderTextColor={Colors.textMuted}
              accessibilityLabel="Email subject"
            />
            {subject ? (
              <Ionicons name="checkmark-circle" size={24} color={Colors.accent} />
            ) : null}
          </View>

          {/* Message */}
          <View style={styles.messageContainer}>
            <Text style={styles.fieldLabel}>Message:</Text>
            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Your email message..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              accessibilityLabel="Email message"
            />
          </View>
        </View>

        {/* Send button (manual fallback) */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!recipient || !message) && styles.sendButtonDisabled,
          ]}
          onPress={handleManualSend}
          disabled={!recipient || !message || step === 'sending'}
          accessibilityLabel="Send email button"
        >
          <Ionicons name="send" size={20} color={Colors.textOnPrimary} />
          <Text style={styles.sendButtonText}>
            {step === 'sending' ? 'Sending...' : 'Send Email'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

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
          size={100}
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
    width: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  stepDot: {
    width: 40,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
  },
  stepDotCurrent: {
    backgroundColor: Colors.accent,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 20,
    paddingBottom: 40,
  },
  fieldsContainer: {
    gap: 12,
    marginTop: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 10,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textSecondary,
    width: 70,
  },
  fieldInput: {
    flex: 1,
    fontSize: 17,
    color: Colors.text,
    padding: 0,
  },
  messageContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  messageInput: {
    fontSize: 17,
    color: Colors.text,
    minHeight: 120,
    marginTop: 8,
    padding: 0,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    gap: 10,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textOnPrimary,
  },
  voiceArea: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
