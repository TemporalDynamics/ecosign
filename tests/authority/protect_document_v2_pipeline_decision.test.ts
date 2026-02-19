import { decideProtectDocumentV2Pipeline } from '../../supabase/functions/_shared/protectDocumentV2PipelineDecision.ts';
import { describe, expect, test } from 'vitest';

describe('protect_document_v2 pipeline decision', () => {
  test('run_tsa when request exists and no tsa', () => {
    const decision = decideProtectDocumentV2Pipeline(
      [
        { kind: 'document.signed' },
        { kind: 'document.protected.requested', payload: { required_evidence: [] } },
      ]
    );

    expect(decision.jobs).toEqual(['run_tsa']);
  });

  test('submit_anchor_polygon when tsa confirmed and polygon requested without confirmation', () => {
    const decision = decideProtectDocumentV2Pipeline(
      [
        { kind: 'document.signed' },
        { kind: 'document.protected.requested', payload: { required_evidence: ['polygon'] } },
        { kind: 'tsa.confirmed' },
      ]
    );

    expect(decision.jobs).toEqual(['build_artifact', 'submit_anchor_polygon']);
  });

  test('build_artifact when tsa confirmed and required anchors are confirmed', () => {
    const decision = decideProtectDocumentV2Pipeline(
      [
        { kind: 'document.signed' },
        { kind: 'document.protected.requested', payload: { required_evidence: ['polygon', 'bitcoin'] } },
        { kind: 'tsa.confirmed' },
        {
          kind: 'anchor.confirmed',
          at: '2026-01-27T10:02:00.000Z',
          payload: { network: 'polygon', confirmed_at: '2026-01-27T10:02:00.000Z' },
        },
        {
          kind: 'anchor.confirmed',
          at: '2026-01-27T10:03:00.000Z',
          payload: { network: 'bitcoin', confirmed_at: '2026-01-27T10:03:00.000Z' },
        },
      ]
    );

    expect(decision.jobs).toEqual(['build_artifact']);
  });

  test('DIRECT_PROTECTION does not block artifact on missing anchors', () => {
    const decision = decideProtectDocumentV2Pipeline(
      [
        {
          kind: 'document.protected.requested',
          payload: { flow_type: 'DIRECT_PROTECTION', required_evidence: ['polygon', 'bitcoin'] },
        },
        { kind: 'tsa.confirmed' },
      ],
    );

    expect(decision.jobs).toEqual(['build_artifact', 'submit_anchor_polygon', 'submit_anchor_bitcoin']);
  });

  test('SIGNATURE_FLOW initial never emits build_artifact (snapshots only)', () => {
    const decision = decideProtectDocumentV2Pipeline(
      [
        {
          kind: 'document.protected.requested',
          payload: { flow_type: 'SIGNATURE_FLOW', anchor_stage: 'initial', required_evidence: ['tsa', 'polygon'] },
        },
        { kind: 'tsa.confirmed' },
      ],
    );

    expect(decision.jobs).toEqual(['submit_anchor_polygon']);
  });

  test('SIGNATURE_FLOW final emits build_artifact and keeps anchors best-effort', () => {
    const decision = decideProtectDocumentV2Pipeline(
      [
        { kind: 'document.protected.requested', payload: { flow_type: 'SIGNATURE_FLOW', anchor_stage: 'initial', required_evidence: ['tsa', 'polygon'] } },
        { kind: 'document.protected.requested', payload: { flow_type: 'SIGNATURE_FLOW', anchor_stage: 'final', required_evidence: ['tsa', 'polygon', 'bitcoin'] } },
        { kind: 'tsa.confirmed' },
      ],
    );

    expect(decision.jobs).toEqual(['build_artifact', 'submit_anchor_polygon', 'submit_anchor_bitcoin']);
  });

  test('noop when request missing', () => {
    const decision = decideProtectDocumentV2Pipeline([{ kind: 'document.signed' }]);
    expect(decision.jobs).toEqual([]);
    expect(decision.reason).toBe('noop_missing_request');
  });

  test('noop_complete when artifact already finalized', () => {
    const decision = decideProtectDocumentV2Pipeline(
      [
        { kind: 'document.signed' },
        { kind: 'document.protected.requested', payload: { required_evidence: [] } },
        { kind: 'tsa.confirmed' },
        { kind: 'artifact.finalized' },
      ]
    );

    expect(decision.jobs).toEqual([]);
    expect(decision.reason).toBe('noop_complete');
  });
});
