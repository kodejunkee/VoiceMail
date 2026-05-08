/**
 * Hands-Free Voice Hook
 *
 * Provides always-listening wake word detection for fully hands-free operation.
 *
 * Flow:
 *   STANDBY → detects "Hey VoiceMail" → ACTIVE → processes commands
 *   ACTIVE  → detects "Go to sleep"   → STANDBY → quietly listening
 *
 * The speech recognizer runs continuously. In standby mode, only the wake
 * phrase is checked. In active mode, all speech is forwarded to the
 * screen's command handler.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

// ─── Constants ──────────────────────────────────────────
const WAKE_PHRASE = 'hey voicemail';
const SLEEP_PHRASES = ['go to sleep', 'goodnight', 'stop listening'];
const RESTART_DELAY_MS = 300;

export type HandsFreeMode = 'standby' | 'active' | 'disabled';

interface UseHandsFreeOptions {
  /** Called when speech is recognized while in active mode */
  onResult?: (text: string, isFinal: boolean) => void;
  /** Called when an error occurs */
  onError?: (error: string) => void;
  /** Called when the mode changes (standby ↔ active) */
  onModeChange?: (mode: HandsFreeMode) => void;
  /** Language for recognition */
  language?: string;
  /** Whether to start in hands-free mode automatically (default: true) */
  autoStart?: boolean;
}

interface UseHandsFreeReturn {
  /** Current mode: standby (waiting for wake word), active (processing commands), disabled */
  mode: HandsFreeMode;
  /** Most recent transcript */
  transcript: string;
  /** Whether the mic is currently active */
  isListening: boolean;
  /** Whether permissions have been granted */
  hasPermission: boolean;
  /** Enable hands-free mode (starts in standby) */
  enableHandsFree: () => Promise<void>;
  /** Disable hands-free mode entirely (stops mic) */
  disableHandsFree: () => void;
  /** Manually activate (skip wake word) */
  activate: () => void;
  /** Manually deactivate (go to standby) */
  deactivate: () => void;
  /** Request microphone permissions */
  requestPermission: () => Promise<boolean>;
}

export function useHandsFree(
  options: UseHandsFreeOptions = {}
): UseHandsFreeReturn {
  const {
    onResult,
    onError,
    onModeChange,
    language = 'en-US',
    autoStart = true,
  } = options;

  const [mode, setMode] = useState<HandsFreeMode>('disabled');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [hasPermission, setHasPermission] = useState(false);

  // Refs to avoid stale closures
  const modeRef = useRef(mode);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const onModeChangeRef = useRef(onModeChange);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEnabledRef = useRef(false);

  // Keep refs in sync
  modeRef.current = mode;
  onResultRef.current = onResult;
  onErrorRef.current = onError;
  onModeChangeRef.current = onModeChange;

  // ─── Permission ───────────────────────────────────────
  const checkPermission = async () => {
    const status = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    setHasPermission(status.granted);
    return status.granted;
  };

  const requestPermission = async (): Promise<boolean> => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    setHasPermission(result.granted);
    return result.granted;
  };

  useEffect(() => {
    checkPermission();
  }, []);

  // ─── Start continuous recognition ────────────────────
  const startRecognition = useCallback(() => {
    if (!isEnabledRef.current) return;

    try {
      ExpoSpeechRecognitionModule.start({
        lang: language,
        interimResults: true,
        maxAlternatives: 1,
        continuous: true, // Keep listening until explicitly stopped
      });
    } catch (err) {
      console.warn('Failed to start recognition:', err);
      // Retry after delay
      scheduleRestart();
    }
  }, [language]);

  const scheduleRestart = useCallback(() => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(() => {
      if (isEnabledRef.current) {
        startRecognition();
      }
    }, RESTART_DELAY_MS);
  }, [startRecognition]);

  // ─── Mode transitions ────────────────────────────────
  const changeMode = useCallback((newMode: HandsFreeMode) => {
    setMode(newMode);
    modeRef.current = newMode;
    onModeChangeRef.current?.(newMode);
  }, []);

  // ─── Wake/Sleep phrase detection ─────────────────────
  const containsWakePhrase = (text: string): boolean => {
    const lower = text.toLowerCase().trim();
    return lower.includes(WAKE_PHRASE);
  };

  const containsSleepPhrase = (text: string): boolean => {
    const lower = text.toLowerCase().trim();
    return SLEEP_PHRASES.some((phrase) => lower.includes(phrase));
  };

  // ─── Speech Event Handlers ───────────────────────────
  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    // Auto-restart if hands-free is enabled
    if (isEnabledRef.current) {
      scheduleRestart();
    }
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results?.[0]?.transcript || '';
    const isFinal = event.isFinal;

    if (modeRef.current === 'standby') {
      // Only check for wake phrase
      if (containsWakePhrase(text) && isFinal) {
        setTranscript('');
        changeMode('active');
      }
      // Don't update transcript in standby (keep UI clean)
      return;
    }

    if (modeRef.current === 'active') {
      setTranscript(text);

      // Check for sleep phrase
      if (containsSleepPhrase(text) && isFinal) {
        setTranscript('');
        changeMode('standby');
        return;
      }

      // Forward to screen handler
      onResultRef.current?.(text, isFinal);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    const errorMsg = event.error || 'Speech recognition error';

    // Don't surface "no-speech" errors in standby (expected)
    if (modeRef.current !== 'standby') {
      console.warn('Speech recognition error:', errorMsg);
      onErrorRef.current?.(errorMsg);
    }

    // Auto-restart on error if enabled
    if (isEnabledRef.current) {
      scheduleRestart();
    }
  });

  // ─── Public API ──────────────────────────────────────
  const enableHandsFree = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        onErrorRef.current?.('Microphone permission denied');
        return;
      }
    }

    isEnabledRef.current = true;
    changeMode('standby');
    startRecognition();
  }, [hasPermission, startRecognition, changeMode]);

  const disableHandsFree = useCallback(() => {
    isEnabledRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    ExpoSpeechRecognitionModule.stop();
    setIsListening(false);
    changeMode('disabled');
  }, [changeMode]);

  const activate = useCallback(() => {
    changeMode('active');
    setTranscript('');
  }, [changeMode]);

  const deactivate = useCallback(() => {
    changeMode('standby');
    setTranscript('');
  }, [changeMode]);

  // Auto-start on mount if requested
  useEffect(() => {
    if (autoStart) {
      const timer = setTimeout(() => {
        enableHandsFree();
      }, 1000); // Small delay to let the screen render first
      return () => clearTimeout(timer);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isEnabledRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {}
    };
  }, []);

  return {
    mode,
    transcript,
    isListening,
    hasPermission,
    enableHandsFree,
    disableHandsFree,
    activate,
    deactivate,
    requestPermission,
  };
}
