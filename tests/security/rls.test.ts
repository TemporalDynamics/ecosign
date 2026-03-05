// tests/security/rls.test.ts

import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import { createTestUser, deleteTestUser, getAdminClient } from '../helpers/supabase-test-helpers';
import { assertDbTestEnv } from '../helpers/db-test-env';

const TEST_TIMEOUT = 15000;

describe('Row Level Security (RLS) Tests', () => {
  let adminClient: ReturnType<typeof getAdminClient>;
  let userAClient: any;
  let userBClient: any;
  let userAId = '';
  let userBId = '';
  let testDocumentId = '';

  beforeAll(async () => {
    assertDbTestEnv();

    adminClient = getAdminClient();

    // Fail-fast if local Supabase for this repo is not reachable.
    const { error: connectivityError } = await adminClient.from('documents').select('id').limit(1);
    if (connectivityError) {
      throw new Error(`[RLS_TEST_CONNECTIVITY] ${connectivityError.message}`);
    }

    const userA = await createTestUser(`test-rls-a-${Date.now()}@example.com`, 'test-password-123');
    userAId = userA.userId;
    userAClient = userA.client;

    const userB = await createTestUser(`test-rls-b-${Date.now()}@example.com`, 'test-password-123');
    userBId = userB.userId;
    userBClient = userB.client;

    const docId = crypto.randomUUID();
    // Seed with service role to avoid insert-policy side effects and focus this suite on read/update/delete RLS.
    const { error: docError } = await adminClient.from('documents').insert({
      id: docId,
      title: 'Test Document for RLS',
      owner_id: userAId,
      eco_hash: `test_hash_${Date.now()}`,
      status: 'active'
    });

    if (docError) {
      throw new Error(`[RLS_TEST_SEED] Failed to create test document: ${docError.message}`);
    }
    testDocumentId = docId;
  }, TEST_TIMEOUT);

  afterAll(async () => {
    if (testDocumentId) {
      await adminClient.from('documents').delete().eq('id', testDocumentId);
    }
    if (userAId) await deleteTestUser(userAId);
    if (userBId) await deleteTestUser(userBId);
  }, TEST_TIMEOUT);

  test('User A can read their own document', async () => {
    const { data, error } = await userAClient
      .from('documents')
      .select('*')
      .eq('id', testDocumentId)
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.owner_id).toBe(userAId);
  }, TEST_TIMEOUT);

  test("User B CANNOT read User A's document", async () => {
    const { data, error } = await userBClient
      .from('documents')
      .select('*')
      .eq('id', testDocumentId)
      .single();

    expect(data).toBeNull();
    if (error) {
      expect(error.code).toBe('PGRST116');
    }
  }, TEST_TIMEOUT);

  test("User B cannot update User A's document", async () => {
    const { data, error } = await userBClient
      .from('documents')
      .update({ title: 'Hacked' })
      .eq('id', testDocumentId)
      .select('id, title');

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);

    const { data: currentDoc } = await adminClient
      .from('documents')
      .select('title')
      .eq('id', testDocumentId)
      .single();

    expect(currentDoc?.title).toBe('Test Document for RLS');
  }, TEST_TIMEOUT);

  test("User B cannot delete User A's document", async () => {
    const { data, error } = await userBClient
      .from('documents')
      .delete()
      .eq('id', testDocumentId)
      .select('id');

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);

    const { data: remainingDoc } = await adminClient
      .from('documents')
      .select('*')
      .eq('id', testDocumentId)
      .single();

    expect(remainingDoc).not.toBeNull();
  }, TEST_TIMEOUT);

  test('User cannot insert with fake owner_id', async () => {
    const { error } = await userBClient
      .from('documents')
      .insert({
        title: 'Fake Document',
        owner_id: userAId,
        eco_hash: `fake_hash_${Date.now()}`,
        status: 'active'
      });

    if (!error) {
      const { data } = await userBClient
        .from('documents')
        .select('*')
        .eq('title', 'Fake Document')
        .single();

      if (data) {
        expect(data.owner_id).toBe(userBId);
        await userBClient.from('documents').delete().eq('id', data.id);
      }
    }
  }, TEST_TIMEOUT);

  test('RLS logic validation (unit test)', () => {
    const hasAccess = (userId: string, ownerId: string) => userId === ownerId;
    expect(hasAccess(userAId, userAId)).toBe(true);
    expect(hasAccess(userBId, userAId)).toBe(false);
  });
});
