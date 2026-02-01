import { describe, expect, test } from 'vitest';

// Importar la función de sincronización
import { syncFlagsToDatabase } from "../supabase/functions/_shared/flagSync.ts";

describe('Flag Sync - Sincronización de flags', () => {
  test('syncs all flags to database', async () => {
    const originalD1 = process.env.ENABLE_D1_CANONICAL;
    const originalD3 = process.env.ENABLE_D3_CANONICAL;
    const originalD4 = process.env.ENABLE_D4_CANONICAL;
    const originalD5 = process.env.ENABLE_D5_CANONICAL;

    try {
      process.env.ENABLE_D1_CANONICAL = 'true';
      process.env.ENABLE_D3_CANONICAL = 'false';
      process.env.ENABLE_D4_CANONICAL = 'true';
      process.env.ENABLE_D5_CANONICAL = 'false';

      const mockUpsertCalls: any[] = [];
      const mockSupabaseWithTracking = {
        from: (table: string) => ({
          upsert: (data: any, options: any) => {
            mockUpsertCalls.push({ table, data, options });
            return Promise.resolve({ error: null });
          },
        }),
      };

      await syncFlagsToDatabase(mockSupabaseWithTracking as any);

      expect(mockUpsertCalls).toHaveLength(4);

      const flagUpdates = mockUpsertCalls.map(call => ({
        flag_name: call.data.flag_name,
        enabled: call.data.enabled,
      }));

      const d1Update = flagUpdates.find(f => f.flag_name === 'D1_RUN_TSA_ENABLED');
      const d3Update = flagUpdates.find(f => f.flag_name === 'D3_BUILD_ARTIFACT_ENABLED');
      const d4Update = flagUpdates.find(f => f.flag_name === 'D4_ANCHORS_ENABLED');
      const d5Update = flagUpdates.find(f => f.flag_name === 'D5_NOTIFICATIONS_ENABLED');

      expect(d1Update).toBeTruthy();
      expect(d3Update).toBeTruthy();
      expect(d4Update).toBeTruthy();
      expect(d5Update).toBeTruthy();

      expect(d1Update.enabled).toBe(true);
      expect(d3Update.enabled).toBe(false);
      expect(d4Update.enabled).toBe(true);
      expect(d5Update.enabled).toBe(false);
    } finally {
      if (originalD1 !== undefined) process.env.ENABLE_D1_CANONICAL = originalD1;
      else delete process.env.ENABLE_D1_CANONICAL;

      if (originalD3 !== undefined) process.env.ENABLE_D3_CANONICAL = originalD3;
      else delete process.env.ENABLE_D3_CANONICAL;

      if (originalD4 !== undefined) process.env.ENABLE_D4_CANONICAL = originalD4;
      else delete process.env.ENABLE_D4_CANONICAL;

      if (originalD5 !== undefined) process.env.ENABLE_D5_CANONICAL = originalD5;
      else delete process.env.ENABLE_D5_CANONICAL;
    }
  });

  test('handles missing environment variables gracefully', async () => {
    const originalD1 = process.env.ENABLE_D1_CANONICAL;
    const originalD3 = process.env.ENABLE_D3_CANONICAL;
    const originalD4 = process.env.ENABLE_D4_CANONICAL;
    const originalD5 = process.env.ENABLE_D5_CANONICAL;

    try {
      delete process.env.ENABLE_D1_CANONICAL;
      delete process.env.ENABLE_D3_CANONICAL;
      delete process.env.ENABLE_D4_CANONICAL;
      delete process.env.ENABLE_D5_CANONICAL;

      const mockUpsertCalls: any[] = [];
      const mockSupabaseWithTracking = {
        from: (table: string) => ({
          upsert: (data: any, options: any) => {
            mockUpsertCalls.push({ table, data, options });
            return Promise.resolve({ error: null });
          },
        }),
      };

      await syncFlagsToDatabase(mockSupabaseWithTracking as any);

      expect(mockUpsertCalls).toHaveLength(4);

      const flagUpdates = mockUpsertCalls.map(call => ({
        flag_name: call.data.flag_name,
        enabled: call.data.enabled,
      }));

      for (const update of flagUpdates) {
        expect(update.enabled).toBe(false);
      }
    } finally {
      if (originalD1 !== undefined) process.env.ENABLE_D1_CANONICAL = originalD1;
      else delete process.env.ENABLE_D1_CANONICAL;

      if (originalD3 !== undefined) process.env.ENABLE_D3_CANONICAL = originalD3;
      else delete process.env.ENABLE_D3_CANONICAL;

      if (originalD4 !== undefined) process.env.ENABLE_D4_CANONICAL = originalD4;
      else delete process.env.ENABLE_D4_CANONICAL;

      if (originalD5 !== undefined) process.env.ENABLE_D5_CANONICAL = originalD5;
      else delete process.env.ENABLE_D5_CANONICAL;
    }
  });
});
