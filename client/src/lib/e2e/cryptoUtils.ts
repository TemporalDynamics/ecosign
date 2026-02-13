/**
 * Cryptographic Utilities
 * 
 * Low-level crypto helpers using Web Crypto API
 * All operations are client-side only.
 */

import { CRYPTO_CONFIG } from './constants';

/**
 * Convert byte array to base64 string
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to byte array
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert byte array to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to byte array
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Calculate SHA-256 hash of data
 */
export async function sha256(data: Uint8Array | ArrayBuffer): Promise<string> {
  const normalizedBuffer =
    data instanceof ArrayBuffer
      ? data
      : (data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
  const hashBuffer = await crypto.subtle.digest(
    CRYPTO_CONFIG.HASH.algorithm,
    normalizedBuffer
  );
  return bytesToHex(new Uint8Array(hashBuffer));
}

/**
 * Calculate SHA-256 hash of a File
 */
export async function sha256File(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return sha256(buffer);
}

/**
 * Generate random bytes
 */
export function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Secure comparison of two byte arrays (constant time)
 */
export function secureCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * Zero out sensitive data in memory
 */
export function zeroMemory(data: Uint8Array): void {
  data.fill(0);
}
