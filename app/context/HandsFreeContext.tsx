/**
 * Hands-Free Context
 *
 * Global provider that owns the single speech recognizer instance.
 * Screens register/unregister their command handlers when they
 * gain/lose focus. Only the focused screen receives commands.
 *
 * This prevents multiple hooks from fighting over the mic.
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

// ─── Constants ──────────────────────────────────────────
const WAKE_PHRASE = 'hey voicemail';
const SLEEP_PHRASES = ['go to sleep', 'goodnight', 'stop listening'];
const RESTART_DELAY_MS = 300;

export type HandsFreeMode = 'standby' | 'active' | 'disabled';

type ResultHandler = (text: string, isFinal: boolean) => void;
type ModeChangeHandler = (mode: HandsFreeMode) => void;
type ErrorHandler = (error: string) => void;

interface HandsFreeContextType {
  /** Current mode: standby | active | disabled */
  mode: HandsFreeMode;
  /** Most recent transcript (only in active mode) */
  transcript: string;
  /** Whether the mic is currently on */
  isListening: boolean;
  /** Whether permission is granted */
  hasPermission: boolean;
  /** Enable hands-free (starts in standby) */
  enableHandsFree: () => Promise<void>;
  /** Disable hands-free entirely */
  disableHandsFree: () => void;
  /** Manually activate (skip wake word) — for button press */
  activate: () => void;
  /** Manually deactivate (go to standby) — for button press */
  deactivate: () => void;
  /** Register the active screen's handlers */
  registerScreen: (handlers: ScreenHandlers) => void;
  /** Unregister when screen loses focus */
  unregisterScreen: () => void;
  /** Suppress recognition while TTS speaks (prevents echo loop) */
  pauseForTTS: () => void;
  /** Resume recognition after TTS finishes */
  resumeAfterTTS: () => void;
}

interface ScreenHandlers {
  onResult: ResultHandler;
  onModeChange?: ModeChangeHandler;
  onError?: ErrorHandler;
  /** Called when user says wake phrase while already active */
  onAlreadyActive?: () => void;
}

const HandsFreeContext = createContext<HandsFreeContextType | undefined>(
  undefined
);

// ─── Provider ──────────────────────────────────────────

export function HandsFreeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<HandsFreeMode>('disabled');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [hasPermission, setHasPermission] = useState(false);

  // Refs for the singleton state
  const modeRef = useRef<HandsFreeMode>('disabled');
  const isEnabledRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef<ScreenHandlers | null>(null);
  const isSuppressedRef = useRef(false); // TTS echo suppression

  // Keep mode ref in sync
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // ─── Permission ───────────────────────────────────────
  useEffect(() => {
    ExpoSpeechRecognitionModule.getPermissionsAsync().then((status) => {
      setHasPermission(status.granted);
    });
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    setHasPermission(result.granted);
    return result.granted;
  };

  // ─── Recognition control ─────────────────────────────
  const startRecognition = useCallback(() => {
    if (!isEnabledRef.current) return;
    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        maxAlternatives: 1,
        continuous: true,
      });
    } catch (err) {
      console.warn('Failed to start recognition:', err);
      scheduleRestart();
    }
  }, []);

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
    handlersRef.current?.onModeChange?.(newMode);
  }, []);

  // ─── Wake/Sleep detection ─────────────────────────────
  const containsWakePhrase = (text: string): boolean =>
    text.toLowerCase().trim().includes(WAKE_PHRASE);

  const containsSleepPhrase = (text: string): boolean =>
    SLEEP_PHRASES.some((p) => text.toLowerCase().trim().includes(p));

  // ─── Speech Events (singleton handlers) ───────────────
  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    // Don't auto-restart if TTS is speaking (suppressed)
    if (isEnabledRef.current && !isSuppressedRef.current) {
      scheduleRestart();
    }
  });

  useSpeechRecognitionEvent('result', (event) => {
    // Drop results while TTS is speaking (prevents echo loop)
    if (isSuppressedRef.current) return;

    const text = event.results?.[0]?.transcript || '';
    const isFinal = event.isFinal;

    if (modeRef.current === 'standby') {
      if (containsWakePhrase(text) && isFinal) {
        setTranscript('');
        changeMode('active');
      }
      return;
    }

    if (modeRef.current === 'active') {
      setTranscript(text);

      if (containsSleepPhrase(text) && isFinal) {
        setTranscript('');
        changeMode('standby');
        return;
      }

      // Swallow wake phrase — user said it while already active
      if (containsWakePhrase(text) && isFinal) {
        setTranscript('');
        handlersRef.current?.onAlreadyActive?.();
        return;
      }

      // Forward to the currently registered screen
      handlersRef.current?.onResult(text, isFinal);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    const errorMsg = event.error || 'Speech recognition error';

    if (modeRef.current !== 'standby') {
      console.warn('Speech recognition error:', errorMsg);
      handlersRef.current?.onError?.(errorMsg);
    }

    if (isEnabledRef.current && !isSuppressedRef.current) {
      scheduleRestart();
    }
  });

  // ─── Public API ──────────────────────────────────────
  const enableHandsFree = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        handlersRef.current?.onError?.('Microphone permission denied');
        return;
      }
    }
    isEnabledRef.current = true;
    // Set standby silently (don't fire onModeChange — this is initialization)
    setMode('standby');
    modeRef.current = 'standby';
    startRecognition();
  }, [hasPermission, startRecognition]);

  const disableHandsFree = useCallback(() => {
    isEnabledRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {}
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

  const registerScreen = useCallback((handlers: ScreenHandlers) => {
    handlersRef.current = handlers;
  }, []);

  const unregisterScreen = useCallback(() => {
    handlersRef.current = null;
  }, []);

  // TTS echo suppression — hard stop/restart the recognizer
  const pauseForTTS = useCallback(() => {
    isSuppressedRef.current = true;
    // Kill any pending restart
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    // Physically stop the mic so it can't capture TTS audio
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {}
  }, []);

  const resumeAfterTTS = useCallback(() => {
    isSuppressedRef.current = false;
    // Restart the recognizer after a short delay (let TTS audio fully fade)
    if (isEnabledRef.current) {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        if (isEnabledRef.current && !isSuppressedRef.current) {
          startRecognition();
        }
      }, 500); // 500ms buffer for audio to fully stop
    }
  }, [startRecognition]);

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

  return (
    <HandsFreeContext.Provider
      value={{
        mode,
        transcript,
        isListening,
        hasPermission,
        enableHandsFree,
        disableHandsFree,
        activate,
        deactivate,
        registerScreen,
        unregisterScreen,
        pauseForTTS,
        resumeAfterTTS,
      }}
    >
      {children}
    </HandsFreeContext.Provider>
  );
}

// ─── Consumer hooks ─────────────────────────────────────

export function useHandsFreeContext(): HandsFreeContextType {
  const ctx = useContext(HandsFreeContext);
  if (!ctx) {
    throw new Error(
      'useHandsFreeContext must be used within a HandsFreeProvider'
    );
  }
  return ctx;
}

/** Safe version — returns undefined if outside HandsFreeProvider (e.g. login screen) */
export function useOptionalHandsFreeContext(): HandsFreeContextType | undefined {
  return useContext(HandsFreeContext);
}
