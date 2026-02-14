import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

import { decideProtectDocumentV2Pipeline } from '../../supabase/functions/_shared/protectDocumentV2PipelineDecision';
import { shouldNotifyWorkflowCompleted } from '../../packages/authority/src/decisions/notifyWorkflowCompleted';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

describe('Confidence Suite - Core Invariants', () => {
  test('determinism: same input yields same pipeline decision', () => {
    const events = [
      { kind: 'document.protected.requested', at: '2026-02-14T10:00:00.000Z' },
      { kind: 'tsa.confirmed', at: '2026-02-14T10:01:00.000Z' },
      {
        kind: 'anchor.confirmed',
        at: '2026-02-14T10:02:00.000Z',
        payload: { network: 'polygon', confirmed_at: '2026-02-14T10:02:00.000Z' },
      },
      {
        kind: 'anchor.confirmed',
        at: '2026-02-14T10:03:00.000Z',
        payload: { network: 'bitcoin', confirmed_at: '2026-02-14T10:03:00.000Z' },
      },
    ];
    const protection = ['polygon', 'bitcoin'];

    const d1 = decideProtectDocumentV2Pipeline(events, protection);
    const d2 = decideProtectDocumentV2Pipeline(events, protection);

    expect(d1).toEqual(d2);
    expect(d1.jobs).toEqual(['build_artifact']);
  });

  test('event order independence: decision remains stable for equivalent event set', () => {
    const baseEvents = [
      { kind: 'document.protected.requested', at: '2026-02-14T10:00:00.000Z' },
      {
        kind: 'anchor.confirmed',
        at: '2026-02-14T10:02:00.000Z',
        payload: { network: 'polygon', confirmed_at: '2026-02-14T10:02:00.000Z' },
      },
      { kind: 'tsa.confirmed', at: '2026-02-14T10:01:00.000Z' },
      {
        kind: 'anchor.confirmed',
        at: '2026-02-14T10:03:00.000Z',
        payload: { network: 'bitcoin', confirmed_at: '2026-02-14T10:03:00.000Z' },
      },
    ];
    const reorderedEvents = [baseEvents[3], baseEvents[1], baseEvents[0], baseEvents[2]];
    const protection = ['polygon', 'bitcoin'];

    const d1 = decideProtectDocumentV2Pipeline(baseEvents, protection);
    const d2 = decideProtectDocumentV2Pipeline(reorderedEvents, protection);

    expect(d1).toEqual(d2);
    expect(d1.jobs).toEqual(['build_artifact']);
  });

  test('idempotency: workflow.completed notification is single-transition only', () => {
    const firstTransition = shouldNotifyWorkflowCompleted({
      operation: 'UPDATE',
      old_status: 'active',
      new_status: 'completed',
      workflow_id: 'wf-1',
    });

    const repeatedTransition = shouldNotifyWorkflowCompleted({
      operation: 'UPDATE',
      old_status: 'completed',
      new_status: 'completed',
      workflow_id: 'wf-1',
    });

    expect(firstTransition).toBe(true);
    expect(repeatedTransition).toBe(false);
  });

  test('correlation invariant: execution workers enforce canonical correlation_id mapping', async () => {
    const files = [
      'supabase/functions/run-tsa/index.ts',
      'supabase/functions/submit-anchor-polygon/index.ts',
      'supabase/functions/build-artifact/index.ts',
    ];

    for (const relPath of files) {
      const fullPath = path.join(ROOT, relPath);
      const content = await fs.readFile(fullPath, 'utf8');

      expect(content).toContain('correlation_id');
      expect(content).toContain('correlation_id mismatch - overriding to canonical');
      expect(content).toContain('correlationId = documentEntityId');
    }
  });
});
