/**
 * useAuthWithE2E Hook
 * 
 * Enhanced auth hook that integrates E2E encryption session management.
 * Automatically initializes session crypto on login and clears on logout.
 */

import { useState, useEffect, useCallback } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { getSupabase } from '../lib/supabaseClient';
import {
  initializeSessionCrypto,
  clearSessionCrypto,
  isSessionInitialized,
  ensureUserWrapSalt,
} from '../lib/e2e';

interface UseAuthWithE2EReturn {
  user: User | null;
  loading: boolean;
  error: AuthError | null;
  e2eReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOtp: (email: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export const useAuthWithE2E = (): UseAuthWithE2EReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [e2eReady, setE2eReady] = useState<boolean>(false);

  /**
   * Initialize E2E session crypto for a user
   */
  const initE2ESession = useCallback(async (userId: string) => {
    try {
      console.log('🔐 Initializing E2E session for user:', userId);
      
      // Ensure user has wrap_salt
      await ensureUserWrapSalt(userId);
      
      // Initialize session crypto
      await initializeSessionCrypto(userId);
      
      setE2eReady(true);
      console.log('✅ E2E session initialized');
    } catch (err) {
      console.error('❌ Failed to initialize E2E session:', err);
      setE2eReady(false);
      
      // Show user-friendly error message
      const errorMessage = err instanceof Error ? err.message : 'Error al inicializar el cifrado';
      toast.error(errorMessage, {
        duration: 6000,
        position: 'top-center',
      });
    }
  }, []);

  /**
   * Clear E2E session
   */
  const clearE2ESession = useCallback(() => {
    console.log('🧹 Clearing E2E session');
    clearSessionCrypto();
    setE2eReady(false);
  }, []);

  // Load user on mount and handle auth state changes
  useEffect(() => {
    const supabase = getSupabase();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);

      // Initialize E2E if user is logged in
      if (currentUser) {
        initE2ESession(currentUser.id);
      }
    });

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setLoading(false);

        console.log('🔄 Auth state change:', event);

        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
          case 'USER_UPDATED':
            if (currentUser && !isSessionInitialized()) {
              await initE2ESession(currentUser.id);
            }
            break;

          case 'SIGNED_OUT':
            clearE2ESession();
            break;

          default:
            break;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      // Don't clear E2E session here - let SIGNED_OUT event handle it
    };
  }, [initE2ESession, clearE2ESession]);

  /**
   * Sign In with email and password
   */
  const signIn = async (email: string, password: string): Promise<void> => {
    const supabase = getSupabase();
    try {
      setError(null);
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      
      setUser(data.user);
      
      // E2E session will be initialized by onAuthStateChange
    } catch (err) {
      setError(err as AuthError);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign In with OTP (magic link)
   */
  const signInWithOtp = async (email: string): Promise<void> => {
    const supabase = getSupabase();
    try {
      setError(null);
      setLoading(true);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/inicio`
        }
      });

      if (error) throw error;
      
      // E2E session will be initialized when user clicks magic link
    } catch (err) {
      setError(err as AuthError);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign Up with email and password
   */
  const signUp = async (email: string, password: string): Promise<void> => {
    const supabase = getSupabase();
    try {
      setError(null);
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/inicio`
        }
      });

      if (error) throw error;
      
      setUser(data.user);
      
      // Create wrap_salt for new user and initialize E2E
      if (data.user) {
        await initE2ESession(data.user.id);
      }
    } catch (err) {
      setError(err as AuthError);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign Out
   */
  const signOut = async (): Promise<void> => {
    const supabase = getSupabase();
    try {
      setError(null);
      
      // Clear E2E session first
      clearE2ESession();
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
    } catch (err) {
      setError(err as AuthError);
      throw err;
    }
  };

  /**
   * Reset password
   */
  const resetPassword = async (email: string): Promise<void> => {
    const supabase = getSupabase();
    try {
      setError(null);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;
    } catch (err) {
      setError(err as AuthError);
      throw err;
    }
  };

  return {
    user,
    loading,
    error,
    e2eReady,
    signIn,
    signInWithOtp,
    signUp,
    signOut,
    resetPassword
  };
};
