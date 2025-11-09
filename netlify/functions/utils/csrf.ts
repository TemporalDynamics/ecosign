import { randomBytes, createHmac } from 'crypto';

/**
 * CSRF Token utilities
 * Genera y valida tokens CSRF para proteger contra ataques Cross-Site Request Forgery
 */

const getSecret = (): string => {
  const secret = process.env.HMAC_SIGN_SECRET;
  if (!secret) {
    throw new Error('HMAC_SIGN_SECRET not configured');
  }
  return secret;
};

/**
 * Generar token CSRF
 * Formato: {token}:{timestamp}:{signature}
 */
export const generateCSRFToken = (): string => {
  const token = randomBytes(32).toString('hex');
  const timestamp = Date.now();
  const secret = getSecret();

  const signature = createHmac('sha256', secret)
    .update(`${token}:${timestamp}`)
    .digest('hex');

  return `${token}:${timestamp}:${signature}`;
};

/**
 * Validar token CSRF
 * @param token - Token en formato {token}:{timestamp}:{signature}
 * @param maxAgeMs - Tiempo máximo de vida del token (default: 1 hora)
 */
export const validateCSRFToken = (
  token: string,
  maxAgeMs: number = 3600000
): boolean => {
  try {
    const parts = token.split(':');
    if (parts.length !== 3) return false;

    const [tokenPart, timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);

    // Verificar que timestamp es válido
    if (isNaN(timestamp)) return false;

    // Verificar expiración
    if (Date.now() - timestamp > maxAgeMs) {
      return false;
    }

    // Verificar firma
    const secret = getSecret();
    const expectedSignature = createHmac('sha256', secret)
      .update(`${tokenPart}:${timestamp}`)
      .digest('hex');

    // Comparación constante para prevenir timing attacks
    return constantTimeCompare(signature, expectedSignature);
  } catch (error) {
    return false;
  }
};

/**
 * Comparación en tiempo constante para prevenir timing attacks
 */
const constantTimeCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
};
