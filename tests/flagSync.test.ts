// tests/flagSync.test.ts
import { assertEquals, assert } from "https://deno.land/std@0.173.0/testing/asserts.ts";

// Mock de un cliente de supabase para pruebas
const mockSupabase = {
  from: (table: string) => {
    return {
      upsert: (data: any, options: any) => {
        // Simular éxito
        return Promise.resolve({ error: null });
      },
      select: (columns: string) => {
        return {
          eq: (col: string, val: any) => {
            return Promise.resolve({ data: [], error: null });
          }
        };
      }
    };
  }
};

// Importar la función de sincronización
import { syncFlagsToDatabase } from "../supabase/functions/_shared/flagSync.ts";

Deno.test("Flag Sync - Sincronización de flags", async (t) => {
  await t.step("should sync all flags to database", async () => {
    // Establecer valores de prueba
    const originalD1 = Deno.env.get('ENABLE_D1_CANONICAL');
    const originalD3 = Deno.env.get('ENABLE_D3_CANONICAL');
    const originalD4 = Deno.env.get('ENABLE_D4_CANONICAL');
    const originalD5 = Deno.env.get('ENABLE_D5_CANONICAL');
    
    try {
      // Establecer valores de prueba
      Deno.env.set('ENABLE_D1_CANONICAL', 'true');
      Deno.env.set('ENABLE_D3_CANONICAL', 'false');
      Deno.env.set('ENABLE_D4_CANONICAL', 'true');
      Deno.env.set('ENABLE_D5_CANONICAL', 'false');
      
      // Mock de supabase
      const mockUpsertCalls: any[] = [];
      const mockSupabaseWithTracking = {
        from: (table: string) => {
          return {
            upsert: (data: any, options: any) => {
              mockUpsertCalls.push({ table, data, options });
              return Promise.resolve({ error: null });
            }
          };
        }
      };
      
      // Ejecutar la sincronización
      await syncFlagsToDatabase(mockSupabaseWithTracking as any);
      
      // Verificar que se llamó upsert con los datos correctos
      assertEquals(mockUpsertCalls.length, 4);
      
      const flagUpdates = mockUpsertCalls.map(call => ({
        flag_name: call.data.flag_name,
        enabled: call.data.enabled
      }));
      
      // Verificar que se actualizaron los flags correctos
      const d1Update = flagUpdates.find(f => f.flag_name === 'D1_RUN_TSA_ENABLED');
      const d3Update = flagUpdates.find(f => f.flag_name === 'D3_BUILD_ARTIFACT_ENABLED');
      const d4Update = flagUpdates.find(f => f.flag_name === 'D4_ANCHORS_ENABLED');
      const d5Update = flagUpdates.find(f => f.flag_name === 'D5_NOTIFICATIONS_ENABLED');
      
      assert(d1Update, 'D1 flag update should exist');
      assert(d3Update, 'D3 flag update should exist');
      assert(d4Update, 'D4 flag update should exist');
      assert(d5Update, 'D5 flag update should exist');
      
      assertEquals(d1Update.enabled, true);
      assertEquals(d3Update.enabled, false);
      assertEquals(d4Update.enabled, true);
      assertEquals(d5Update.enabled, false);
      
    } finally {
      // Restaurar valores originales
      if (originalD1) Deno.env.set('ENABLE_D1_CANONICAL', originalD1);
      else Deno.env.delete('ENABLE_D1_CANONICAL');

      if (originalD3) Deno.env.set('ENABLE_D3_CANONICAL', originalD3);
      else Deno.env.delete('ENABLE_D3_CANONICAL');

      if (originalD4) Deno.env.set('ENABLE_D4_CANONICAL', originalD4);
      else Deno.env.delete('ENABLE_D4_CANONICAL');

      if (originalD5) Deno.env.set('ENABLE_D5_CANONICAL', originalD5);
      else Deno.env.delete('ENABLE_D5_CANONICAL');
    }
  });

  await t.step("should handle missing environment variables gracefully", async () => {
    // Limpiar todas las variables
    const originalD1 = Deno.env.get('ENABLE_D1_CANONICAL');
    const originalD3 = Deno.env.get('ENABLE_D3_CANONICAL');
    const originalD4 = Deno.env.get('ENABLE_D4_CANONICAL');
    const originalD5 = Deno.env.get('ENABLE_D5_CANONICAL');
    
    try {
      Deno.env.delete('ENABLE_D1_CANONICAL');
      Deno.env.delete('ENABLE_D3_CANONICAL');
      Deno.env.delete('ENABLE_D4_CANONICAL');
      Deno.env.delete('ENABLE_D5_CANONICAL');
      
      // Mock de supabase
      const mockUpsertCalls: any[] = [];
      const mockSupabaseWithTracking = {
        from: (table: string) => {
          return {
            upsert: (data: any, options: any) => {
              mockUpsertCalls.push({ table, data, options });
              return Promise.resolve({ error: null });
            }
          };
        }
      };
      
      // Ejecutar la sincronización
      await syncFlagsToDatabase(mockSupabaseWithTracking as any);
      
      // Verificar que se llamó upsert con valores por defecto (false)
      assertEquals(mockUpsertCalls.length, 4);
      
      const flagUpdates = mockUpsertCalls.map(call => ({
        flag_name: call.data.flag_name,
        enabled: call.data.enabled
      }));
      
      flagUpdates.forEach(update => {
        assertEquals(update.enabled, false, `Flag ${update.flag_name} should default to false when env var is missing`);
      });
      
    } finally {
      // Restaurar valores originales
      if (originalD1) Deno.env.set('ENABLE_D1_CANONICAL', originalD1);
      if (originalD2) Deno.env.set('ENABLE_D2_CANONICAL', originalD2);
      if (originalD3) Deno.env.set('ENABLE_D3_CANONICAL', originalD3);
      if (originalD4) Deno.env.set('ENABLE_D4_CANONICAL', originalD4);
      if (originalD5) Deno.env.set('ENABLE_D5_CANONICAL', originalD5);
    }
  });
});

console.log("✅ Tests de sincronización de flags completados");