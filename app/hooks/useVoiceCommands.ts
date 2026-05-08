/**
 * Voice Commands Hook — Speech-to-Text Engine
 *
 * Uses expo-speech-recognition to capture voice input
 * and parse it into actionable commands.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

interface UseVoiceCommandsOptions {
  /** Called when speech is recognized (partial or final) */
  onResult?: (text: string, isFinal: boolean) => void;
  /** Called when an error occurs */
  onError?: (error: string) => void;
  /** Language for recognition */
  language?: string;
}

interface UseVoiceCommandsReturn {
  /** Start listening for voice input */
  startListening: () => Promise<void>;
  /** Stop listening */
  stopListening: () => Promise<void>;
  /** Whether the mic is currently active */
  isListening: boolean;
  /** The most recent transcription */
  transcript: string;
  /** Whether permissions have been granted */
  hasPermission: boolean;
  /** Request microphone/speech permissions */
  requestPermission: () => Promise<boolean>;
}

export function useVoiceCommands(
  options: UseVoiceCommandsOptions = {}
): UseVoiceCommandsReturn {
  const { onResult, onError, language = 'en-US' } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [hasPermission, setHasPermission] = useState(false);

  // Store callbacks in refs to avoid stale closures
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  onResultRef.current = onResult;
  onErrorRef.current = onError;

  // Check permissions on mount
  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    const status = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    setHasPermission(status.granted);
  };

  const requestPermission = async (): Promise<boolean> => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    setHasPermission(result.granted);
    return result.granted;
  };

  // ─── Speech Recognition Event Handlers ─────────────────
  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results?.[0]?.transcript || '';
    const isFinal = event.isFinal;
    setTranscript(text);
    onResultRef.current?.(text, isFinal);
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    const errorMsg = event.error || 'Speech recognition error';
    console.warn('Speech recognition error:', errorMsg);
    onErrorRef.current?.(errorMsg);
  });

  // ─── Control Methods ───────────────────────────────────
  const startListening = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        onErrorRef.current?.('Microphone permission denied');
        return;
      }
    }

    setTranscript('');

    ExpoSpeechRecognitionModule.start({
      lang: language,
      interimResults: true,
      maxAlternatives: 1,
    });
  }, [hasPermission, language]);

  const stopListening = useCallback(async () => {
    ExpoSpeechRecognitionModule.stop();
    setIsListening(false);
  }, []);

  return {
    startListening,
    stopListening,
    isListening,
    transcript,
    hasPermission,
    requestPermission,
  };
}
