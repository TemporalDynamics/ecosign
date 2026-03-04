import { describe, expect, test } from 'vitest';
import { buildWitnessHistoryFromEvents, reconcileWitnessHistory } from '../../supabase/functions/_shared/witnessHistory';

describe('Witness history reconstruction', () => {
  test('builds witness history from signature.completed events ordered by time', () => {
    const events = [
      {
        kind: 'signature.completed',
        at: '2026-02-16T10:00:00.000Z',
        signer: { id: 's-2' },
        workflow: { id: 'w-1' },
        evidence: { witness_pdf_hash: 'hash-b' },
      },
      {
        kind: 'signature.completed',
        at: '2026-02-16T09:00:00.000Z',
        signer: { id: 's-1' },
        workflow: { id: 'w-1' },
        evidence: { witness_pdf_hash: 'hash-a' },
      },
      { kind: 'anchor.confirmed', at: '2026-02-16T11:00:00.000Z', payload: {} },
    ];

    const history = buildWitnessHistoryFromEvents(events);
    expect(history).toHaveLength(2);
    expect(history[0].hash).toBe('hash-a');
    expect(history[1].hash).toBe('hash-b');
  });

  test('reconcile merges ledger entries without duplicating', () => {
    const existing = [
      {
        at: '2026-02-16T09:00:00.000Z',
        hash: 'hash-a',
        source: 'signature_flow',
        workflow_id: 'w-1',
        signer_id: 's-1',
      },
    ];
    const events = [
      {
        kind: 'signature.completed',
        at: '2026-02-16T09:00:00.000Z',
        signer: { id: 's-1' },
        workflow: { id: 'w-1' },
        evidence: { witness_pdf_hash: 'hash-a' },
      },
      {
        kind: 'signature.completed',
        at: '2026-02-16T10:00:00.000Z',
        signer: { id: 's-2' },
        workflow: { id: 'w-1' },
        evidence: { witness_pdf_hash: 'hash-b' },
      },
    ];

    const reconciled = reconcileWitnessHistory(existing, events);
    expect(reconciled).toHaveLength(2);
    expect(reconciled.map((e) => e.hash)).toEqual(['hash-a', 'hash-b']);
  });
});
