// client/src/utils/fileHashUtils.js
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

/**
 * Calculate SHA-256 hash of a file
 * @param {File} file - The file to hash
 * @returns {Promise<string>} SHA-256 hash in hex format
 */
export async function calculateFileHash(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      try {
        const arrayBuffer = reader.result;
        const uint8Array = new Uint8Array(arrayBuffer);
        const hash = sha256(uint8Array);
        const hashHex = bytesToHex(hash);
        resolve(hashHex);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Compare two file hashes
 * @param {string} hash1 - First hash
 * @param {string} hash2 - Second hash
 * @returns {boolean} True if hashes match
 */
export function compareHashes(hash1, hash2) {
  // Normalize both hashes (convert to lowercase, remove whitespace)
  const normalizedHash1 = hash1.toLowerCase().trim();
  const normalizedHash2 = hash2.toLowerCase().trim();
  
  return normalizedHash1 === normalizedHash2;
}