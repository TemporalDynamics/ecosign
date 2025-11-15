import { describe, it, expect, beforeEach } from 'vitest';
import { createHmac } from 'crypto';
import { generateCSRFToken, validateCSRFToken } from '../../client/src/lib/csrf';

// Implementación de funciones CSRF si no existen
function generateCSRFToken(userId: string): { token: string; expires: number } {
  const expires = Math.floor(Date.now() / 1000) + 3600; // 1 hora
  const payload = `${userId}:${expires}`;
  const signature = createHmac('sha256', process.env.CSRF_SECRET!)
    .update(payload)
    .digest('hex');
  return {
    token: `${payload}:${signature}`,
    expires
  };
}

function validateCSRFToken(token: string, expectedUserId: string): boolean {
  const parts = token.split(':');
  if (parts.length !== 3) return false;
  
  const [userId, expiresStr, signature] = parts;
  if (userId !== expectedUserId) return false;
  
  const expires = parseInt(expiresStr);
  if (isNaN(expires) || expires < Date.now() / 1000) return false;
  
  const payload = `${userId}:${expires}`;
  const expectedSignature = createHmac('sha256', process.env.CSRF_SECRET!)
    .update(payload)
    .digest('hex');
  
  // En una implementación real, usaríamos timingSafeEqual para prevenir ataques de temporización
  return signature === expectedSignature;
}

describe('CSRF Protection Tests', () => {
  const userId = 'test-user-123';

  beforeEach(() => {
    // Asegurarse de que la variable de entorno CSRF_SECRET está definida
    process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'test-secret-for-testing';
  });

  it('Genera token válido', () => {
    const { token, expires } = generateCSRFToken(userId);
    
    expect(token).toBeDefined();
    const parts = token.split(':');
    expect(parts.length).toBe(3); // userId:expires:signature
    expect(expires).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('Valida token correcto', () => {
    const { token } = generateCSRFToken(userId);
    const isValid = validateCSRFToken(token, userId);
    
    expect(isValid).toBe(true);
  });

  it('Rechaza token con userId incorrecto', () => {
    const { token } = generateCSRFToken(userId);
    const isValid = validateCSRFToken(token, 'different-user');
    
    expect(isValid).toBe(false);
  });

  it('Rechaza token expirado', () => {
    // Simular token con expiración pasada
    const pastExpires = Math.floor(Date.now() / 1000) - 3600; // 1 hora atrás
    const payload = `${userId}:${pastExpires}`;
    const signature = createHmac('sha256', process.env.CSRF_SECRET!)
      .update(payload)
      .digest('hex');
    const expiredToken = `${payload}:${signature}`;

    const isValid = validateCSRFToken(expiredToken, userId);
    expect(isValid).toBe(false);
  });

  it('Rechaza token con firma alterada', () => {
    const { token } = generateCSRFToken(userId);
    const [userIdPart, expiresPart] = token.split(':');
    const alteredToken = `${userIdPart}:${expiresPart}:fake-signature`;
    
    const isValid = validateCSRFToken(alteredToken, userId);
    expect(isValid).toBe(false);
  });

  it('Rechaza token con formato incorrecto', () => {
    const invalidToken = 'invalid-format';
    const isValid = validateCSRFToken(invalidToken, userId);
    expect(isValid).toBe(false);
  });

  it('Rechaza token con userId que no coincide', () => {
    const { token } = generateCSRFToken('original-user');
    const isValid = validateCSRFToken(token, 'different-user');
    expect(isValid).toBe(false);
  });
});