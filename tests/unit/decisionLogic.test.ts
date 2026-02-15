import { describe, expect, test } from 'vitest';

// Importar funciones de decision engine canónico
import { 
  shouldEnqueueRunTsa,
  shouldEnqueuePolygon, 
  shouldEnqueueBitcoin,
  shouldEnqueueArtifact
} from "../../supabase/functions/_shared/decisionEngineCanonical.ts";

describe('Decision Logic - Canonical Authority Functions', () => {
  test('shouldEnqueueRunTsa - true when protection requested but no TSA yet', () => {
    const events = [
      { kind: 'document.protected.requested', at: '2026-01-27T10:00:00.000Z' }
    ];
    
    const result = shouldEnqueueRunTsa(events);
    expect(result).toBe(true);
  });

  test('shouldEnqueueRunTsa - false when TSA already confirmed', () => {
    const events = [
      { kind: 'document.protected.requested', at: '2026-01-27T10:00:00.000Z' },
      { kind: 'tsa.confirmed', at: '2026-01-27T10:01:00.000Z' }
    ];
    
    const result = shouldEnqueueRunTsa(events);
    expect(result).toBe(false);
  });

  test('shouldEnqueuePolygon - true when TSA confirmed, polygon requested, no polygon yet', () => {
    const events = [
      {
        kind: 'document.protected.requested',
        at: '2026-01-27T10:00:00.000Z',
        payload: { required_evidence: ['polygon'] },
      },
      { kind: 'tsa.confirmed', at: '2026-01-27T10:01:00.000Z' }
    ];
    
    const result = shouldEnqueuePolygon(events);
    expect(result).toBe(true);
  });

  test('shouldEnqueuePolygon - false when polygon already confirmed', () => {
    const events = [
      {
        kind: 'document.protected.requested',
        at: '2026-01-27T10:00:00.000Z',
        payload: { required_evidence: ['polygon'] },
      },
      { kind: 'tsa.confirmed', at: '2026-01-27T10:01:00.000Z' },
      { 
        kind: 'anchor.confirmed', 
        at: '2026-01-27T10:02:00.000Z',
        payload: { network: 'polygon', confirmed_at: '2026-01-27T10:02:00.000Z' }
      }
    ];
    
    const result = shouldEnqueuePolygon(events);
    expect(result).toBe(false);
  });

  test('shouldEnqueueBitcoin - true when TSA confirmed, bitcoin requested, no bitcoin yet', () => {
    const events = [
      {
        kind: 'document.protected.requested',
        at: '2026-01-27T10:00:00.000Z',
        payload: { required_evidence: ['bitcoin'] },
      },
      { kind: 'tsa.confirmed', at: '2026-01-27T10:01:00.000Z' }
    ];
    
    const result = shouldEnqueueBitcoin(events);
    expect(result).toBe(true);
  });

  test('shouldEnqueueArtifact - true when all protections confirmed', () => {
    const events = [
      {
        kind: 'document.protected.requested',
        at: '2026-01-27T10:00:00.000Z',
        payload: { required_evidence: ['tsa', 'polygon', 'bitcoin'] },
      },
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
    
    const result = shouldEnqueueArtifact(events);
    expect(result).toBe(true);
  });

  test('shouldEnqueueArtifact - false when not all protections confirmed', () => {
    const events = [
      {
        kind: 'document.protected.requested',
        at: '2026-01-27T10:00:00.000Z',
        payload: { required_evidence: ['tsa', 'polygon', 'bitcoin'] },
      },
      { kind: 'tsa.confirmed', at: '2026-01-27T10:01:00.000Z' },
      { 
        kind: 'anchor.confirmed', 
        at: '2026-01-27T10:02:00.000Z',
        payload: { network: 'polygon', confirmed_at: '2026-01-27T10:02:00.000Z' }
      }
      // Falta bitcoin
    ];
    
    const result = shouldEnqueueArtifact(events);
    expect(result).toBe(false);
  });
});
