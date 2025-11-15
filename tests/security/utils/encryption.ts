// netlify/functions/utils/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For GCM, this is 12, but 16 is common for other AES modes. Let's stick to 16 for consistency.
const AUTH_TAG_LENGTH = 16;

const ENCRYPTION_KEY = process.env.NDA_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error('NDA_ENCRYPTION_KEY environment variable must be a 64-character hex string (32 bytes).');
}

const key = Buffer.from(ENCRYPTION_KEY, 'hex');

/**
 * Encrypts form data using AES-256-GCM.
 * @param data The JSON object to encrypt.
 * @returns A promise that resolves to a string in the format 'iv:authTag:encryptedData'.
 */
export async function encryptFormData(data: object): Promise<string> {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  const jsonData = JSON.stringify(data);
  
  let encrypted = cipher.update(jsonData, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts form data encrypted with encryptFormData.
 * @param encryptedString The encrypted string ('iv:authTag:encryptedData').
 * @returns A promise that resolves to the original JSON object.
 */
export async function decryptFormData(encryptedString: string): Promise<object> {
  try {
    const parts = encryptedString.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted string format.');
    }

    const [ivHex, authTagHex, encryptedDataHex] = parts;

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedDataHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    // Throw a generic error to avoid leaking details about why it failed (e.g., bad auth tag vs. bad format)
    throw new Error('Failed to decrypt or authenticate data.');
  }
}
