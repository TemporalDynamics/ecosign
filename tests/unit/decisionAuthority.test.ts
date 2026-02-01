import { describe, expect, test } from 'vitest';

// Importar funciones de decision authority
import { 
  isDecisionUnderCanonicalAuthority,
  isDecisionInShadowMode 
} from "../../supabase/functions/_shared/featureFlags.ts";

describe('DecisionAuthority - Feature Flags', () => {
  test('returns false when flag not set (shadow mode)', () => {
    // Simular que no hay variable de entorno
    const originalValue = process.env.ENABLE_D1_CANONICAL;
    delete process.env.ENABLE_D1_CANONICAL;
    
    try {
      const result = isDecisionUnderCanonicalAuthority('D1_RUN_TSA_ENABLED');
      expect(result).toBe(false);
    } finally {
      // Restaurar valor original
      if (originalValue) {
        process.env.ENABLE_D1_CANONICAL = originalValue;
      } else {
        delete process.env.ENABLE_D1_CANONICAL;
      }
    }
  });

  test('returns true when flag is set to true', () => {
    const originalValue = process.env.ENABLE_D1_CANONICAL;
    
    try {
      process.env.ENABLE_D1_CANONICAL = 'true';
      const result = isDecisionUnderCanonicalAuthority('D1_RUN_TSA_ENABLED');
      expect(result).toBe(true);
    } finally {
      // Restaurar valor original
      if (originalValue) {
        process.env.ENABLE_D1_CANONICAL = originalValue;
      } else {
        delete process.env.ENABLE_D1_CANONICAL;
      }
    }
  });

  test('returns false when flag is set to false', () => {
    const originalValue = process.env.ENABLE_D1_CANONICAL;
    
    try {
      process.env.ENABLE_D1_CANONICAL = 'false';
      const result = isDecisionUnderCanonicalAuthority('D1_RUN_TSA_ENABLED');
      expect(result).toBe(false);
    } finally {
      // Restaurar valor original
      if (originalValue) {
        process.env.ENABLE_D1_CANONICAL = originalValue;
      } else {
        delete process.env.ENABLE_D1_CANONICAL;
      }
    }
  });

  test('handles different decision types correctly', () => {
    const originalD3 = process.env.ENABLE_D3_CANONICAL;
    const originalD4 = process.env.ENABLE_D4_CANONICAL;
    const originalD5 = process.env.ENABLE_D5_CANONICAL;
    
    try {
      // Probar D3
      process.env.ENABLE_D3_CANONICAL = 'true';
      expect(isDecisionUnderCanonicalAuthority('D3_BUILD_ARTIFACT_ENABLED')).toBe(true);
      
      // Probar D4
      process.env.ENABLE_D4_CANONICAL = 'true';
      expect(isDecisionUnderCanonicalAuthority('D4_ANCHORS_ENABLED')).toBe(true);
      
      // Probar D5
      process.env.ENABLE_D5_CANONICAL = 'true';
      expect(isDecisionUnderCanonicalAuthority('D5_NOTIFICATIONS_ENABLED')).toBe(true);
      
    } finally {
      // Restaurar valores originales
      if (originalD3) process.env.ENABLE_D3_CANONICAL = originalD3;
      else delete process.env.ENABLE_D3_CANONICAL;
      
      if (originalD4) process.env.ENABLE_D4_CANONICAL = originalD4;
      else delete process.env.ENABLE_D4_CANONICAL;
      
      if (originalD5) process.env.ENABLE_D5_CANONICAL = originalD5;
      else delete process.env.ENABLE_D5_CANONICAL;
    }
  });

  test('handles shadow mode correctly', () => {
    const originalValue = process.env.ENABLE_D1_CANONICAL;
    
    try {
      // Con flag desactivado, debería estar en shadow mode
      process.env.ENABLE_D1_CANONICAL = 'false';
      expect(isDecisionInShadowMode('D1_RUN_TSA_ENABLED')).toBe(true);
      
      // Con flag activado, NO debería estar en shadow mode
      process.env.ENABLE_D1_CANONICAL = 'true';
      expect(isDecisionInShadowMode('D1_RUN_TSA_ENABLED')).toBe(false);
    } finally {
      // Restaurar valor original
      if (originalValue) {
        process.env.ENABLE_D1_CANONICAL = originalValue;
      } else {
        delete process.env.ENABLE_D1_CANONICAL;
      }
    }
  });
});
