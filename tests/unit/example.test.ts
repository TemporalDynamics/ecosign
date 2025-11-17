/**
 * Unit tests example
 *
 * Tests unitarios para funciones individuales y lógica de negocio
 */
import { test, expect } from 'vitest';

// Ejemplo de test unitario
test('should add two numbers correctly', () => {
  const add = (a: number, b: number): number => a + b;
  expect(add(2, 3)).toBe(5);
  expect(add(-1, 1)).toBe(0);
  expect(add(0, 0)).toBe(0);
});

test('should handle edge cases for addition', () => {
  const add = (a: number, b: number): number => a + b;
  expect(add(Number.MAX_SAFE_INTEGER, 0)).toBe(Number.MAX_SAFE_INTEGER);
  expect(add(Number.MIN_SAFE_INTEGER, 0)).toBe(Number.MIN_SAFE_INTEGER);
});