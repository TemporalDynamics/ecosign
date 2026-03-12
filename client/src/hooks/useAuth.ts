/**
 * useAuth Hook - Manejo de autenticación con Supabase
 *
 * Uso:
 * const { user, loading, signIn, signUp, signOut } = useAuth();
 */

import { useState, useEffect } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabaseClient';
import { isGuestMode } from '../utils/guestMode';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: AuthError | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AuthError | null>(null);

  // Cargar usuario al montar
  useEffect(() => {
    const supabase = getSupabase();
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isGuestMode()) {
        setUser(null);
        setLoading(false);
        return;
      }
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (isGuestMode()) {
          setUser(null);
          setLoading(false);
          return;
        }
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Guest mode is explicitly controlled by the entry route (login CTA).
  // Do not auto-disable guest mode just because a prior session exists.

  /**
   * Sign In con email y password
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
    } catch (err) {
      setError(err as AuthError);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign Up con email y password
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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (err) {
      setError(err as AuthError);
      throw err;
    }
  };

  /**
   * Resetear password
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
    signIn,
    signUp,
    signOut,
    resetPassword
  };
};
