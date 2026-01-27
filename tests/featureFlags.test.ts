// tests/featureFlags.test.ts
import { assertEquals } from "https://deno.land/std@0.173.0/testing/asserts.ts";

// Importar la función de feature flags
import { 
  isDecisionUnderCanonicalAuthority, 
  isDecisionInShadowMode 
} from "../supabase/functions/_shared/featureFlags.ts";

Deno.test("Feature Flags - Decision Under Canonical Authority", async (t) => {
  await t.step("should return false when flag is not set", () => {
    // Limpiar variable de entorno si existe
    const originalValue = Deno.env.get('ENABLE_D1_CANONICAL');
    Deno.env.delete('ENABLE_D1_CANONICAL');
    
    const result = isDecisionUnderCanonicalAuthority('D1_RUN_TSA_ENABLED');
    assertEquals(result, false);
    
    // Restaurar valor original si existía
    if (originalValue) {
      Deno.env.set('ENABLE_D1_CANONICAL', originalValue);
    }
  });

  await t.step("should return false when flag is set to 'false'", () => {
    const originalValue = Deno.env.get('ENABLE_D1_CANONICAL');
    Deno.env.set('ENABLE_D1_CANONICAL', 'false');
    
    const result = isDecisionUnderCanonicalAuthority('D1_RUN_TSA_ENABLED');
    assertEquals(result, false);
    
    // Restaurar valor original
    if (originalValue) {
      Deno.env.set('ENABLE_D1_CANONICAL', originalValue);
    } else {
      Deno.env.delete('ENABLE_D1_CANONICAL');
    }
  });

  await t.step("should return true when flag is set to 'true'", () => {
    const originalValue = Deno.env.get('ENABLE_D1_CANONICAL');
    Deno.env.set('ENABLE_D1_CANONICAL', 'true');
    
    const result = isDecisionUnderCanonicalAuthority('D1_RUN_TSA_ENABLED');
    assertEquals(result, true);
    
    // Restaurar valor original
    if (originalValue) {
      Deno.env.set('ENABLE_D1_CANONICAL', originalValue);
    } else {
      Deno.env.delete('ENABLE_D1_CANONICAL');
    }
  });

  await t.step("should handle different flag types correctly", () => {
    // Probar D3
    const originalD3 = Deno.env.get('ENABLE_D3_CANONICAL');
    Deno.env.set('ENABLE_D3_CANONICAL', 'true');
    assertEquals(isDecisionUnderCanonicalAuthority('D3_BUILD_ARTIFACT_ENABLED'), true);
    if (originalD3) {
      Deno.env.set('ENABLE_D3_CANONICAL', originalD3);
    } else {
      Deno.env.delete('ENABLE_D3_CANONICAL');
    }
    
    // Probar D4
    const originalD4 = Deno.env.get('ENABLE_D4_CANONICAL');
    Deno.env.set('ENABLE_D4_CANONICAL', 'true');
    assertEquals(isDecisionUnderCanonicalAuthority('D4_ANCHORS_ENABLED'), true);
    if (originalD4) {
      Deno.env.set('ENABLE_D4_CANONICAL', originalD4);
    } else {
      Deno.env.delete('ENABLE_D4_CANONICAL');
    }
    
    // Probar D5
    const originalD5 = Deno.env.get('ENABLE_D5_CANONICAL');
    Deno.env.set('ENABLE_D5_CANONICAL', 'true');
    assertEquals(isDecisionUnderCanonicalAuthority('D5_NOTIFICATIONS_ENABLED'), true);
    if (originalD5) {
      Deno.env.set('ENABLE_D5_CANONICAL', originalD5);
    } else {
      Deno.env.delete('ENABLE_D5_CANONICAL');
    }
  });
});

Deno.test("Feature Flags - Decision In Shadow Mode", async (t) => {
  await t.step("should return true when flag is not set (shadow mode)", () => {
    const originalValue = Deno.env.get('ENABLE_D1_CANONICAL');
    Deno.env.delete('ENABLE_D1_CANONICAL');
    
    const result = isDecisionInShadowMode('D1_RUN_TSA_ENABLED');
    assertEquals(result, true);
    
    if (originalValue) {
      Deno.env.set('ENABLE_D1_CANONICAL', originalValue);
    }
  });

  await t.step("should return true when flag is set to 'false' (shadow mode)", () => {
    const originalValue = Deno.env.get('ENABLE_D1_CANONICAL');
    Deno.env.set('ENABLE_D1_CANONICAL', 'false');
    
    const result = isDecisionInShadowMode('D1_RUN_TSA_ENABLED');
    assertEquals(result, true);
    
    if (originalValue) {
      Deno.env.set('ENABLE_D1_CANONICAL', originalValue);
    } else {
      Deno.env.delete('ENABLE_D1_CANONICAL');
    }
  });

  await t.step("should return false when flag is set to 'true' (not shadow)", () => {
    const originalValue = Deno.env.get('ENABLE_D1_CANONICAL');
    Deno.env.set('ENABLE_D1_CANONICAL', 'true');
    
    const result = isDecisionInShadowMode('D1_RUN_TSA_ENABLED');
    assertEquals(result, false);
    
    if (originalValue) {
      Deno.env.set('ENABLE_D1_CANONICAL', originalValue);
    } else {
      Deno.env.delete('ENABLE_D1_CANONICAL');
    }
  });
});

console.log("✅ Tests de feature flags completados");