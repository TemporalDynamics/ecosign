import { createClient } from '@supabase/supabase-js';

// HARDCODEADO TEMPORAL
const supabaseUrl = 'https://tbxowirrvgtvfnxcdqks.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRieG93aXJydmd0dmZueGNkcWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyOTQyMjgsImV4cCI6MjA3Nzg3MDIyOH0.GgVYH10zh--64FyGlNGYaZcbVXow3Bj9iZS3Zq9HWXQ';

console.log('🔍🔍🔍 SUPABASE CLIENT LOADING 🔍🔍🔍');
console.log('URL:', supabaseUrl, '| Type:', typeof supabaseUrl);
console.log('Key:', supabaseAnonKey.substring(0, 20) + '...', '| Type:', typeof supabaseAnonKey);
console.log('createClient function:', typeof createClient);

let supabaseInstance;
try {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
  console.log('✅ Supabase client created successfully!');
  console.log('Client type:', typeof supabaseInstance);
  console.log('Has auth?', !!supabaseInstance.auth);
} catch (error) {
  console.error('❌ ERROR creating Supabase client:', error);
  throw error;
}

export const supabase = supabaseInstance;

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getCurrentSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const isAuthenticated = async () => {
  const session = await getCurrentSession();
  return session !== null;
};

export const signOut = async () => {
  await supabase.auth.signOut();
};
