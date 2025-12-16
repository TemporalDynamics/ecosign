/**
 * Unit tests for eventLogger utility
 *
 * Tests pure functions and constants
 */
import { describe, test, expect } from 'vitest';
import { EVENT_TYPES } from '../../client/src/utils/eventLogger.js';

describe('EVENT_TYPES constants', () => {
  test('should have all required event types', () => {
    expect(EVENT_TYPES).toHaveProperty('CREATED');
    expect(EVENT_TYPES).toHaveProperty('SENT');
    expect(EVENT_TYPES).toHaveProperty('OPENED');
    expect(EVENT_TYPES).toHaveProperty('IDENTIFIED');
    expect(EVENT_TYPES).toHaveProperty('SIGNED');
    expect(EVENT_TYPES).toHaveProperty('ANCHORED_POLYGON');
    expect(EVENT_TYPES).toHaveProperty('ANCHORED_BITCOIN');
    expect(EVENT_TYPES).toHaveProperty('VERIFIED');
    expect(EVENT_TYPES).toHaveProperty('DOWNLOADED');
    expect(EVENT_TYPES).toHaveProperty('EXPIRED');
  });

  test('should have correct values for event types', () => {
    expect(EVENT_TYPES.CREATED).toBe('created');
    expect(EVENT_TYPES.SENT).toBe('sent');
    expect(EVENT_TYPES.OPENED).toBe('opened');
    expect(EVENT_TYPES.IDENTIFIED).toBe('identified');
    expect(EVENT_TYPES.SIGNED).toBe('signed');
    expect(EVENT_TYPES.ANCHORED_POLYGON).toBe('anchored_polygon');
    expect(EVENT_TYPES.ANCHORED_BITCOIN).toBe('anchored_bitcoin');
    expect(EVENT_TYPES.VERIFIED).toBe('verified');
    expect(EVENT_TYPES.DOWNLOADED).toBe('downloaded');
    expect(EVENT_TYPES.EXPIRED).toBe('expired');
  });

  test('should have exactly 10 event types', () => {
    const keys = Object.keys(EVENT_TYPES);
    expect(keys).toHaveLength(10);
  });

  test('should have unique values', () => {
    const values = Object.values(EVENT_TYPES);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  test('all event type values should be lowercase snake_case', () => {
    const values = Object.values(EVENT_TYPES);
    values.forEach((value) => {
      expect(value).toMatch(/^[a-z_]+$/);
    });
  });
});

describe('EventLogger validation (pure logic)', () => {
  test('should validate event type against EVENT_TYPES', () => {
    const validTypes = Object.values(EVENT_TYPES);
    
    validTypes.forEach((type) => {
      expect(validTypes.includes(type)).toBe(true);
    });
  });

  test('should reject invalid event types', () => {
    const invalidTypes = ['INVALID', 'created_doc', 'SENT_EMAIL', '', null];
    const validTypes = Object.values(EVENT_TYPES);
    
    invalidTypes.forEach((type) => {
      expect(validTypes.includes(type as any)).toBe(false);
    });
  });
});
