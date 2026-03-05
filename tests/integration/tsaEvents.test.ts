/**
 * Integration test for TSA events in document_entities
 * Tests DB triggers, append-only enforcement, and tsa_latest cache.
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import { createTestUser, deleteTestUser, getAdminClient } from '../helpers/supabase-test-helpers';
import { assertDbTestEnv } from '../helpers/db-test-env';

let supabase: SupabaseClient;
let testUserId: string | null = null;
const testDocIds: string[] = [];

function buildProtectionRequestEvent() {
  return {
    kind: 'document.protected.requested',
    at: new Date().toISOString(),
    payload: {
      required_evidence: ['tsa'],
      flow_type: 'DIRECT_PROTECTION',
      anchor_stage: 'initial',
    },
    _source: 'test-suite',
  };
}

async function createTestEntity(): Promise<string> {
  const docId = crypto.randomUUID();
  const sourceHash = crypto.randomUUID().replace(/-/g, '').padEnd(64, 'a').slice(0, 64);

  const { error: docError } = await supabase.from('document_entities').insert({
    id: docId,
    owner_id: testUserId,
    source_name: 'tsa-test.pdf',
    source_mime: 'application/pdf',
    source_size: 1024,
    source_hash: sourceHash,
    source_captured_at: new Date().toISOString(),
    custody_mode: 'hash_only',
    lifecycle_status: 'witness_ready',
    witness_current_hash: 'b'.repeat(64),
    witness_current_mime: 'application/pdf',
    witness_current_status: 'generated',
    witness_hash: 'b'.repeat(64),
    hash_chain: {
      source_hash: sourceHash,
      witness_hash: 'b'.repeat(64),
    },
    events: [buildProtectionRequestEvent()],
  });

  if (docError) throw docError;
  testDocIds.push(docId);
  return docId;
}

async function appendEvent(documentId: string, event: Record<string, unknown>) {
  const source = typeof event._source === 'string' ? event._source : 'run-tsa';
  const canonicalEvent = {
    ...event,
    id: crypto.randomUUID(),
    at: String(event.at ?? new Date().toISOString()),
    v: 1,
    actor: { type: 'system', id: 'test-suite' },
    entity_id: documentId,
    correlation_id: crypto.randomUUID(),
  };

  return supabase.rpc('append_document_entity_event', {
    p_document_entity_id: documentId,
    p_event: canonicalEvent,
    p_source: source,
  });
}

beforeAll(async () => {
  assertDbTestEnv({ requireRunDbIntegration: true });

  supabase = getAdminClient();

  const testEmail = `test-tsa-${Date.now()}@example.com`;
  const testPassword = 'test-password-123!';
  const { userId } = await createTestUser(testEmail, testPassword);
  testUserId = userId;
});

afterAll(async () => {
  if (testDocIds.length > 0) {
    await supabase.from('document_entities').delete().in('id', testDocIds);
  }

  if (testUserId) {
    await deleteTestUser(testUserId);
  }
});

describe('TSA Events DB Integration', () => {
  test('appends TSA event successfully', async () => {
    const testDocId = await createTestEntity();

    const tsaEvent = {
      kind: 'tsa',
      at: new Date().toISOString(),
      witness_hash: 'b'.repeat(64),
      tsa: {
        token_b64: 'MIITestToken...',
        gen_time: new Date().toISOString(),
        policy_oid: '1.2.3.4.5',
        serial: '123456',
        digest_algo: 'sha256',
      },
    };

    const { error } = await appendEvent(testDocId, tsaEvent);

    expect(error).toBeNull();

    const { data, error: fetchError } = await supabase
      .from('document_entities')
      .select('events, tsa_latest')
      .eq('id', testDocId)
      .single();

    expect(fetchError).toBeNull();
    expect(data.events).toHaveLength(2);
    expect(data.events[1].kind).toBe('tsa');
    expect(data.tsa_latest).toBeTruthy();
    expect(data.tsa_latest.tsa.token_b64).toBe('MIITestToken...');
  });

  test('rejects duplicate TSA evidence for same witness_hash', async () => {
    const testDocId = await createTestEntity();

    const firstEvent = {
      kind: 'tsa',
      at: new Date().toISOString(),
      witness_hash: 'b'.repeat(64),
      tsa: {
        token_b64: 'MIIFirstToken...',
        gen_time: new Date().toISOString(),
        digest_algo: 'sha256',
      },
    };

    const { error: firstError } = await appendEvent(testDocId, firstEvent);
    expect(firstError).toBeNull();

    const secondEvent = {
      kind: 'tsa.confirmed',
      at: new Date().toISOString(),
      _source: 'run-tsa',
      witness_hash: 'b'.repeat(64),
      tsa: {
        token_b64: 'MIISecondToken...',
        gen_time: new Date().toISOString(),
        digest_algo: 'sha256',
      },
    };

    const { error } = await appendEvent(testDocId, secondEvent);

    expect(error).toBeTruthy();
    expect(error?.message).toContain('unique per witness_hash');
  });

  test('rejects TSA event with mismatched witness_hash', async () => {
    const testDocId = await createTestEntity();

    const invalidTsaEvent = {
      kind: 'tsa',
      at: new Date().toISOString(),
      witness_hash: 'x'.repeat(64),
      tsa: {
        token_b64: 'MIIInvalidToken...',
        gen_time: new Date().toISOString(),
        digest_algo: 'sha256',
      },
    };

    const { error } = await appendEvent(testDocId, invalidTsaEvent);

    expect(error).toBeTruthy();
    expect(error?.message).toContain('witness_hash');
  });

  test('rejects TSA event without token_b64', async () => {
    const testDocId = await createTestEntity();

    const invalidTsaEvent = {
      kind: 'tsa',
      at: new Date().toISOString(),
      witness_hash: 'b'.repeat(64),
      tsa: {
        gen_time: new Date().toISOString(),
        digest_algo: 'sha256',
      },
    };

    const { error } = await appendEvent(testDocId, invalidTsaEvent);

    expect(error).toBeTruthy();
    expect(error?.message).toContain('token_b64');
  });

  test('forbids direct events[] updates outside append_document_entity_event', async () => {
    const testDocId = await createTestEntity();

    const tsaEvent = {
      kind: 'tsa',
      at: new Date().toISOString(),
      witness_hash: 'b'.repeat(64),
      tsa: {
        token_b64: 'MIIAppendOnlyToken...',
        gen_time: new Date().toISOString(),
        digest_algo: 'sha256',
      },
    };

    const { error } = await supabase
      .from('document_entities')
      .update({ events: [buildProtectionRequestEvent()] })
      .eq('id', testDocId);

    expect(error).toBeTruthy();
    expect(error?.message).toContain('append_document_entity_event');
  });

  test('rejects tsa.confirmed emitted by non run-tsa source', async () => {
    const testDocId = await createTestEntity();

    const invalidConfirmedEvent = {
      kind: 'tsa.confirmed',
      at: new Date().toISOString(),
      _source: 'manual-test',
      witness_hash: 'b'.repeat(64),
      tsa: {
        token_b64: 'MIIConfirmedToken...',
        gen_time: new Date().toISOString(),
        digest_algo: 'sha256',
      },
    };

    const { error } = await appendEvent(testDocId, invalidConfirmedEvent);

    expect(error).toBeTruthy();
    expect(error?.message).toContain('run-tsa');
  });
});
