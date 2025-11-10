/**
 * Browser-compatible crypto utilities for VerifySign
 */

/**
 * Calculate SHA-256 hash of data
 * @param data - The data to hash (string or ArrayBuffer)
 * @returns The SHA-256 hash as a hexadecimal string
 */
export async function sha256Hex(data: string | BufferSource): Promise<string> {
  const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a random ID
 * @returns A random ID string
 */
export function generateId(): string {
  return `ECO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current ISO timestamp
 * @returns Current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}