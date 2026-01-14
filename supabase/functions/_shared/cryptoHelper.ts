import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';
import { decode as fromBase64, encode as toBase64 } from 'https://deno.land/std@0.182.0/encoding/base64.ts';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Creates a secure HMAC-SHA256 hash of a token.
 * This is used to store a verifiable, non-reversible representation of the token in the DB.
 * Relies on the TOKEN_SECRET environment variable.
 */
export async function createTokenHash(token: string): Promise<string> {
  const secret = Deno.env.get('TOKEN_SECRET');
  if (!secret) throw new Error('TOKEN_SECRET environment variable not set!');
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(token));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encrypts a token using AES-GCM for safe storage.
 * Relies on the TOKEN_ENCRYPTION_KEY environment variable (must be a 32-byte key, base64-encoded).
 * Returns the ciphertext and nonce, both base64-encoded for easy storage in TEXT columns.
 */
export async function encryptToken(token: string): Promise<{ ciphertext: string; nonce: string }> {
  const keyMaterial = Deno.env.get('TOKEN_ENCRYPTION_KEY');
  if (!keyMaterial) throw new Error('TOKEN_ENCRYPTION_KEY environment variable not set!');
  
  const key = await crypto.subtle.importKey(
    'raw',
    fromBase64(keyMaterial),
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  const nonce = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes is standard for AES-GCM
  const data = encoder.encode(token);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    data
  );
  
  return {
    ciphertext: toBase64(ciphertext),
    nonce: toBase64(nonce),
  };
}

/**
 * Decrypts a token that was encrypted with encryptToken.
 * Relies on the TOKEN_ENCRYPTION_KEY environment variable.
 */
export async function decryptToken(encrypted: { ciphertext: string; nonce: string }): Promise<string> {
  const keyMaterial = Deno.env.get('TOKEN_ENCRYPTION_KEY');
  if (!keyMaterial) throw new Error('TOKEN_ENCRYPTION_KEY environment variable not set!');

  const key = await crypto.subtle.importKey(
    'raw',
    fromBase64(keyMaterial),
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(encrypted.nonce) },
    key,
    fromBase64(encrypted.ciphertext)
  );
  
  return decoder.decode(decryptedData);
}
