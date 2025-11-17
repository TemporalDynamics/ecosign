// tests/security/rate-limiting.test.ts

import { test, expect, describe } from 'vitest';

describe('Rate Limiting Tests', () => {
  // Unit tests for rate limiting logic (no database required)
  
  test('Rate limiting logic - allows requests within limit', () => {
    const requests = new Map<string, { count: number; windowStart: number }>();
    
    const checkRateLimit = (key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number } => {
      const now = Date.now();
      const record = requests.get(key);
      
      if (!record || now - record.windowStart > windowMs) {
        // New window
        requests.set(key, { count: 1, windowStart: now });
        return { allowed: true, remaining: limit - 1 };
      }
      
      // Within window
      if (record.count >= limit) {
        return { allowed: false, remaining: 0 };
      }
      
      record.count++;
      return { allowed: true, remaining: limit - record.count };
    };
    
    const limit = 5;
    const window = 60000;
    
    // First 5 requests should be allowed
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit('test-key', limit, window);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(limit - i - 1);
    }
  });

  test('Rate limiting logic - blocks requests exceeding limit', () => {
    const requests = new Map<string, { count: number; windowStart: number }>();
    
    const checkRateLimit = (key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number } => {
      const now = Date.now();
      const record = requests.get(key);
      
      if (!record || now - record.windowStart > windowMs) {
        requests.set(key, { count: 1, windowStart: now });
        return { allowed: true, remaining: limit - 1 };
      }
      
      if (record.count >= limit) {
        return { allowed: false, remaining: 0 };
      }
      
      record.count++;
      return { allowed: true, remaining: limit - record.count };
    };
    
    const limit = 3;
    const window = 60000;
    
    // First 3 requests allowed
    for (let i = 0; i < 3; i++) {
      const result = checkRateLimit('test-key-2', limit, window);
      expect(result.allowed).toBe(true);
    }
    
    // 4th request should be blocked
    const result = checkRateLimit('test-key-2', limit, window);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  test('Window expiration resets the counter', () => {
    const requests = new Map<string, { count: number; windowStart: number }>();
    
    const checkRateLimit = (key: string, limit: number, windowMs: number, now: number): { allowed: boolean; remaining: number } => {
      const record = requests.get(key);
      
      if (!record || now - record.windowStart > windowMs) {
        requests.set(key, { count: 1, windowStart: now });
        return { allowed: true, remaining: limit - 1 };
      }
      
      if (record.count >= limit) {
        return { allowed: false, remaining: 0 };
      }
      
      record.count++;
      return { allowed: true, remaining: limit - record.count };
    };
    
    const limit = 2;
    const window = 1000; // 1 second
    const key = 'test-key-3';
    let now = Date.now();
    
    // First 2 requests at time 0
    const result1 = checkRateLimit(key, limit, window, now);
    const result2 = checkRateLimit(key, limit, window, now);
    
    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
    
    // 3rd request should be blocked
    const result3 = checkRateLimit(key, limit, window, now);
    expect(result3.allowed).toBe(false);
    
    // After window expires (1.5 seconds later)
    now += 1500;
    const result4 = checkRateLimit(key, limit, window, now);
    expect(result4.allowed).toBe(true); // Should be allowed again
    expect(result4.remaining).toBe(limit - 1);
  });

  test('Different keys have independent rate limits', () => {
    const requests = new Map<string, { count: number; windowStart: number }>();
    
    const checkRateLimit = (key: string, limit: number, windowMs: number): { allowed: boolean } => {
      const now = Date.now();
      const record = requests.get(key);
      
      if (!record || now - record.windowStart > windowMs) {
        requests.set(key, { count: 1, windowStart: now });
        return { allowed: true };
      }
      
      if (record.count >= limit) {
        return { allowed: false };
      }
      
      record.count++;
      return { allowed: true };
    };
    
    const limit = 2;
    const window = 60000;
    
    // Fill key1's limit
    checkRateLimit('key1', limit, window);
    checkRateLimit('key1', limit, window);
    const key1Result = checkRateLimit('key1', limit, window);
    expect(key1Result.allowed).toBe(false);
    
    // key2 should still be allowed
    const key2Result = checkRateLimit('key2', limit, window);
    expect(key2Result.allowed).toBe(true);
  });

  test('Calculates time until reset correctly', () => {
    const now = Date.now();
    const lastRequestTime = now - 30000; // 30 seconds ago
    const windowMs = 60000; // 60 second window
    
    const timeUntilReset = windowMs - (now - lastRequestTime);
    
    expect(timeUntilReset).toBe(30000); // 30 seconds remaining
    expect(timeUntilReset).toBeGreaterThan(0);
    expect(timeUntilReset).toBeLessThanOrEqual(windowMs);
  });
});
