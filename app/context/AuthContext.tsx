/**
 * Auth Context
 *
 * Provides authentication state globally throughout the app.
 * Wraps the useAuth hook in a React context.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useAuth } from '../hooks/useAuth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth state from any component.
 * Must be used within an AuthProvider.
 */
export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
