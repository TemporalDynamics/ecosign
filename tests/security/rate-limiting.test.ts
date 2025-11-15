// tests/security/rate-limiting.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from './utils/rateLimitPersistent.ts';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('Rate Limiting Tests', () => {
  const testIdentifier = `test-user-${Date.now()}`;
  const testEndpoint = 'generate-link';

  // Clean up before and after all tests
  beforeAll(async () => {
    await supabase.from('rate_limits').delete().like('key', `%${testIdentifier}%`);
    await supabase.from('rate_limit_blocks').delete().like('key', `%${testIdentifier}%`);
  });

  afterAll(async () => {
    await supabase.from('rate_limits').delete().like('key', `%${testIdentifier}%`);
    await supabase.from('rate_limit_blocks').delete().like('key', `%${testIdentifier}%`);
  });

  it('Permite requests dentro del límite', async () => {
    const key = `${testIdentifier}:limit-ok`;
    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit(key, testEndpoint, {
        maxRequests: 10,
        windowMinutes: 60
      });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10 - i - 1);
    }
  });

  it('Bloquea requests que exceden el límite', async () => {
    const key = `${testIdentifier}:limit-exceeded`;
    // Hacer 10 requests (límite)
    for (let i = 0; i < 10; i++) {
      await checkRateLimit(key, testEndpoint, {
        maxRequests: 10,
        windowMinutes: 60
      });
    }

    // Request #11 debe ser bloqueado
    const result = await checkRateLimit(key, testEndpoint, {
      maxRequests: 10,
      windowMinutes: 60
    });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('Resetea después de la ventana de tiempo', async () => {
    const key = `${testIdentifier}:window-reset`;
    // Hacer 10 requests
    for (let i = 0; i < 10; i++) {
      await checkRateLimit(key, testEndpoint, {
        maxRequests: 10,
        windowMinutes: 1 / 60 // 1 segundo para el test
      });
    }

    // Esperar 1.1 segundos
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Debe permitir nuevamente
    const result = await checkRateLimit(key, testEndpoint, {
      maxRequests: 10,
      windowMinutes: 1 / 60
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it('Bloqueo temporal funciona correctamente', async () => {
    const key = `${testIdentifier}:temp-block`;
    // Hacer 10 requests para activar bloqueo
    for (let i = 0; i < 10; i++) {
      await checkRateLimit(key, testEndpoint, {
        maxRequests: 10,
        windowMinutes: 60,
        blockMinutes: 1 / 30 // 2 segundos de bloqueo
      });
    }

    // Request #11 activa bloqueo
    const blocked = await checkRateLimit(key, testEndpoint, {
      maxRequests: 10,
      windowMinutes: 60,
      blockMinutes: 1 / 30
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.resetAt).toBeDefined();

    // Esperar 1 segundo (sin completar los 2 seg)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Debe seguir bloqueado
    const stillBlocked = await checkRateLimit(key, testEndpoint, {
      maxRequests: 10,
      windowMinutes: 60,
      blockMinutes: 1 / 30
    });
    expect(stillBlocked.allowed).toBe(false);

    // Esperar otros 1.1 segundos (total > 2 seg)
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // Ya no debería estar bloqueado, pero el rate limit normal sigue aplicando
    const notBlockedAnymore = await checkRateLimit(key, testEndpoint, {
        maxRequests: 10,
        windowMinutes: 60,
        blockMinutes: 1/30
    });
    expect(notBlockedAnymore.allowed).toBe(false); // Sigue rate limited, pero no por el bloqueo temporal
    expect(notBlockedAnymore.resetAt).toBeUndefined();
  });

  it('Límites por endpoint son independientes', async () => {
    const key = `${testIdentifier}:independent-endpoints`;
    // Agotar límite de generate-link
    for (let i = 0; i < 10; i++) {
      await checkRateLimit(key, 'generate-link', {
        maxRequests: 10,
        windowMinutes: 60
      });
    }

    // verify-access debe seguir permitiendo
    const result = await checkRateLimit(key, 'verify-access', {
      maxRequests: 10,
      windowMinutes: 60
    });
    expect(result.allowed).toBe(true);
  });
});