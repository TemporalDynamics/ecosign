/**
 * E2E Encryption Library - Public API
 * 
 * Zero Server-Side Knowledge Architecture
 * 
 * This module provides the complete E2E encryption functionality:
 * - Session crypto (client-generated secrets)
 * - Document encryption/decryption
 * - Key wrapping/unwrapping
 * - OTP-based sharing
 */

// Constants
export { CRYPTO_CONFIG, OTP_CONFIG, SHARE_CONFIG, CRYPTO_ERRORS } from './constants';

// Crypto utilities
export {
  bytesToBase64,
  base64ToBytes,
  bytesToHex,
  hexToBytes,
  sha256,
  sha256File,
  randomBytes,
  secureCompare,
  zeroMemory,
} from './cryptoUtils';

// Session management
export {
  initializeSessionCrypto,
  getSessionUnwrapKey,
  getSessionInfo,
  isSessionInitialized,
  clearSessionCrypto,
  ensureUserWrapSalt,
} from './sessionCrypto';

// Document encryption
export {
  generateDocumentKey,
  encryptFile,
  decryptFile,
  wrapDocumentKey,
  unwrapDocumentKey,
} from './documentEncryption';

// OTP system
export {
  generateOTP,
  deriveKeyFromOTP,
  hashOTP,
  verifyOTP,
} from './otpSystem';

// Types
export type { } from './types';
