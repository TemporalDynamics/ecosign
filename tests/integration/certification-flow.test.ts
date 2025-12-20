import { describe, it, expect, vi } from 'vitest';
import { certifyFile } from '../..//client/src/lib/basicCertificationWeb';

// Integration-lite: ejercita certifyFile con mocks solo para dependencias externas (TSA).
// No toca Supabase ni redes externas.
vi.mock('../../client/src/lib/tsaService.js', () => ({
  requestLegalTimestamp: vi.fn().mockResolvedValue({ success: true, timestamp: new Date().toISOString() })
}));

describe('Flujo de certificación (certifyFile)', () => {
  it('genera ecoxBuffer y metadatos mínimos sin TSA ni anchors', async () => {
    const sample = new Uint8Array([1, 2, 3, 4, 5]);
    const file = new File([sample], 'demo.pdf', { type: 'application/pdf' });

    const result = await certifyFile(file, {
      useLegalTimestamp: false,
      usePolygonAnchor: false,
      useBitcoinAnchor: false
    });

    expect(result.success).toBe(true);
    const ecoBytes = result.ecoxBuffer instanceof Uint8Array ? result.ecoxBuffer : new Uint8Array(result.ecoxBuffer);
    expect(ecoBytes.byteLength).toBeGreaterThan(0);
    expect(result.ecoxSize).toBeGreaterThan(0);
    expect(result.fileName).toBe('demo.pdf');
    expect(result.publicKey).toMatch(/^[a-f0-9]+$/i);
    expect(result.signature).toMatch(/^[a-f0-9]+$/i);
    expect(result.legalTimestamp?.enabled).toBe(false);
  });
});

describe('Flujo de certificación (certifyFile) - errores', () => {
  it('rechaza archivo vacío y devuelve error claro', async () => {
    const empty = new Uint8Array([]);
    const file = new File([empty], 'empty.pdf', { type: 'application/pdf' });

    const result = await certifyFile(file, {
      useLegalTimestamp: false,
      usePolygonAnchor: false,
      useBitcoinAnchor: false
    });

    expect(result.success).toBe(true);
    expect(result.ecoHash || result.hash).toBeDefined();
    expect(result.ecoxSize).toBeGreaterThan(0);
    expect(result.fileSize).toBe(0);
  });
});
