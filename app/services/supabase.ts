/**
 * Supabase Client
 *
 * Initializes Supabase for React Native with secure storage
 * for persisting auth sessions across app restarts.
 */

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Config } from '../constants/config';

// Custom storage adapter using expo-secure-store
// This keeps auth tokens encrypted on the device
const secureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('SecureStore setItem error:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('SecureStore removeItem error:', error);
    }
  },
};

export const supabase = createClient(
  Config.SUPABASE_URL,
  Config.SUPABASE_ANON_KEY,
  {
    auth: {
      storage: secureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Not needed in React Native
    },
  }
);
