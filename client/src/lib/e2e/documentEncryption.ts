/**
 * Document Encryption
 * 
 * Client-side encryption/decryption of documents.
 * All operations happen in the browser, server never sees plaintext.
 */

import { CRYPTO_CONFIG, CRYPTO_ERRORS } from './constants';
import { randomBytes, bytesToBase64, base64ToBytes } from './cryptoUtils';

/**
 * Generate a new document encryption key
 */
export async function generateDocumentKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: CRYPTO_CONFIG.DOCUMENT_ENCRYPTION.algorithm,
      length: CRYPTO_CONFIG.DOCUMENT_ENCRYPTION.keyLength,
    },
    true, // extractable (needed for wrapping)
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a file with AES-GCM
 * 
 * @param file - File to encrypt
 * @param documentKey - Document encryption key
 * @returns Encrypted blob (IV prepended to ciphertext)
 */
export async function encryptFile(
  file: File,
  documentKey: CryptoKey
): Promise<Blob> {
  // 1. Read file as ArrayBuffer
  const fileBuffer = await file.arrayBuffer();
  
  // 2. Generate random IV
  const iv = randomBytes(CRYPTO_CONFIG.DOCUMENT_ENCRYPTION.ivLength);
  
  // 3. Encrypt
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: CRYPTO_CONFIG.DOCUMENT_ENCRYPTION.algorithm,
      iv,
    },
    documentKey,
    fileBuffer
  );
  
  // 4. Prepend IV to ciphertext (needed for decryption)
  const result = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encryptedBuffer), iv.length);
  
  return new Blob([result], { type: 'application/octet-stream' });
}

/**
 * Decrypt a file with AES-GCM
 * 
 * @param encryptedBlob - Encrypted blob (IV prepended)
 * @param documentKey - Document encryption key
 * @returns Decrypted blob
 */
export async function decryptFile(
  encryptedBlob: Blob,
  documentKey: CryptoKey
): Promise<Blob> {
  try {
    // 1. Read blob as ArrayBuffer
    const buffer = await encryptedBlob.arrayBuffer();
    const data = new Uint8Array(buffer);
    
    // 2. Extract IV (first 12 bytes)
    const iv = data.slice(0, CRYPTO_CONFIG.DOCUMENT_ENCRYPTION.ivLength);
    const ciphertext = data.slice(CRYPTO_CONFIG.DOCUMENT_ENCRYPTION.ivLength);
    
    // 3. Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: CRYPTO_CONFIG.DOCUMENT_ENCRYPTION.algorithm,
        iv,
      },
      documentKey,
      ciphertext
    );
    
    return new Blob([decryptedBuffer]);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error(CRYPTO_ERRORS.DECRYPTION_FAILED);
  }
}

/**
 * Wrap (encrypt) a document key with an unwrap key
 * 
 * @param documentKey - Document key to wrap
 * @param unwrapKey - Key used for wrapping
 * @returns Wrapped key (base64) and IV (hex)
 */
export async function wrapDocumentKey(
  documentKey: CryptoKey,
  unwrapKey: CryptoKey
): Promise<{ wrappedKey: string; wrapIv: string }> {
  // Generate IV for wrapping
  const wrapIv = randomBytes(CRYPTO_CONFIG.KEY_WRAPPING.ivLength);

  // Wrap the document key
  const wrappedKeyBuffer = await crypto.subtle.wrapKey(
    'raw',
    documentKey,
    unwrapKey,
    {
      name: CRYPTO_CONFIG.KEY_WRAPPING.algorithm,
      iv: wrapIv,
    }
  );

  const wrappedKeyBytes = new Uint8Array(wrappedKeyBuffer);
  const wrappedKeyBase64 = bytesToBase64(wrappedKeyBytes);
  
  return {
    wrappedKey: wrappedKeyBase64,
    wrapIv: Array.from(wrapIv)
      .map(b => b.toString(16).padStart(2, '0'))
      .join(''),
  };
}

/**
 * Unwrap (decrypt) a document key with an unwrap key
 * 
 * @param wrappedKey - Wrapped key (base64)
 * @param wrapIv - IV used for wrapping (hex)
 * @param unwrapKey - Key used for unwrapping
 * @returns Unwrapped document key
 */
export async function unwrapDocumentKey(
  wrappedKey: string,
  wrapIv: string,
  unwrapKey: CryptoKey
): Promise<CryptoKey> {
  try {
    const wrappedKeyBytes = base64ToBytes(wrappedKey);
    
    // Convert hex IV to bytes
    const iv = new Uint8Array(wrapIv.length / 2);
    for (let i = 0; i < wrapIv.length; i += 2) {
      iv[i / 2] = parseInt(wrapIv.slice(i, i + 2), 16);
    }
    
    const documentKey = await crypto.subtle.unwrapKey(
      'raw',
      wrappedKeyBytes,
      unwrapKey,
      {
        name: CRYPTO_CONFIG.KEY_WRAPPING.algorithm,
        iv,
      },
      {
        name: CRYPTO_CONFIG.DOCUMENT_ENCRYPTION.algorithm,
        length: CRYPTO_CONFIG.DOCUMENT_ENCRYPTION.keyLength,
      },
      true, // extractable (for re-wrapping)
      ['encrypt', 'decrypt']
    );
    
    return documentKey;
  } catch (error) {
    console.error('❌ Unwrap error:', error);
    console.error('   This usually means:');
    console.error('   1. Session secret changed (localStorage cleared or different browser)');
    console.error('   2. Document was created with a different session');
    console.error('   3. Document crypto data is corrupted');
    throw new Error(CRYPTO_ERRORS.UNWRAP_FAILED);
  }
}
