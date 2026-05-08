/**
 * useScreenVoice Hook
 *
 * Simple hook for screens to plug into the global hands-free system.
 * Automatically registers the screen's command handler when focused
 * and unregisters when blurred/unmounted.
 *
 * Usage:
 *   const { mode, isListening, transcript, activate, deactivate } = useScreenVoice({
 *     onResult: (text, isFinal) => { ... },
 *     onError: (error) => { ... },
 *   });
 */

import { useRef, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  useHandsFreeContext,
  HandsFreeMode,
} from '../context/HandsFreeContext';

interface UseScreenVoiceOptions {
  /** Called when speech is recognized in active mode */
  onResult: (text: string, isFinal: boolean) => void;
  /** Called when an error occurs */
  onError?: (error: string) => void;
  /** Called when mode changes (standby ↔ active) */
  onModeChange?: (mode: HandsFreeMode) => void;
  /** Called when user says "Hey VoiceMail" while already active */
  onAlreadyActive?: () => void;
}

export function useScreenVoice(options: UseScreenVoiceOptions) {
  const { onResult, onError, onModeChange, onAlreadyActive } = options;
  const ctx = useHandsFreeContext();

  // Keep callbacks in refs to avoid stale closures
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const onModeChangeRef = useRef(onModeChange);
  const onAlreadyActiveRef = useRef(onAlreadyActive);

  onResultRef.current = onResult;
  onErrorRef.current = onError;
  onModeChangeRef.current = onModeChange;
  onAlreadyActiveRef.current = onAlreadyActive;

  // Register this screen's handlers when focused, unregister on blur
  useFocusEffect(
    useCallback(() => {
      // Screen gained focus — register handlers
      ctx.registerScreen({
        onResult: (text, isFinal) => onResultRef.current(text, isFinal),
        onModeChange: (mode) => onModeChangeRef.current?.(mode),
        onError: (error) => onErrorRef.current?.(error),
        onAlreadyActive: () => onAlreadyActiveRef.current?.(),
      });

      // Start hands-free if not already running
      if (ctx.mode === 'disabled') {
        ctx.enableHandsFree();
      }

      // Cleanup: unregister on blur
      return () => {
        ctx.unregisterScreen();
      };
    }, [])
  );

  return {
    mode: ctx.mode,
    isListening: ctx.isListening,
    transcript: ctx.transcript,
    hasPermission: ctx.hasPermission,
    activate: ctx.activate,
    deactivate: ctx.deactivate,
    enableHandsFree: ctx.enableHandsFree,
    disableHandsFree: ctx.disableHandsFree,
  };
}
