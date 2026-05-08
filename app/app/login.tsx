/**
 * Login Screen
 *
 * Voice-guided authentication with:
 * - Email/password inputs (for sighted helpers)
 * - Voice-guided login flow
 * - Sign up option
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import { useTTS } from '../hooks/useTTS';
import { useVoiceCommands } from '../hooks/useVoiceCommands';
import { VoiceButton } from '../components/VoiceButton';
import { VoiceFeedback } from '../components/VoiceFeedback';
import { extractEmail } from '../services/commandParser';
import { Colors } from '../constants/colors';
import { VoicePrompts } from '../constants/voicePrompts';

type LoginStep = 'idle' | 'email' | 'confirm_email' | 'password' | 'processing';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signUp } = useAuthContext();
  const { speak, stop: stopSpeaking, isSpeaking } = useTTS();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [voiceStep, setVoiceStep] = useState<LoginStep>('idle');
  const [status, setStatus] = useState('Tap the mic or type to login');
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');

  // Voice commands handler
  const handleVoiceResult = useCallback(
    (text: string, isFinal: boolean) => {
      if (!isFinal) return;

      const lower = text.toLowerCase().trim();

      switch (voiceStep) {
        case 'idle': {
          // Start the voice login flow
          if (lower.includes('login') || lower.includes('log in') || lower.includes('sign in')) {
            setVoiceStep('email');
            speak(VoicePrompts.speakEmail);
            setStatus('Listening for email...');
          } else if (lower.includes('sign up') || lower.includes('register') || lower.includes('create account')) {
            setIsSignUp(true);
            setVoiceStep('email');
            speak('Creating a new account. ' + VoicePrompts.speakEmail);
            setStatus('Listening for email...');
          }
          break;
        }

        case 'email': {
          const parsedEmail = extractEmail(text);
          if (parsedEmail) {
            setEmail(parsedEmail);
            setVoiceStep('confirm_email');
            speak(VoicePrompts.confirmEmail(parsedEmail));
            setStatus(`Confirm: ${parsedEmail}`);
          } else {
            speak("I couldn't understand that email address. Please try again. Say your email address clearly.");
            setStatus('Please repeat your email');
          }
          break;
        }

        case 'confirm_email': {
          if (lower === 'yes' || lower === 'yeah' || lower === 'correct' || lower === 'confirm') {
            setVoiceStep('password');
            speak(VoicePrompts.speakPassword);
            setStatus('Listening for password...');
          } else if (lower === 'no' || lower === 'nope' || lower === 'wrong') {
            setEmail('');
            setVoiceStep('email');
            speak(VoicePrompts.speakEmail);
            setStatus('Listening for email...');
          }
          break;
        }

        case 'password': {
          if (text.trim().length > 0) {
            setPassword(text.trim());
            setVoiceStep('processing');
            handleSubmit(email, text.trim());
          }
          break;
        }
      }
    },
    [voiceStep, email]
  );

  const { startListening, stopListening, isListening, transcript } = useVoiceCommands({
    onResult: handleVoiceResult,
    onError: (error) => {
      setStatus('Voice error. Please try again.');
      speak(VoicePrompts.pleaseRepeat);
    },
  });

  // Handle form submission (both voice and manual)
  const handleSubmit = async (emailValue?: string, passwordValue?: string) => {
    const e = emailValue || email;
    const p = passwordValue || password;

    if (!e || !p) {
      speak('Please enter both email and password.');
      setStatus('Enter email and password');
      return;
    }

    setVoiceState('processing');
    setStatus('Authenticating...');

    try {
      const result = isSignUp
        ? await signUp(e, p)
        : await signIn(e, p);

      if (result.error) {
        console.log('Auth error:', result.error);
        const errorMsg = result.error;
        speak(`Authentication failed. ${errorMsg}`);
        setStatus(`Error: ${errorMsg}`);
        Alert.alert(
          isSignUp ? 'Sign Up Failed' : 'Sign In Failed',
          errorMsg,
          [{ text: 'OK' }]
        );
        setVoiceStep('idle');
        setVoiceState('idle');
      } else {
        speak(isSignUp ? VoicePrompts.signupSuccess : VoicePrompts.loginSuccess);
        setStatus('Success!');
        setVoiceState('idle');
        setTimeout(() => router.replace('/(tabs)/home'), 1500);
      }
    } catch (err: any) {
      console.log('Auth catch error:', err);
      const errorMsg = err?.message || 'Unknown error';
      speak(`Network error. ${errorMsg}`);
      setStatus(`Error: ${errorMsg}`);
      Alert.alert('Error', errorMsg, [{ text: 'OK' }]);
      setVoiceStep('idle');
      setVoiceState('idle');
    }
  };

  const toggleListening = () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    if (isListening) {
      stopListening();
    } else {
      if (voiceStep === 'idle') {
        speak('Say login to sign in, or sign up to create an account.', () => {
          startListening();
        });
      } else {
        startListening();
      }
    }
  };

  const currentVoiceState = isListening ? 'listening' : isSpeaking ? 'speaking' : voiceState;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="mail" size={48} color={Colors.primary} />
          <Text style={styles.title}>VoiceMail Assist</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? 'Create Account' : 'Sign In'}
          </Text>
        </View>

        {/* Voice feedback */}
        <VoiceFeedback
          status={status}
          transcript={transcript}
          state={currentVoiceState}
        />

        {/* Email input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={Colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Email address input"
          />
        </View>

        {/* Password input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry={!showPassword}
              accessibilityLabel="Password input"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={24}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => handleSubmit()}
          activeOpacity={0.8}
          accessibilityLabel={isSignUp ? 'Create account button' : 'Sign in button'}
          accessibilityRole="button"
        >
          <Text style={styles.submitButtonText}>
            {isSignUp ? 'Create Account' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        {/* Toggle sign up / sign in */}
        <TouchableOpacity
          onPress={() => setIsSignUp(!isSignUp)}
          style={styles.toggleButton}
          accessibilityLabel={
            isSignUp
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"
          }
        >
          <Text style={styles.toggleText}>
            {isSignUp
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>

        {/* Voice button */}
        <View style={styles.voiceSection}>
          <Text style={styles.voiceHint}>Or use voice commands</Text>
          <VoiceButton
            isListening={isListening}
            isSpeaking={isSpeaking}
            onPress={toggleListening}
            label={isListening ? 'Listening...' : 'Tap to speak'}
            size={100}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 18,
    color: Colors.text,
    minHeight: 60,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  eyeButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderLeftWidth: 0,
    borderColor: Colors.border,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 20,
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 12,
    minHeight: 60,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textOnPrimary,
  },
  toggleButton: {
    padding: 16,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
  voiceSection: {
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  voiceHint: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 20,
  },
});
