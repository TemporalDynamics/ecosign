/**
 * Integration test for TSA events in document_entities
 * Tests DB triggers, append-only enforcement, and tsa_latest cache
 *
 * REQUIREMENTS:
 * - Supabase local dev running (supabase start)
 * - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env
 *
 * NOTE: This suite uses service role to avoid RLS/session flakiness and validate
 * DB-level invariants (triggers, append-only, tsa_latest updates).
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import { createTestUser, deleteTestUser, getAdminClient } from '../helpers/supabase-test-helpers';

// NOTE: This test requires Supabase local dev (supabase start)
process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
const canRun = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const runDbIntegration = process.env.RUN_DB_INTEGRATION === '1';
const it = canRun && runDbIntegration ? test : test.skip;

let supabase: SupabaseClient;
let testUserId: string | null = null;
let testDocId: string | null = null;

beforeAll(async () => {
  if (!canRun || !runDbIntegration) {
    return;
  }

  supabase = getAdminClient();

  const testEmail = `test-tsa-${Date.now()}@example.com`;
  const testPassword = 'test-password-123!';
  const { userId } = await createTestUser(testEmail, testPassword);
  testUserId = userId;

  // Create test document entity
  const docId = crypto.randomUUID();
  const { error: docError } = await supabase
    .from('document_entities')
    .insert({
      id: docId,
      owner_id: testUserId,
      source_name: 'tsa-test.pdf',
      source_mime: 'application/pdf',
      source_size: 1024,
      source_hash: 'a'.repeat(64),
      source_captured_at: new Date().toISOString(),
      custody_mode: 'hash_only',
      lifecycle_status: 'witness_ready',
      witness_current_hash: 'b'.repeat(64),
      witness_current_mime: 'application/pdf',
      witness_current_status: 'generated',
      witness_hash: 'b'.repeat(64),
      hash_chain: {
        source_hash: 'a'.repeat(64),
        witness_hash: 'b'.repeat(64),
      },
      events: [],
    });

  if (docError) throw docError;
  testDocId = docId;
});

afterAll(async () => {
  if (!canRun || !runDbIntegration) {
    return;
  }

  // Cleanup
  if (testDocId) {
    await supabase.from('document_entities').delete().eq('id', testDocId);
  }

  if (testUserId) {
    await deleteTestUser(testUserId);
  }
});

describe('TSA Events DB Integration', () => {
  it('appends TSA event successfully', async () => {
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

    // Fetch current events and append
    const { data: currentDoc } = await supabase
      .from('document_entities')
      .select('events')
      .eq('id', testDocId)
      .single();

    const updatedEvents = [...(currentDoc?.events || []), tsaEvent];

    const { error } = await supabase
      .from('document_entities')
      .update({ events: updatedEvents })
      .eq('id', testDocId);

    expect(error).toBeNull();

    // Verify event was appended
    const { data, error: fetchError } = await supabase
      .from('document_entities')
      .select('events, tsa_latest')
      .eq('id', testDocId)
      .single();

    expect(fetchError).toBeNull();
    expect(data.events).toHaveLength(1);
    expect(data.events[0].kind).toBe('tsa');
    expect(data.tsa_latest).toBeTruthy();
    expect(data.tsa_latest.tsa.token_b64).toBe('MIITestToken...');
  });

  it('auto-updates tsa_latest on TSA append', async () => {
    // Append second TSA event
    const tsaEvent2 = {
      kind: 'tsa',
      at: new Date().toISOString(),
      witness_hash: 'b'.repeat(64),
      tsa: {
        token_b64: 'MIISecondToken...',
        gen_time: new Date().toISOString(),
        digest_algo: 'sha256',
      },
    };

    const { data: currentDoc } = await supabase
      .from('document_entities')
      .select('events')
      .eq('id', testDocId)
      .single();

    const updatedEvents = [...(currentDoc?.events || []), tsaEvent2];

    const { error } = await supabase
      .from('document_entities')
      .update({ events: updatedEvents })
      .eq('id', testDocId);

    expect(error).toBeNull();

    // Verify tsa_latest points to last TSA
    const { data, error: fetchError } = await supabase
      .from('document_entities')
      .select('events, tsa_latest')
      .eq('id', testDocId)
      .single();

    expect(fetchError).toBeNull();
    expect(data.events).toHaveLength(2);
    expect(data.tsa_latest.tsa.token_b64).toBe('MIISecondToken...');
  });

  it('rejects TSA event with mismatched witness_hash', async () => {
    const invalidTsaEvent = {
      kind: 'tsa',
      at: new Date().toISOString(),
      witness_hash: 'x'.repeat(64), // WRONG
      tsa: {
        token_b64: 'MIIInvalidToken...',
        gen_time: new Date().toISOString(),
        digest_algo: 'sha256',
      },
    };

    const { data: currentDoc } = await supabase
      .from('document_entities')
      .select('events')
      .eq('id', testDocId)
      .single();

    const updatedEvents = [...(currentDoc?.events || []), invalidTsaEvent];

    const { error } = await supabase
      .from('document_entities')
      .update({ events: updatedEvents })
      .eq('id', testDocId);

    expect(error).toBeTruthy();
    expect(error?.message).toContain('witness_hash');
  });

  it('rejects TSA event without token_b64', async () => {
    const invalidTsaEvent = {
      kind: 'tsa',
      at: new Date().toISOString(),
      witness_hash: 'b'.repeat(64),
      tsa: {
        // NO token_b64
        gen_time: new Date().toISOString(),
        digest_algo: 'sha256',
      },
    };

    const { data: currentDoc } = await supabase
      .from('document_entities')
      .select('events')
      .eq('id', testDocId)
      .single();

    const updatedEvents = [...(currentDoc?.events || []), invalidTsaEvent];

    const { error } = await supabase
      .from('document_entities')
      .update({ events: updatedEvents })
      .eq('id', testDocId);

    expect(error).toBeTruthy();
    expect(error?.message).toContain('token_b64');
  });

  it('enforces events append-only (cannot shrink)', async () => {
    // Try to remove events
    const { error } = await supabase
      .from('document_entities')
      .update({
        events: [],
      })
      .eq('id', testDocId);

    expect(error).toBeTruthy();
    expect(error?.message).toContain('append-only');
  });

  it('allows multiple TSA events', async () => {
    const tsaEvent3 = {
      kind: 'tsa',
      at: new Date().toISOString(),
      witness_hash: 'b'.repeat(64),
      tsa: {
        token_b64: 'MIIThirdToken...',
        gen_time: new Date().toISOString(),
        digest_algo: 'sha256',
      },
    };

    const { data: currentDoc } = await supabase
      .from('document_entities')
      .select('events')
      .eq('id', testDocId)
      .single();

    const updatedEvents = [...(currentDoc?.events || []), tsaEvent3];

    const { error } = await supabase
      .from('document_entities')
      .update({ events: updatedEvents })
      .eq('id', testDocId);

    expect(error).toBeNull();

    const { data, error: fetchError } = await supabase
      .from('document_entities')
      .select('events')
      .eq('id', testDocId)
      .single();

    expect(fetchError).toBeNull();
    expect(data.events.length).toBeGreaterThanOrEqual(3);
  });
});
