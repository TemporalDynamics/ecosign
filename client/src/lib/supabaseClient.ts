/**
 * Supabase Client para Frontend
 *
 * IMPORTANTE: Solo usar ANON_KEY aquí (pública)
 * NUNCA usar SERVICE_ROLE_KEY en el frontend
 */

import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { validateEnvironment } from './envValidation';

// Validar environment variables al cargar el módulo
const env = validateEnvironment();

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

/**
 * Obtiene la instancia singleton del cliente de Supabase, creándola si no existe.
 * Esto permite la inicialización perezosa (lazy initialization).
 */
export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
  }
  return supabaseInstance;
};


/**
 * Types de Supabase Database
 * (Auto-generados con: supabase gen types typescript)
 */
export type Database = {
  public: {
    Tables: {
      /**
       * @deprecated Legacy table (pre-canonical).
       */
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
      /**
       * Canonical document entity (v2).
       */
      document_entities: {
        Row: {
          id: string;
          owner_id: string;
          source_name: string;
          source_mime: string;
          source_size: number;
          source_hash: string;
          source_captured_at: string;
          source_storage_path: string | null;
          custody_mode: 'hash_only' | 'encrypted_custody';
          lifecycle_status:
            | 'protected'
            | 'needs_witness'
            | 'witness_ready'
            | 'in_signature_flow'
            | 'signed'
            | 'anchored'
            | 'revoked'
            | 'archived';
          witness_current_hash: string | null;
          witness_current_mime: 'application/pdf' | null;
          witness_current_status: 'generated' | 'signed' | null;
          witness_current_storage_path: string | null;
          witness_current_generated_at: string | null;
          witness_history: unknown;
          witness_hash: string | null;
          signed_hash: string | null;
          composite_hash: string | null;
          hash_chain: unknown;
          transform_log: unknown;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          source_name: string;
          source_mime: string;
          source_size: number;
          source_hash: string;
          source_captured_at?: string;
          source_storage_path?: string | null;
          custody_mode: 'hash_only' | 'encrypted_custody';
          lifecycle_status?:
            | 'protected'
            | 'needs_witness'
            | 'witness_ready'
            | 'in_signature_flow'
            | 'signed'
            | 'anchored'
            | 'revoked'
            | 'archived';
          witness_current_hash?: string | null;
          witness_current_mime?: 'application/pdf' | null;
          witness_current_status?: 'generated' | 'signed' | null;
          witness_current_storage_path?: string | null;
          witness_current_generated_at?: string | null;
          witness_history?: unknown;
          witness_hash?: string | null;
          signed_hash?: string | null;
          composite_hash?: string | null;
          hash_chain?: unknown;
          transform_log?: unknown;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          source_name?: string;
          source_mime?: string;
          source_size?: number;
          source_hash?: string;
          source_captured_at?: string;
          source_storage_path?: string | null;
          custody_mode?: 'hash_only' | 'encrypted_custody';
          lifecycle_status?:
            | 'protected'
            | 'needs_witness'
            | 'witness_ready'
            | 'in_signature_flow'
            | 'signed'
            | 'anchored'
            | 'revoked'
            | 'archived';
          witness_current_hash?: string | null;
          witness_current_mime?: 'application/pdf' | null;
          witness_current_status?: 'generated' | 'signed' | null;
          witness_current_storage_path?: string | null;
          witness_current_generated_at?: string | null;
          witness_history?: unknown;
          witness_hash?: string | null;
          signed_hash?: string | null;
          composite_hash?: string | null;
          hash_chain?: unknown;
          transform_log?: unknown;
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
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

/**
 * Helper: Obtener sesión actual
 */
export const getCurrentSession = async (): Promise<Session | null> => {
  const supabase = getSupabase();
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
  const supabase = getSupabase();
  await supabase.auth.signOut();
};
