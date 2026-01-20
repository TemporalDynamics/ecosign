import { decideProtectDocumentV2Pipeline } from '../../supabase/functions/_shared/protectDocumentV2PipelineDecision.ts';

Deno.test('protect_document_v2 pipeline: run_tsa when request exists and no tsa', () => {
  const decision = decideProtectDocumentV2Pipeline(
    [
      { kind: 'document.signed' },
      { kind: 'document.protected.requested' },
    ],
    [],
  );

  const expected = ['run_tsa'];
  if (JSON.stringify(decision.jobs) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(decision.jobs)}`);
  }
});

Deno.test('protect_document_v2 pipeline: build_artifact when tsa confirmed and no artifact', () => {
  const decision = decideProtectDocumentV2Pipeline(
    [
      { kind: 'document.signed' },
      { kind: 'document.protected.requested' },
      { kind: 'tsa.confirmed' },
    ],
    ['polygon'],
  );

  const expected = ['build_artifact'];
  if (JSON.stringify(decision.jobs) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(decision.jobs)}`);
  }
});

Deno.test('protect_document_v2 pipeline: submit anchors after artifact finalized', () => {
  const decision = decideProtectDocumentV2Pipeline(
    [
      { kind: 'document.signed' },
      { kind: 'document.protected.requested' },
      { kind: 'tsa.confirmed' },
      { kind: 'artifact.finalized' },
    ],
    ['polygon', 'bitcoin'],
  );

  const expected = ['submit_anchor_polygon', 'submit_anchor_bitcoin'];
  if (JSON.stringify(decision.jobs) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(decision.jobs)}`);
  }
});

Deno.test('protect_document_v2 pipeline: noop when request missing', () => {
  const decision = decideProtectDocumentV2Pipeline([{ kind: 'document.signed' }], ['polygon']);
  if (decision.jobs.length !== 0 || decision.reason !== 'noop_missing_request') {
    throw new Error('Expected noop_missing_request with no jobs');
  }
});

Deno.test('protect_document_v2 pipeline: noop when no anchors requested', () => {
  const decision = decideProtectDocumentV2Pipeline(
    [
      { kind: 'document.signed' },
      { kind: 'document.protected.requested' },
      { kind: 'tsa.confirmed' },
      { kind: 'artifact.finalized' },
    ],
    [],
  );

  if (decision.jobs.length !== 0 || decision.reason !== 'noop_complete') {
    throw new Error('Expected noop_complete with no jobs');
  }
});
