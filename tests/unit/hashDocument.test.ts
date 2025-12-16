/**
 * Unit tests for hashDocument utility
 *
 * Tests pure functions for hash validation and formatting
 */
import { describe, test, expect } from 'vitest';
import {
  formatHashForDisplay,
  isValidSHA256,
} from '../../client/src/utils/hashDocument';

describe('formatHashForDisplay', () => {
  test('should format valid hash with ellipsis', () => {
    const hash = 'a'.repeat(64); // 64 chars SHA-256
    const result = formatHashForDisplay(hash);
    expect(result).toBe('a'.repeat(16) + '...');
    expect(result.length).toBe(19); // 16 + '...'
  });

  test('should return short hashes as-is', () => {
    const shortHash = 'abc123';
    expect(formatHashForDisplay(shortHash)).toBe('abc123');
  });

  test('should handle empty string', () => {
    expect(formatHashForDisplay('')).toBe('');
  });

  test('should handle exactly 16 chars', () => {
    const hash16 = '1234567890abcdef';
    // Function checks length < 16, so 16 chars will get ellipsis
    expect(formatHashForDisplay(hash16)).toBe('1234567890abcdef...');
  });

  test('should format 17+ chars with ellipsis', () => {
    const hash17 = '1234567890abcdef0';
    expect(formatHashForDisplay(hash17)).toBe('1234567890abcdef...');
  });
});

describe('isValidSHA256', () => {
  test('should validate correct SHA-256 hash', () => {
    const validHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    expect(isValidSHA256(validHash)).toBe(true);
  });

  test('should accept uppercase hex', () => {
    const upperHash = 'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855';
    expect(isValidSHA256(upperHash)).toBe(true);
  });

  test('should accept mixed case', () => {
    const mixedHash = 'E3b0C44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852B855';
    expect(isValidSHA256(mixedHash)).toBe(true);
  });

  test('should reject hash too short', () => {
    const shortHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85';
    expect(isValidSHA256(shortHash)).toBe(false);
  });

  test('should reject hash too long', () => {
    const longHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8550';
    expect(isValidSHA256(longHash)).toBe(false);
  });

  test('should reject invalid characters', () => {
    const invalidHash = 'g3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    expect(isValidSHA256(invalidHash)).toBe(false);
  });

  test('should reject special characters', () => {
    const specialHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85!';
    expect(isValidSHA256(specialHash)).toBe(false);
  });

  test('should reject empty string', () => {
    expect(isValidSHA256('')).toBe(false);
  });

  test('should reject spaces', () => {
    const hashWithSpace = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b 55';
    expect(isValidSHA256(hashWithSpace)).toBe(false);
  });

  test('should reject non-hex characters', () => {
    expect(isValidSHA256('z'.repeat(64))).toBe(false);
  });
});
