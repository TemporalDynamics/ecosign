import { describe, expect, test } from 'vitest';

// Importar la función de feature flags
import { 
  isDecisionUnderCanonicalAuthority, 
  isDecisionInShadowMode 
} from "../supabase/functions/_shared/featureFlags.ts";

describe('Feature Flags', () => {
  test('Decision Under Canonical Authority: false when flag is not set', () => {
    const originalValue = process.env.ENABLE_D1_CANONICAL;
    delete process.env.ENABLE_D1_CANONICAL;

    try {
      const result = isDecisionUnderCanonicalAuthority('D1_RUN_TSA_ENABLED');
      expect(result).toBe(false);
    } finally {
      if (originalValue !== undefined) process.env.ENABLE_D1_CANONICAL = originalValue;
      else delete process.env.ENABLE_D1_CANONICAL;
    }
  });

  test("Decision Under Canonical Authority: false when flag is set to 'false'", () => {
    const originalValue = process.env.ENABLE_D1_CANONICAL;
    try {
      process.env.ENABLE_D1_CANONICAL = 'false';
      const result = isDecisionUnderCanonicalAuthority('D1_RUN_TSA_ENABLED');
      expect(result).toBe(false);
    } finally {
      if (originalValue !== undefined) process.env.ENABLE_D1_CANONICAL = originalValue;
      else delete process.env.ENABLE_D1_CANONICAL;
    }
  });

  test("Decision Under Canonical Authority: true when flag is set to 'true'", () => {
    const originalValue = process.env.ENABLE_D1_CANONICAL;
    try {
      process.env.ENABLE_D1_CANONICAL = 'true';
      const result = isDecisionUnderCanonicalAuthority('D1_RUN_TSA_ENABLED');
      expect(result).toBe(true);
    } finally {
      if (originalValue !== undefined) process.env.ENABLE_D1_CANONICAL = originalValue;
      else delete process.env.ENABLE_D1_CANONICAL;
    }
  });

  test('handles different flag types correctly', () => {
    const originalD3 = process.env.ENABLE_D3_CANONICAL;
    const originalD4 = process.env.ENABLE_D4_CANONICAL;
    const originalD5 = process.env.ENABLE_D5_CANONICAL;

    try {
      process.env.ENABLE_D3_CANONICAL = 'true';
      expect(isDecisionUnderCanonicalAuthority('D3_BUILD_ARTIFACT_ENABLED')).toBe(true);

      process.env.ENABLE_D4_CANONICAL = 'true';
      expect(isDecisionUnderCanonicalAuthority('D4_ANCHORS_ENABLED')).toBe(true);

      process.env.ENABLE_D5_CANONICAL = 'true';
      expect(isDecisionUnderCanonicalAuthority('D5_NOTIFICATIONS_ENABLED')).toBe(true);
    } finally {
      if (originalD3 !== undefined) process.env.ENABLE_D3_CANONICAL = originalD3;
      else delete process.env.ENABLE_D3_CANONICAL;

      if (originalD4 !== undefined) process.env.ENABLE_D4_CANONICAL = originalD4;
      else delete process.env.ENABLE_D4_CANONICAL;

      if (originalD5 !== undefined) process.env.ENABLE_D5_CANONICAL = originalD5;
      else delete process.env.ENABLE_D5_CANONICAL;
    }
  });

  test('Decision In Shadow Mode: true when flag is not set', () => {
    const originalValue = process.env.ENABLE_D1_CANONICAL;
    delete process.env.ENABLE_D1_CANONICAL;
    try {
      const result = isDecisionInShadowMode('D1_RUN_TSA_ENABLED');
      expect(result).toBe(true);
    } finally {
      if (originalValue !== undefined) process.env.ENABLE_D1_CANONICAL = originalValue;
      else delete process.env.ENABLE_D1_CANONICAL;
    }
  });

  test("Decision In Shadow Mode: true when flag is set to 'false'", () => {
    const originalValue = process.env.ENABLE_D1_CANONICAL;
    try {
      process.env.ENABLE_D1_CANONICAL = 'false';
      const result = isDecisionInShadowMode('D1_RUN_TSA_ENABLED');
      expect(result).toBe(true);
    } finally {
      if (originalValue !== undefined) process.env.ENABLE_D1_CANONICAL = originalValue;
      else delete process.env.ENABLE_D1_CANONICAL;
    }
  });

  test("Decision In Shadow Mode: false when flag is set to 'true'", () => {
    const originalValue = process.env.ENABLE_D1_CANONICAL;
    try {
      process.env.ENABLE_D1_CANONICAL = 'true';
      const result = isDecisionInShadowMode('D1_RUN_TSA_ENABLED');
      expect(result).toBe(false);
    } finally {
      if (originalValue !== undefined) process.env.ENABLE_D1_CANONICAL = originalValue;
      else delete process.env.ENABLE_D1_CANONICAL;
    }
  });
});
