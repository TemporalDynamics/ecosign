// tests/unit/decisionLogic.test.ts
import { assertEquals } from "https://deno.land/std@0.173.0/testing/asserts.ts";

// Importar funciones de decision engine canónico
import { 
  shouldEnqueueRunTsa,
  shouldEnqueuePolygon, 
  shouldEnqueueBitcoin,
  shouldEnqueueArtifact
} from "../../supabase/functions/_shared/decisionEngineCanonical.ts";

Deno.test("Decision Logic - Canonical Authority Functions", async (t) => {
  await t.step("shouldEnqueueRunTsa - should return true when protection requested but no TSA yet", () => {
    const events = [
      { kind: 'document.protected.requested', at: '2026-01-27T10:00:00.000Z' }
    ];
    
    const result = shouldEnqueueRunTsa(events);
    assertEquals(result, true, "Should enqueue TSA when requested but not confirmed");
  });

  await t.step("shouldEnqueueRunTsa - should return false when TSA already confirmed", () => {
    const events = [
      { kind: 'document.protected.requested', at: '2026-01-27T10:00:00.000Z' },
      { kind: 'tsa.confirmed', at: '2026-01-27T10:01:00.000Z' }
    ];
    
    const result = shouldEnqueueRunTsa(events);
    assertEquals(result, false, "Should not enqueue TSA when already confirmed");
  });

  await t.step("shouldEnqueuePolygon - should return true when TSA confirmed, polygon requested, no polygon yet", () => {
    const events = [
      { kind: 'document.protected.requested', at: '2026-01-27T10:00:00.000Z' },
      { kind: 'tsa.confirmed', at: '2026-01-27T10:01:00.000Z' }
    ];
    const protection = ['polygon'];
    
    const result = shouldEnqueuePolygon(events, protection);
    assertEquals(result, true, "Should enqueue polygon when TSA confirmed, polygon requested, no polygon yet");
  });

  await t.step("shouldEnqueuePolygon - should return false when polygon already submitted", () => {
    const events = [
      { kind: 'document.protected.requested', at: '2026-01-27T10:00:00.000Z' },
      { kind: 'tsa.confirmed', at: '2026-01-27T10:01:00.000Z' },
      { 
        kind: 'anchor.submitted', 
        at: '2026-01-27T10:02:00.000Z',
        payload: { network: 'polygon' }
      }
    ];
    const protection = ['polygon'];
    
    const result = shouldEnqueuePolygon(events, protection);
    assertEquals(result, false, "Should not enqueue polygon when already submitted");
  });

  await t.step("shouldEnqueueBitcoin - should return true when TSA confirmed, bitcoin requested, no bitcoin yet", () => {
    const events = [
      { kind: 'document.protected.requested', at: '2026-01-27T10:00:00.000Z' },
      { kind: 'tsa.confirmed', at: '2026-01-27T10:01:00.000Z' }
    ];
    const protection = ['bitcoin'];
    
    const result = shouldEnqueueBitcoin(events, protection);
    assertEquals(result, true, "Should enqueue bitcoin when TSA confirmed, bitcoin requested, no bitcoin yet");
  });

  await t.step("shouldEnqueueArtifact - should return true when all protections confirmed", () => {
    const events = [
      { kind: 'document.protected.requested', at: '2026-01-27T10:00:00.000Z' },
      { kind: 'tsa.confirmed', at: '2026-01-27T10:01:00.000Z' },
      { 
        kind: 'anchor.confirmed', 
        at: '2026-01-27T10:02:00.000Z',
        payload: { network: 'polygon', confirmed_at: '2026-01-27T10:02:00.000Z' }
      },
      { 
        kind: 'anchor.confirmed', 
        at: '2026-01-27T10:03:00.000Z',
        payload: { network: 'bitcoin', confirmed_at: '2026-01-27T10:03:00.000Z' }
      }
    ];
    const protection = ['tsa', 'polygon', 'bitcoin'];
    
    const result = shouldEnqueueArtifact(events, protection);
    assertEquals(result, true, "Should enqueue artifact when all protections confirmed");
  });

  await t.step("shouldEnqueueArtifact - should return false when not all protections confirmed", () => {
    const events = [
      { kind: 'document.protected.requested', at: '2026-01-27T10:00:00.000Z' },
      { kind: 'tsa.confirmed', at: '2026-01-27T10:01:00.000Z' },
      { 
        kind: 'anchor.confirmed', 
        at: '2026-01-27T10:02:00.000Z',
        payload: { network: 'polygon', confirmed_at: '2026-01-27T10:02:00.000Z' }
      }
      // Falta bitcoin
    ];
    const protection = ['tsa', 'polygon', 'bitcoin'];
    
    const result = shouldEnqueueArtifact(events, protection);
    assertEquals(result, false, "Should not enqueue artifact when not all protections confirmed");
  });
});

console.log("✅ Tests de lógica de decisiones canónicas completados");