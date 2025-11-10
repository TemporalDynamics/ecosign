/**
 * Supabase Client para Frontend
 *
 * IMPORTANTE: Solo usar ANON_KEY aquí (pública)
 * NUNCA usar SERVICE_ROLE_KEY en el frontend
 */

import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env'
  );
}

/**
 * Cliente singleton de Supabase
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

/**
 * Types de Supabase Database
 * (Auto-generados con: supabase gen types typescript)
 */
export type Database = {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          original_filename: string | null;
          eco_hash: string;
          ecox_hash: string | null;
          status: 'active' | 'revoked' | 'archived';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          original_filename?: string | null;
          eco_hash: string;
          ecox_hash?: string | null;
          status?: 'active' | 'revoked' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          original_filename?: string | null;
          eco_hash?: string;
          ecox_hash?: string | null;
          status?: 'active' | 'revoked' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
      };
      links: {
        Row: {
          id: string;
          document_id: string;
          token_hash: string;
          expires_at: string | null;
          revoked_at: string | null;
          require_nda: boolean;
          created_at: string;
        };
      };
      recipients: {
        Row: {
          id: string;
          document_id: string;
          email: string;
          recipient_id: string;
          created_at: string;
        };
      };
      access_events: {
        Row: {
          id: string;
          recipient_id: string;
          event_type: 'view' | 'download' | 'forward';
          timestamp: string;
          ip_address: string | null;
          user_agent: string | null;
          country: string | null;
          session_id: string | null;
        };
      };
    };
  };
};

/**
 * Helper: Obtener usuario actual
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

/**
 * Helper: Obtener sesión actual
 */
export const getCurrentSession = async (): Promise<Session | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

/**
 * Helper: Verificar si hay sesión activa
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const session = await getCurrentSession();
  return session !== null;
};

/**
 * Helper: Sign out
 */
export const signOut = async (): Promise<void> => {
  await supabase.auth.signOut();
};
