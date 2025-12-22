/**
 * E2E Encryption Constants
 * 
 * Zero Server-Side Knowledge Architecture
 * These constants define the cryptographic parameters for client-side encryption.
 */

// Algorithm configurations
export const CRYPTO_CONFIG = {
  // Document encryption
  DOCUMENT_ENCRYPTION: {
    algorithm: 'AES-GCM' as const,
    keyLength: 256,
    ivLength: 12, // 96 bits for GCM
  },

  // Key wrapping
  KEY_WRAPPING: {
    algorithm: 'AES-GCM' as const,
    keyLength: 256,
    ivLength: 12,
  },

  // Key derivation (session unwrap key)
  SESSION_KEY_DERIVATION: {
    algorithm: 'PBKDF2' as const,
    iterations: 100000, // OWASP recommended minimum for 2024
    hash: 'SHA-256' as const,
    saltLength: 16, // 128 bits
  },

  // Key derivation (OTP-based for sharing)
  OTP_KEY_DERIVATION: {
    algorithm: 'PBKDF2' as const,
    iterations: 100000,
    hash: 'SHA-256' as const,
    saltLength: 16,
  },

  // Session secret (generated at login)
  SESSION_SECRET: {
    length: 32, // 256 bits
  },

  // Hash algorithm
  HASH: {
    algorithm: 'SHA-256' as const,
  },
} as const;

// OTP configuration
export const OTP_CONFIG = {
  LENGTH: 8, // Characters
  CHARSET: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', // Exclude ambiguous chars (0,O,1,I)
  EXPIRATION_DAYS: 7,
} as const;

// Share expiration
export const SHARE_CONFIG = {
  DEFAULT_EXPIRATION_DAYS: 7,
  MAX_EXPIRATION_DAYS: 30,
} as const;

// Error messages
export const CRYPTO_ERRORS = {
  SESSION_NOT_INITIALIZED: 'Session crypto not initialized. Please log in again.',
  INVALID_OTP: 'Invalid or expired OTP.',
  DECRYPTION_FAILED: 'Failed to decrypt document. The file may be corrupted.',
  UNWRAP_FAILED: 'Failed to unwrap document key. Session may have expired.',
  NO_PERMISSION: 'You do not have permission to access this document.',
} as const;
