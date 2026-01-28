// tests/unit/decisionAuthority.test.ts
import { assertEquals } from "https://deno.land/std@0.173.0/testing/asserts.ts";
import { stub } from "https://deno.land/std@0.173.0/testing/mock.ts";

// Importar funciones de decision authority
import { 
  isDecisionUnderCanonicalAuthority,
  isDecisionInShadowMode 
} from "../../supabase/functions/_shared/featureFlags.ts";

Deno.test("DecisionAuthority - Feature Flags", async (t) => {
  await t.step("should return false when flag not set (shadow mode)", () => {
    // Simular que no hay variable de entorno
    const originalValue = Deno.env.get('ENABLE_D1_CANONICAL');
    Deno.env.delete('ENABLE_D1_CANONICAL');
    
    try {
      const result = isDecisionUnderCanonicalAuthority('D1_RUN_TSA_ENABLED');
      assertEquals(result, false);
    } finally {
      // Restaurar valor original
      if (originalValue) {
        Deno.env.set('ENABLE_D1_CANONICAL', originalValue);
      }
    }
  });

  await t.step("should return true when flag is set to true", () => {
    const originalValue = Deno.env.get('ENABLE_D1_CANONICAL');
    
    try {
      Deno.env.set('ENABLE_D1_CANONICAL', 'true');
      const result = isDecisionUnderCanonicalAuthority('D1_RUN_TSA_ENABLED');
      assertEquals(result, true);
    } finally {
      // Restaurar valor original
      if (originalValue) {
        Deno.env.set('ENABLE_D1_CANONICAL', originalValue);
      } else {
        Deno.env.delete('ENABLE_D1_CANONICAL');
      }
    }
  });

  await t.step("should return false when flag is set to false", () => {
    const originalValue = Deno.env.get('ENABLE_D1_CANONICAL');
    
    try {
      Deno.env.set('ENABLE_D1_CANONICAL', 'false');
      const result = isDecisionUnderCanonicalAuthority('D1_RUN_TSA_ENABLED');
      assertEquals(result, false);
    } finally {
      // Restaurar valor original
      if (originalValue) {
        Deno.env.set('ENABLE_D1_CANONICAL', originalValue);
      } else {
        Deno.env.delete('ENABLE_D1_CANONICAL');
      }
    }
  });

  await t.step("should handle different decision types correctly", () => {
    const originalD3 = Deno.env.get('ENABLE_D3_CANONICAL');
    const originalD4 = Deno.env.get('ENABLE_D4_CANONICAL');
    const originalD5 = Deno.env.get('ENABLE_D5_CANONICAL');
    
    try {
      // Probar D3
      Deno.env.set('ENABLE_D3_CANONICAL', 'true');
      assertEquals(isDecisionUnderCanonicalAuthority('D3_BUILD_ARTIFACT_ENABLED'), true);
      
      // Probar D4
      Deno.env.set('ENABLE_D4_CANONICAL', 'true');
      assertEquals(isDecisionUnderCanonicalAuthority('D4_ANCHORS_ENABLED'), true);
      
      // Probar D5
      Deno.env.set('ENABLE_D5_CANONICAL', 'true');
      assertEquals(isDecisionUnderCanonicalAuthority('D5_NOTIFICATIONS_ENABLED'), true);
      
    } finally {
      // Restaurar valores originales
      if (originalD3) Deno.env.set('ENABLE_D3_CANONICAL', originalD3);
      else Deno.env.delete('ENABLE_D3_CANONICAL');
      
      if (originalD4) Deno.env.set('ENABLE_D4_CANONICAL', originalD4);
      else Deno.env.delete('ENABLE_D4_CANONICAL');
      
      if (originalD5) Deno.env.set('ENABLE_D5_CANONICAL', originalD5);
      else Deno.env.delete('ENABLE_D5_CANONICAL');
    }
  });

  await t.step("should handle shadow mode correctly", () => {
    const originalValue = Deno.env.get('ENABLE_D1_CANONICAL');
    
    try {
      // Con flag desactivado, debería estar en shadow mode
      Deno.env.set('ENABLE_D1_CANONICAL', 'false');
      assertEquals(isDecisionInShadowMode('D1_RUN_TSA_ENABLED'), true);
      
      // Con flag activado, NO debería estar en shadow mode
      Deno.env.set('ENABLE_D1_CANONICAL', 'true');
      assertEquals(isDecisionInShadowMode('D1_RUN_TSA_ENABLED'), false);
    } finally {
      // Restaurar valor original
      if (originalValue) {
        Deno.env.set('ENABLE_D1_CANONICAL', originalValue);
      } else {
        Deno.env.delete('ENABLE_D1_CANONICAL');
      }
    }
  });
});

console.log("✅ Tests de DecisionAuthority completados");