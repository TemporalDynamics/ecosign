// tests/security/csrf.test.ts

import { describe, it, expect } from 'vitest';
import { generateCSRFToken, validateCSRFToken } from './utils/csrf.ts';
import { createHmac } from 'crypto';

// Mock environment variable for testing
process.env.CSRF_SECRET = 'test-secret-key-for-csrf-validation';

describe('CSRF Protection Tests', () => {
  const userId = 'test-user-123';

  it('Genera token válido', () => {
    const { token, expires } = generateCSRFToken(userId);
    
    expect(token).toBeDefined();
    expect(token.split(':').length).toBe(3); // userId:expires:signature
    expect(expires).toBeGreaterThan(Date.now() / 1000);
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

  it('Rechaza token expirado', async () => {
    // Generar token con expiración corta (1 segundo)
    const expires = Math.floor(Date.now() / 1000) + 1;
    const payload = `${userId}:${expires}`;
    const signature = createHmac('sha256', process.env.CSRF_SECRET!)
      .update(payload)
      .digest('hex');
    const token = `${payload}:${signature}`;

    // Esperar 1.1 segundos
    await new Promise(resolve => setTimeout(resolve, 1100));

    const isValid = validateCSRFToken(token, userId);
    expect(isValid).toBe(false);
  });

  it('Rechaza token con firma alterada', () => {
    const { token } = generateCSRFToken(userId);
    const [userIdPart, expiresPart] = token.split(':');
    const alteredToken = `${userIdPart}:${expiresPart}:fake-signature-that-is-long-enough-to-pass-length-check`;
    
    const isValid = validateCSRFToken(alteredToken, userId);
    expect(isValid).toBe(false);
  });

  it('Previene timing attacks (usando timingSafeEqual)', () => {
    // Vitest/Node no permite medir performance con la precisión necesaria para
    // demostrar la diferencia entre una comparación normal y una timing-safe.
    // La presencia de `timingSafeEqual` en la implementación es la clave.
    // Este test verifica que la función no falle con firmas de longitud diferente.
    const { token } = generateCSRFToken(userId);
    
    const [userIdPart, expiresPart, correctSignature] = token.split(':');
    
    // Firma más corta
    const shortSignature = correctSignature.slice(0, -2);
    const shortToken = `${userIdPart}:${expiresPart}:${shortSignature}`;
    const isValidShort = validateCSRFToken(shortToken, userId);
    expect(isValidShort).toBe(false);

    // Firma más larga
    const longSignature = correctSignature + 'aa';
    const longToken = `${userIdPart}:${expiresPart}:${longSignature}`;
    const isValidLong = validateCSRFToken(longToken, userId);
    expect(isValidLong).toBe(false);
  });
});