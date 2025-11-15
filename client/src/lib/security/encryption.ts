import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(secret?: string): Buffer {
  const key = secret || process.env.NDA_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('Encryption key not configured');
  }
  return Buffer.from(key, 'hex');
}

export async function encryptPayload(payload: unknown, secret?: string): Promise<string> {
  const key = getKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const json = JSON.stringify(payload);
  let encrypted = cipher.update(json, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export async function decryptPayload(encrypted: string, secret?: string): Promise<unknown> {
  if (!encrypted) throw new Error('Missing payload to decrypt');
  const key = getKey(secret);
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encryption payload format');
  }
  const [ivHex, tagHex, dataHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(dataHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}
