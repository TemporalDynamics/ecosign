// netlify/functions/utils/csrf.ts
import { createHmac, timingSafeEqual } from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET;
const TOKEN_EXPIRATION_MINUTES = 60;

if (!CSRF_SECRET) {
  throw new Error('CSRF_SECRET environment variable is not set!');
}

/**
 * Generates a CSRF token for a given user ID.
 * @param userId The ID of the user.
 * @returns An object containing the token and its expiration timestamp.
 */
export function generateCSRFToken(userId: string): { token: string; expires: number } {
  const expires = Math.floor(Date.now() / 1000) + TOKEN_EXPIRATION_MINUTES * 60;
  const payload = `${userId}:${expires}`;
  
  const signature = createHmac('sha256', CSRF_SECRET)
    .update(payload)
    .digest('hex');
    
  const token = `${payload}:${signature}`;
  
  return { token, expires };
}

/**
 * Validates a CSRF token.
 * Uses timing-safe comparison to prevent timing attacks.
 * @param token The CSRF token from the client.
 * @param userId The ID of the current user.
 * @returns True if the token is valid, false otherwise.
 */
export function validateCSRFToken(token: string, userId: string): boolean {
  try {
    const parts = token.split(':');
    if (parts.length !== 3) {
      return false;
    }

    const [tokenUserId, expiresStr, signature] = parts;
    const expires = parseInt(expiresStr, 10);

    // Check for expiration
    if (Date.now() / 1000 > expires) {
      return false;
    }

    // Check if the token belongs to the correct user
    if (tokenUserId !== userId) {
      return false;
    }

    // Recalculate the signature
    const payload = `${tokenUserId}:${expires}`;
    const expectedSignature = createHmac('sha256', CSRF_SECRET)
      .update(payload)
      .digest('hex');

    // Compare signatures using a timing-safe method
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedSignatureBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedSignatureBuffer.length) {
        return false;
    }

    return timingSafeEqual(signatureBuffer, expectedSignatureBuffer);
  } catch (error) {
    // Any error during validation means the token is invalid
    console.error("CSRF validation error:", error);
    return false;
  }
}
