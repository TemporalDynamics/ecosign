import { createHmac, timingSafeEqual } from 'crypto';

const DEFAULT_TTL_SECONDS = 60 * 60; // 1h

export interface CSRFToken {
  token: string;
  expiresAt: number;
}

function getSecret(provided?: string): string {
  const secret = provided || process.env.CSRF_SECRET;
  if (!secret) {
    throw new Error('CSRF secret is not configured');
  }
  return secret;
}

export function generateCSRFToken(userId: string, secret?: string, ttlSeconds: number = DEFAULT_TTL_SECONDS): CSRFToken {
  if (!userId) {
    throw new Error('User id is required to generate CSRF token');
  }
  const resolvedSecret = getSecret(secret);
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${userId}:${expiresAt}`;
  const signature = createHmac('sha256', resolvedSecret).update(payload).digest('hex');
  return {
    token: `${payload}:${signature}`,
    expiresAt
  };
}

export function validateCSRFToken(token: string | null | undefined, expectedUserId: string, secret?: string): boolean {
  if (!token || !expectedUserId) return false;
  const resolvedSecret = getSecret(secret);
  const parts = token.split(':');
  if (parts.length !== 3) return false;
  const [userId, expiresAt, signature] = parts;
  if (userId !== expectedUserId) return false;
  const expires = Number(expiresAt);
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const payload = `${userId}:${expiresAt}`;
  const expectedSignature = createHmac('sha256', resolvedSecret).update(payload).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}
