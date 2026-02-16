import { describe, expect, test } from 'vitest';
import { decideProtectDocumentV2Pipeline, type EventLike } from '../../supabase/functions/_shared/protectDocumentV2PipelineDecision';

const buildEventStream = (): EventLike[] => [
  {
    kind: 'document.protected.requested',
    at: '2026-02-16T00:00:00.000Z',
    payload: { required_evidence: ['polygon', 'bitcoin'] },
  },
  { kind: 'tsa.confirmed', at: '2026-02-16T00:01:00.000Z', payload: { confirmed_at: '2026-02-16T00:01:00.000Z' } },
  {
    kind: 'anchor.confirmed',
    at: '2026-02-16T00:02:00.000Z',
    payload: { network: 'polygon', confirmed_at: '2026-02-16T00:02:00.000Z' },
  },
  {
    kind: 'anchor.confirmed',
    at: '2026-02-16T00:03:00.000Z',
    payload: { network: 'bitcoin', confirmed_at: '2026-02-16T00:03:00.000Z' },
  },
  { kind: 'artifact.finalized', at: '2026-02-16T00:04:00.000Z', payload: { finalized_at: '2026-02-16T00:04:00.000Z' } },
];

describe('Event reconstruction invariants', () => {
  test('same event history always reconstructs same decision sequence', () => {
    const events = buildEventStream();

    const replay = (stream: EventLike[]) => {
      const seq: Array<{ jobs: string[]; reason?: string }> = [];
      for (let i = 1; i <= stream.length; i += 1) {
        const decision = decideProtectDocumentV2Pipeline(stream.slice(0, i));
        seq.push({ jobs: decision.jobs, reason: decision.reason });
      }
      return seq;
    };

    expect(replay(events)).toEqual(replay(events));
  });

  test('final stream reconstructs terminal noop_complete', () => {
    const finalDecision = decideProtectDocumentV2Pipeline(buildEventStream());
    expect(finalDecision.jobs).toEqual([]);
    expect(finalDecision.reason).toBe('noop_complete');
  });
});
