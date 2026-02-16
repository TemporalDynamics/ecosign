import { describe, expect, test } from 'vitest';
import { decideProtectDocumentV2Pipeline, type EventLike } from '../../supabase/functions/_shared/protectDocumentV2PipelineDecision';

describe('Canonical-only pipeline proof', () => {
  test('Document -> TSA -> Anchors -> Artifact using events-only decisions', () => {
    const events: EventLike[] = [
      {
        kind: 'document.protected.requested',
        at: '2026-02-16T00:00:00.000Z',
        payload: { required_evidence: ['polygon', 'bitcoin'] },
      },
    ];

    const d1 = decideProtectDocumentV2Pipeline(events);
    expect(d1.jobs).toEqual(['run_tsa']);

    events.push({
      kind: 'tsa.confirmed',
      at: '2026-02-16T00:01:00.000Z',
      payload: { confirmed_at: '2026-02-16T00:01:00.000Z' },
    });
    const d2 = decideProtectDocumentV2Pipeline(events);
    expect(d2.jobs.sort()).toEqual(['submit_anchor_bitcoin', 'submit_anchor_polygon']);

    events.push({
      kind: 'anchor.confirmed',
      at: '2026-02-16T00:02:00.000Z',
      payload: { network: 'polygon', confirmed_at: '2026-02-16T00:02:00.000Z' },
    });
    const d3 = decideProtectDocumentV2Pipeline(events);
    expect(d3.jobs).toEqual(['submit_anchor_bitcoin']);

    events.push({
      kind: 'anchor.confirmed',
      at: '2026-02-16T00:03:00.000Z',
      payload: { network: 'bitcoin', confirmed_at: '2026-02-16T00:03:00.000Z' },
    });
    const d4 = decideProtectDocumentV2Pipeline(events);
    expect(d4.jobs).toEqual(['build_artifact']);

    events.push({
      kind: 'artifact.finalized',
      at: '2026-02-16T00:04:00.000Z',
      payload: { finalized_at: '2026-02-16T00:04:00.000Z' },
    });
    const d5 = decideProtectDocumentV2Pipeline(events);
    expect(d5.jobs).toEqual([]);
    expect(d5.reason).toBe('noop_complete');
  });
});
