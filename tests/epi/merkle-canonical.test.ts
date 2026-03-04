import { describe, expect, test } from 'vitest';
import { buildMerkleRoot, computeStateHash } from '../../supabase/functions/_shared/epiCanvas.ts';

describe('EPI Merkle canonicalization', () => {
  test('buildMerkleRoot is order-independent for leaves', async () => {
    const leavesA = [
      { type: 'state' as const, hash: 'state-hash-1', at: '2026-03-01T10:00:00.000Z' },
      { type: 'content' as const, hash: 'source-hash-1', at: '2026-03-01T09:00:00.000Z' }
    ];
    const leavesB = [leavesA[1], leavesA[0]];

    const rootA = await buildMerkleRoot(leavesA);
    const rootB = await buildMerkleRoot(leavesB);

    expect(rootA).toBe(rootB);
  });

  test('buildMerkleRoot changes when an extra leaf is added', async () => {
    const baseLeaves = [
      { type: 'content' as const, hash: 'source-hash-1', at: '2026-03-01T09:00:00.000Z' },
      { type: 'state' as const, hash: 'state-hash-1', at: '2026-03-01T10:00:00.000Z' }
    ];
    const rootA = await buildMerkleRoot(baseLeaves);

    const rootB = await buildMerkleRoot([
      ...baseLeaves,
      { type: 'state' as const, hash: 'state-hash-2', at: '2026-03-01T11:00:00.000Z' }
    ]);

    expect(rootA).not.toBe(rootB);
  });

  test('computeStateHash ignores field ordering', async () => {
    const fields = [
      { id: 'f-1', type: 'signature', page: 1, x: 120, y: 80, width: 200, height: 60, signer_email: 'a@b.com' },
      { id: 'f-2', type: 'text', page: 2, x: 90, y: 140, width: 180, height: 40, signer_email: 'a@b.com' }
    ];
    const pages = [
      { pageNumber: 1, width: 1000, height: 1414 },
      { pageNumber: 2, width: 1000, height: 1414 }
    ];

    const hashA = await computeStateHash(fields, pages);
    const hashB = await computeStateHash([fields[1], fields[0]], [pages[1], pages[0]]);

    expect(hashA).toBe(hashB);
  });
});
