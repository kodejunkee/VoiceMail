/**
 * Auth Hook
 *
 * Manages Supabase authentication state.
 * Provides login, signup, logout, and session tracking.
 */

import { useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface UseAuthReturn {
  /** Current user object */
  user: User | null;
  /** Current session (includes access token) */
  session: Session | null;
  /** Whether auth state is still loading */
  isLoading: boolean;
  /** Sign in with email and password */
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  /** Create a new account */
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  /** Sign out */
  signOut: () => Promise<void>;
  /** Get the current access token for API calls */
  getToken: () => string | null;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) return { error: error.message };
      return {};
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) return { error: error.message };
      return {};
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const getToken = useCallback(() => {
    return session?.access_token ?? null;
  }, [session]);

  return {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    getToken,
  };
}
