import { describe, it, expect } from 'vitest';
import { Batch, assignBatchToSigner, freezeBatch, canMutateByWorkflow, unassignBatch } from '../batch';

describe('Batch helper (P2.1)', () => {
  it('allows assignment in draft and blocks when frozen', () => {
    const b: Batch = { id: 'b1', fieldIds: ['f1','f2'], assigned_signer_id: null, frozen: false };
    expect(canMutateByWorkflow('draft')).toBe(true);
    assignBatchToSigner(b, 'signer-1');
    expect(b.assigned_signer_id).toBe('signer-1');
    freezeBatch(b);
    expect(() => assignBatchToSigner(b, 'signer-2')).toThrow();
  });

  it('unassign throws when frozen', () => {
    const b: Batch = { id: 'b2', fieldIds: ['f3'], assigned_signer_id: 's1', frozen: true };
    expect(() => unassignBatch(b)).toThrow();
  });
});
