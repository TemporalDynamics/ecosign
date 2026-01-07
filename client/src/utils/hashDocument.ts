// ============================================
// Document Hashing Utility
// ============================================
// Calculates SHA-256 hash of PDF documents
// Used for:
// 1. Document upload (store hash in DB)
// 2. Document verification (check if hash exists)
// ============================================

import { hashSource } from '@/lib/canonicalHashing'

/**
 * Calculate SHA-256 hash of a file (canonical source hash)
 * @param file - File object (original bytes)
 * @returns Hex string of the hash
 */
export async function calculateDocumentHash(file: File): Promise<string> {
  try {
    return await hashSource(file)
  } catch (error) {
    console.error('Error calculating document hash:', error)
    throw new Error('Failed to calculate document hash')
  }
}

/**
 * Calculate SHA-256 hash from ArrayBuffer
 * Useful when you already have the file content as buffer
 * @param buffer - ArrayBuffer of the file
 * @returns Hex string of the hash
 */
export async function calculateBufferHash(buffer: ArrayBuffer): Promise<string> {
  try {
    return await hashSource(buffer)
  } catch (error) {
    console.error('Error calculating buffer hash:', error)
    throw new Error('Failed to calculate buffer hash')
  }
}

/**
 * Format hash for display (first 16 characters)
 * @param hash - Full hash string
 * @returns Shortened hash for UI display
 */
export function formatHashForDisplay(hash: string): string {
  if (!hash || hash.length < 16) {
    return hash
  }
  return `${hash.substring(0, 16)}...`
}

/**
 * Validate that a string is a valid SHA-256 hash
 * @param hash - Hash string to validate
 * @returns true if valid SHA-256 hash format
 */
export function isValidSHA256(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash)
}
