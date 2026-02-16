import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { describe, expect, test } from 'vitest';
import { createTestUser, deleteTestUser } from '../helpers/supabase-test-helpers';
import { decideProtectDocumentV2Pipeline } from '../../supabase/functions/_shared/protectDocumentV2PipelineDecision';

type EvidenceTimelineEntry = {
  timestamp: string;
  step: string;
  detail: string;
};

type CanonicalProofEvidence = {
  test_run_id: string;
  started_at: string;
  finished_at?: string;
  document_entity_id?: string;
  user_id?: string;
  timeline: EvidenceTimelineEntry[];
  validations: {
    db_constraint_required_evidence_enforced: boolean;
    events_only_reconstruction: boolean;
    canonical_authority_confirmed: boolean;
  };
  skipped?: boolean;
  skip_reason?: string;
};

const hasRealLocalSupabase = () => {
  const url = process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return (url.includes('127.0.0.1') || url.includes('localhost')) && key.length > 0;
};

const pushTimeline = (evidence: CanonicalProofEvidence, step: string, detail: string) => {
  evidence.timeline.push({
    timestamp: new Date().toISOString(),
    step,
    detail,
  });
};

const randomSha256 = () =>
  `${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`.slice(0, 64);

const writeEvidence = async (evidence: CanonicalProofEvidence) => {
  evidence.finished_at = new Date().toISOString();
  const evidenceDir = path.resolve(process.cwd(), 'tests/canonical-only/evidence');
  await fs.mkdir(evidenceDir, { recursive: true });
  const outFile = path.join(evidenceDir, `${evidence.test_run_id}.json`);
  await fs.writeFile(outFile, JSON.stringify(evidence, null, 2), 'utf8');
};

describe('Canonical-only pipeline proof (isolated)', () => {
  const run = hasRealLocalSupabase() ? test : test.skip;

  run('validates required_evidence constraint + emits evidence report', async () => {
    const testRunId = `canonical-proof-${Date.now()}`;
    const evidence: CanonicalProofEvidence = {
      test_run_id: testRunId,
      started_at: new Date().toISOString(),
      timeline: [],
      validations: {
        db_constraint_required_evidence_enforced: false,
        events_only_reconstruction: false,
        canonical_authority_confirmed: false,
      },
    };

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const testEmail = `canonical-proof-${Date.now()}@example.test`;
    const testPassword = 'CanonicalProof123!';

    let userId: string | undefined;
    let documentEntityId: string | undefined;

    try {
      const health = await fetch(`${process.env.SUPABASE_URL}/auth/v1/health`, { method: 'GET' });
      if (!health.ok) {
        evidence.skipped = true;
        evidence.skip_reason = `supabase health endpoint returned ${health.status}`;
        pushTimeline(evidence, 'skipped_no_connectivity', evidence.skip_reason);
        await writeEvidence(evidence);
        expect(evidence.timeline.length).toBeGreaterThan(0);
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      evidence.skipped = true;
      evidence.skip_reason = `supabase not reachable: ${message}`;
      pushTimeline(evidence, 'skipped_no_connectivity', evidence.skip_reason);
      await writeEvidence(evidence);
      expect(evidence.timeline.length).toBeGreaterThan(0);
      return;
    }

    try {
      const createdUser = await createTestUser(testEmail, testPassword);
      userId = createdUser.userId;
      evidence.user_id = userId;
      pushTimeline(evidence, 'test_user_created', `user_id=${userId}`);

      const invalidInsert = await supabase.from('document_entities').insert({
        owner_id: userId,
        source_name: `invalid-${testRunId}.pdf`,
        source_mime: 'application/pdf',
        source_size: 1234,
        source_hash: randomSha256(),
        custody_mode: 'hash_only',
        lifecycle_status: 'protected',
        witness_hash: randomSha256(),
        witness_current_hash: randomSha256(),
        witness_current_mime: 'application/pdf',
        witness_current_status: 'generated',
        hash_chain: {},
        transform_log: [],
        witness_history: [],
        events: [
          {
            kind: 'document.protected.requested',
            at: new Date().toISOString(),
            payload: {
              // intentionally missing required_evidence
              test_run_id: testRunId,
            },
          },
        ],
      });

      if (invalidInsert.error) {
        evidence.validations.db_constraint_required_evidence_enforced = true;
        pushTimeline(
          evidence,
          'constraint_rejected_invalid_event',
          `error=${invalidInsert.error.message}`,
        );
      } else {
        throw new Error('expected DB constraint violation for missing required_evidence');
      }

      const sourceHash = randomSha256();
      const witnessHash = randomSha256();
      const validInsert = await supabase
        .from('document_entities')
        .insert({
          owner_id: userId,
          source_name: `valid-${testRunId}.pdf`,
          source_mime: 'application/pdf',
          source_size: 5678,
          source_hash: sourceHash,
          custody_mode: 'hash_only',
          lifecycle_status: 'protected',
          witness_hash: witnessHash,
          witness_current_hash: witnessHash,
          witness_current_mime: 'application/pdf',
          witness_current_status: 'generated',
          hash_chain: {},
          transform_log: [],
          witness_history: [],
          events: [
            {
              kind: 'document.protected.requested',
              at: new Date().toISOString(),
              payload: {
                required_evidence: ['polygon', 'bitcoin'],
                test_run_id: testRunId,
              },
            },
          ],
        })
        .select('id, events')
        .single();

      if (validInsert.error || !validInsert.data) {
        throw new Error(validInsert.error?.message ?? 'failed to insert valid document entity');
      }

      documentEntityId = validInsert.data.id;
      evidence.document_entity_id = documentEntityId;
      pushTimeline(evidence, 'valid_document_created', `document_entity_id=${documentEntityId}`);

      const decision = decideProtectDocumentV2Pipeline(validInsert.data.events as any[]);
      expect(decision.jobs).toEqual(['run_tsa']);
      evidence.validations.events_only_reconstruction = true;
      evidence.validations.canonical_authority_confirmed = true;
      pushTimeline(
        evidence,
        'events_only_decision_verified',
        `decision_jobs=${decision.jobs.join(',')}`,
      );
    } finally {
      if (documentEntityId) {
        await supabase.from('document_entities').delete().eq('id', documentEntityId);
        pushTimeline(evidence, 'cleanup_document_entity', `document_entity_id=${documentEntityId}`);
      }

      if (userId) {
        await deleteTestUser(userId);
        pushTimeline(evidence, 'cleanup_test_user', `user_id=${userId}`);
      }

      await writeEvidence(evidence);
    }

    expect(evidence.timeline.length).toBeGreaterThan(0);
    expect(evidence.validations.db_constraint_required_evidence_enforced).toBe(true);
    expect(evidence.validations.events_only_reconstruction).toBe(true);
    expect(evidence.validations.canonical_authority_confirmed).toBe(true);
  });
});
