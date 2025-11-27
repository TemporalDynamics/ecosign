// ============================================
// Client-Side Encryption Utilities
// ============================================
// 🔒 CRITICAL: All encryption happens in the browser
// The server NEVER sees the unencrypted content
// ============================================

/**
 * Generate a random AES-256 encryption key
 * This key is generated in the browser and NEVER sent to the server
 *
 * @returns Base64-encoded encryption key
 */
export async function generateEncryptionKey(): Promise<string> {
  const key = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true, // extractable
    ['encrypt', 'decrypt']
  )

  // Export key to raw format
  const rawKey = await crypto.subtle.exportKey('raw', key)

  // Convert to base64 for storage
  const keyArray = new Uint8Array(rawKey)
  return btoa(String.fromCharCode(...keyArray))
}

/**
 * Import an encryption key from base64 string
 *
 * @param keyBase64 - Base64-encoded key
 * @returns CryptoKey for encryption/decryption
 */
async function importKey(keyBase64: string): Promise<CryptoKey> {
  // Decode base64 to ArrayBuffer
  const keyString = atob(keyBase64)
  const keyArray = new Uint8Array(keyString.length)
  for (let i = 0; i < keyString.length; i++) {
    keyArray[i] = keyString.charCodeAt(i)
  }

  // Import as CryptoKey
  return await crypto.subtle.importKey(
    'raw',
    keyArray,
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt a file in the browser using AES-256-GCM
 * 🔒 CRITICAL: This happens BEFORE sending to server
 *
 * @param file - File to encrypt
 * @param encryptionKey - Base64-encoded encryption key
 * @returns Encrypted blob with IV prepended
 */
export async function encryptFile(
  file: File,
  encryptionKey: string
): Promise<Blob> {
  try {
    // Read file as ArrayBuffer
    const fileBuffer = await file.arrayBuffer()

    // Generate random IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12)) // 12 bytes for GCM

    // Import encryption key
    const key = await importKey(encryptionKey)

    // Encrypt the file content
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      fileBuffer
    )

    // Prepend IV to encrypted data (needed for decryption)
    const resultBuffer = new Uint8Array(iv.length + encryptedBuffer.byteLength)
    resultBuffer.set(iv, 0)
    resultBuffer.set(new Uint8Array(encryptedBuffer), iv.length)

    return new Blob([resultBuffer], { type: 'application/octet-stream' })
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt file')
  }
}

/**
 * Decrypt a file in the browser using AES-256-GCM
 *
 * @param encryptedBlob - Encrypted blob with IV prepended
 * @param encryptionKey - Base64-encoded encryption key
 * @returns Decrypted blob
 */
export async function decryptFile(
  encryptedBlob: Blob,
  encryptionKey: string
): Promise<Blob> {
  try {
    // Read encrypted blob as ArrayBuffer
    const encryptedBuffer = await encryptedBlob.arrayBuffer()
    const encryptedArray = new Uint8Array(encryptedBuffer)

    // Extract IV (first 12 bytes)
    const iv = encryptedArray.slice(0, 12)
    const ciphertext = encryptedArray.slice(12)

    // Import decryption key
    const key = await importKey(encryptionKey)

    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      ciphertext
    )

    return new Blob([decryptedBuffer])
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt file')
  }
}

/**
 * 🔒 SECURITY NOTE:
 *
 * The encryption key must be stored securely and NEVER sent to the server.
 *
 * Recommended approaches:
 * 1. Store in browser's IndexedDB (encrypted with user's password)
 * 2. Derive from user's password using PBKDF2
 * 3. Store encrypted with user's public key (asymmetric encryption)
 *
 * For MVP, we'll store the key in the workflow metadata, encrypted
 * with the owner's password-derived key.
 */
