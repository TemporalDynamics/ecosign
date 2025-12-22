/**
 * OTP System
 * 
 * One-Time Password generation and key derivation for document sharing.
 * OTPs are used to securely share document access without persistent keys.
 */

import { CRYPTO_CONFIG, OTP_CONFIG } from './constants';

/**
 * Generate a secure OTP
 * 
 * @param length - Length of OTP (default: 8)
 * @returns OTP string (e.g., "A1B2C3D4")
 */
export function generateOTP(length: number = OTP_CONFIG.LENGTH): string {
  const charset = OTP_CONFIG.CHARSET;
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += charset[values[i] % charset.length];
  }
  
  return otp;
}

/**
 * Derive a cryptographic key from an OTP
 * 
 * Used for wrapping document keys when sharing.
 * 
 * @param otp - One-time password
 * @param salt - Salt (should be unique per share)
 * @returns Derived key for wrapping/unwrapping
 */
export async function deriveKeyFromOTP(
  otp: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  // Convert OTP string to bytes
  const otpBytes = new TextEncoder().encode(otp);
  
  // Import as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    otpBytes,
    CRYPTO_CONFIG.OTP_KEY_DERIVATION.algorithm,
    false,
    ['deriveKey']
  );
  
  // Derive key
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: CRYPTO_CONFIG.OTP_KEY_DERIVATION.algorithm,
      salt,
      iterations: CRYPTO_CONFIG.OTP_KEY_DERIVATION.iterations,
      hash: CRYPTO_CONFIG.OTP_KEY_DERIVATION.hash,
    },
    keyMaterial,
    {
      name: CRYPTO_CONFIG.KEY_WRAPPING.algorithm,
      length: CRYPTO_CONFIG.KEY_WRAPPING.keyLength,
    },
    false, // not extractable
    ['wrapKey', 'unwrapKey']
  );
  
  return derivedKey;
}

/**
 * Hash an OTP for storage
 * 
 * We never store OTPs in plaintext, only their hashes.
 * 
 * @param otp - OTP to hash
 * @returns SHA-256 hash (hex string)
 */
export async function hashOTP(otp: string): Promise<string> {
  const otpBytes = new TextEncoder().encode(otp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', otpBytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify an OTP against its hash
 * 
 * @param otp - OTP to verify
 * @param hash - Stored hash
 * @returns true if OTP matches hash
 */
export async function verifyOTP(otp: string, hash: string): Promise<boolean> {
  const otpHash = await hashOTP(otp);
  return otpHash === hash;
}
