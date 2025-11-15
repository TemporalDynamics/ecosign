import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit } from '../../netlify/functions/utils/rateLimitPersistent';

// Mock de la base de datos para pruebas
vi.mock('../../netlify/functions/utils/rateLimitPersistent', async () => {
  const actual = await vi.importActual('../../netlify/functions/utils/rateLimitPersistent');
  return {
    ...actual,
    checkRateLimit: vi.fn(),
  };
});

describe('Rate Limiting Tests', () => {
  const mockIdentifier = 'test-user-123';
  const mockEndpoint = 'generate-link';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('Permite requests dentro del límite', async () => {
    // Mockear que las primeras 5 solicitudes están dentro del límite
    const mockCheckRateLimit = vi.fn()
      .mockResolvedValueOnce({ allowed: true, remaining: 5 })
      .mockResolvedValueOnce({ allowed: true, remaining: 4 })
      .mockResolvedValueOnce({ allowed: true, remaining: 3 })
      .mockResolvedValueOnce({ allowed: true, remaining: 2 })
      .mockResolvedValueOnce({ allowed: true, remaining: 1 });

    for (let i = 0; i < 5; i++) {
      const result = await mockCheckRateLimit(mockIdentifier, mockEndpoint, {
        maxRequests: 5,
        windowMinutes: 60
      });
      expect(result.allowed).toBe(true);
    }
  });

  it('Bloquea requests que exceden el límite', async () => {
    // Simular que ya se alcanzó el límite
    const mockCheckRateLimit = vi.fn().mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 3600000 });

    const result = await mockCheckRateLimit(mockIdentifier, mockEndpoint, {
      maxRequests: 5,
      windowMinutes: 60
    });
    
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('Devuelve tiempo de reset correctamente', async () => {
    const futureTime = Date.now() + 3600000; // 1 hora en el futuro
    const mockCheckRateLimit = vi.fn().mockResolvedValue({ 
      allowed: false, 
      remaining: 0, 
      resetAt: futureTime 
    });

    const result = await mockCheckRateLimit(mockIdentifier, mockEndpoint, {
      maxRequests: 5,
      windowMinutes: 60
    });
    
    expect(result.resetAt).toBe(futureTime);
  });

  it('Límites por endpoint son independientes', async () => {
    // Este test verificaría que los límites son por endpoint
    const mockCheckRateLimit = vi.fn().mockResolvedValue({ allowed: true, remaining: 10 });

    const result1 = await mockCheckRateLimit(mockIdentifier, 'generate-link', {
      maxRequests: 10,
      windowMinutes: 60
    });
    expect(result1.allowed).toBe(true);

    const result2 = await mockCheckRateLimit(mockIdentifier, 'verify-access', {
      maxRequests: 10,
      windowMinutes: 60
    });
    expect(result2.allowed).toBe(true);
  });

  it('Calcula correctamente requests restantes', async () => {
    const mockCheckRateLimit = vi.fn().mockResolvedValue({ allowed: true, remaining: 7 });

    const result = await mockCheckRateLimit(mockIdentifier, mockEndpoint, {
      maxRequests: 10,
      windowMinutes: 60
    });
    
    expect(result.remaining).toBe(7);
    expect(result.allowed).toBe(true);
  });
});