import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase con Service Role Key (solo para backend)
 * NUNCA exponer esta clave en el frontend
 */
export const getSupabaseClient = (): SupabaseClient => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase credentials. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

/**
 * Cliente de Supabase con contexto de usuario autenticado
 * Usa el JWT del usuario para operaciones con RLS
 */
export const getSupabaseClientWithUser = (userJwt: string): SupabaseClient => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase credentials');
  }

  const client = createClient(supabaseUrl, supabaseAnonKey);

  // Set user context
  client.auth.setSession({
    access_token: userJwt,
    refresh_token: ''
  });

  return client;
};
