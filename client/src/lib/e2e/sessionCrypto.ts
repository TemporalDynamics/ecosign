/**
 * Session Cryptography
 * 
 * Manages session-scoped encryption keys for Zero Server-Side Knowledge.
 * 
 * KEY PRINCIPLE:
 * - Session secret is generated CLIENT-SIDE at login
 * - NEVER sent to server
 * - Used to derive unwrap keys for document keys
 * - Lost when browser closes (by design)
 */

import { CRYPTO_CONFIG, CRYPTO_ERRORS } from './constants';
import { randomBytes, zeroMemory, hexToBytes } from './cryptoUtils';
import { getSupabase } from '../supabaseClient';

interface SessionCrypto {
  sessionSecret: Uint8Array;
  unwrapKey: CryptoKey;
  userId: string;
  initializedAt: Date;
}

// Singleton for current session
let _currentSession: SessionCrypto | null = null;

/**
 * Initialize session crypto after successful login
 * 
 * This MUST be called after auth success.
 * Generates a client-side session secret and derives the unwrap key.
 * 
 * @param userId - User ID from Supabase Auth
 */
export async function initializeSessionCrypto(userId: string): Promise<void> {
  // 1. Generate session secret (client-side only)
  const sessionSecret = randomBytes(CRYPTO_CONFIG.SESSION_SECRET.length);
  
  // 2. Get user's wrap salt from DB (public, not secret)
  const supabase = getSupabase();
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('wrap_salt')
    .eq('user_id', userId)
    .single();
  
  if (error || !profile?.wrap_salt) {
    throw new Error('Failed to get user wrap salt');
  }
  
  const salt = hexToBytes(profile.wrap_salt);
  
  // 3. Derive unwrap key from session secret + salt
  const unwrapKey = await deriveUnwrapKey(sessionSecret, salt);
  
  // 4. Store in memory (volatile)
  _currentSession = {
    sessionSecret,
    unwrapKey,
    userId,
    initializedAt: new Date(),
  };
  
  console.log('✅ Session crypto initialized for user:', userId);
  
  // 5. Auto-clear on tab close
  window.addEventListener('beforeunload', () => {
    clearSessionCrypto();
  });
}

/**
 * Derive unwrap key from session secret and salt
 */
async function deriveUnwrapKey(
  sessionSecret: Uint8Array,
  salt: Uint8Array
): Promise<CryptoKey> {
  // Import session secret as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    sessionSecret,
    CRYPTO_CONFIG.SESSION_KEY_DERIVATION.algorithm,
    false, // not extractable
    ['deriveKey']
  );
  
  // Derive unwrap key
  const unwrapKey = await crypto.subtle.deriveKey(
    {
      name: CRYPTO_CONFIG.SESSION_KEY_DERIVATION.algorithm,
      salt,
      iterations: CRYPTO_CONFIG.SESSION_KEY_DERIVATION.iterations,
      hash: CRYPTO_CONFIG.SESSION_KEY_DERIVATION.hash,
    },
    keyMaterial,
    {
      name: CRYPTO_CONFIG.KEY_WRAPPING.algorithm,
      length: CRYPTO_CONFIG.KEY_WRAPPING.keyLength,
    },
    false, // not extractable
    ['wrapKey', 'unwrapKey']
  );
  
  return unwrapKey;
}

/**
 * Get current session unwrap key
 * 
 * @throws Error if session not initialized
 */
export function getSessionUnwrapKey(): CryptoKey {
  if (!_currentSession) {
    throw new Error(CRYPTO_ERRORS.SESSION_NOT_INITIALIZED);
  }
  return _currentSession.unwrapKey;
}

/**
 * Get current session info
 */
export function getSessionInfo(): { userId: string; initializedAt: Date } | null {
  if (!_currentSession) return null;
  return {
    userId: _currentSession.userId,
    initializedAt: _currentSession.initializedAt,
  };
}

/**
 * Check if session crypto is initialized
 */
export function isSessionInitialized(): boolean {
  return _currentSession !== null;
}

/**
 * Clear session crypto (logout or security clear)
 * 
 * Zeros out sensitive data in memory.
 */
export function clearSessionCrypto(): void {
  if (_currentSession) {
    console.log('🧹 Clearing session crypto');
    
    // Zero out session secret in memory
    zeroMemory(_currentSession.sessionSecret);
    
    _currentSession = null;
  }
}

/**
 * Create or get user's wrap salt
 * 
 * Called during signup to initialize the user's salt.
 * Salt is PUBLIC (stored in DB) and used for key derivation.
 * 
 * @param userId - User ID
 * @returns Wrap salt (hex string)
 */
export async function ensureUserWrapSalt(userId: string): Promise<string> {
  const supabase = getSupabase();
  
  // Check if salt exists
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('wrap_salt')
    .eq('user_id', userId)
    .single();
  
  if (existing?.wrap_salt) {
    return existing.wrap_salt;
  }
  
  // Generate new salt
  const salt = randomBytes(CRYPTO_CONFIG.SESSION_KEY_DERIVATION.saltLength);
  const saltHex = Array.from(salt)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Store in DB
  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: userId,
      wrap_salt: saltHex,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id'
    });
  
  if (error) {
    throw new Error('Failed to create user wrap salt');
  }
  
  return saltHex;
}
