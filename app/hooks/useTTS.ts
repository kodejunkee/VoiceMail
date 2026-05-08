/**
 * TTS Hook — Text-to-Speech Wrapper
 *
 * Provides a simple interface for speaking text aloud.
 * Manages a queue to prevent overlapping speech.
 *
 * Automatically suppresses speech recognition while TTS is playing
 * to prevent the microphone from picking up the speaker output
 * (echo feedback loop prevention).
 */

import { useCallback, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import { useOptionalHandsFreeContext } from '../context/HandsFreeContext';

interface UseTTSReturn {
  /** Speak text aloud. Optionally call onDone when finished. */
  speak: (text: string, onDone?: () => void) => void;
  /** Stop any current speech */
  stop: () => void;
  /** Whether TTS is currently speaking */
  isSpeaking: boolean;
}

export function useTTS(): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const queueRef = useRef<Array<{ text: string; onDone?: () => void }>>([]);
  const isProcessingRef = useRef(false);

  // Get TTS suppression from global context (undefined on login screen)
  const handsFree = useOptionalHandsFreeContext();
  const pauseRef = useRef(handsFree?.pauseForTTS);
  const resumeRef = useRef(handsFree?.resumeAfterTTS);
  pauseRef.current = handsFree?.pauseForTTS;
  resumeRef.current = handsFree?.resumeAfterTTS;

  // Process the next item in the speech queue
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || queueRef.current.length === 0) return;

    isProcessingRef.current = true;
    const { text, onDone } = queueRef.current.shift()!;

    setIsSpeaking(true);
    pauseRef.current?.(); // Suppress recognition while speaking

    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.9, // Slightly slower for accessibility
      onDone: () => {
        setIsSpeaking(false);
        isProcessingRef.current = false;
        resumeRef.current?.(); // Resume recognition
        onDone?.();
        // Process next in queue
        processQueue();
      },
      onStopped: () => {
        setIsSpeaking(false);
        isProcessingRef.current = false;
        resumeRef.current?.(); // Resume recognition
      },
      onError: () => {
        setIsSpeaking(false);
        isProcessingRef.current = false;
        resumeRef.current?.(); // Resume recognition
        // Try next in queue even on error
        processQueue();
      },
    });
  }, []);

  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      // Stop any current speech before starting new
      Speech.stop();
      // Clear existing queue and add new item
      queueRef.current = [{ text, onDone }];
      isProcessingRef.current = false;
      processQueue();
    },
    [processQueue]
  );

  const stop = useCallback(() => {
    Speech.stop();
    queueRef.current = [];
    isProcessingRef.current = false;
    setIsSpeaking(false);
    resumeRef.current?.(); // Resume recognition if we manually stop TTS
  }, []);

  return { speak, stop, isSpeaking };
}
