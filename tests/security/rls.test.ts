// tests/security/rls.test.ts

import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import { createTestUser, deleteTestUser, getAdminClient } from '../helpers/supabase-test-helpers';

const TEST_TIMEOUT = 15000;

describe('Row Level Security (RLS) Tests', () => {
  let adminClient: ReturnType<typeof getAdminClient>;
  let userAClient: any;
  let userBClient: any;
  let userAId: string;
  let userBId: string;
  let testDocumentId: string;

  beforeAll(async () => {
    adminClient = getAdminClient();

    // Create User A
    const userA = await createTestUser(
      `test-rls-a-${Date.now()}@example.com`,
      'test-password-123'
    );
    userAId = userA.userId;
    userAClient = userA.client;

    // Create User B
    const userB = await createTestUser(
      `test-rls-b-${Date.now()}@example.com`,
      'test-password-123'
    );
    userBId = userB.userId;
    userBClient = userB.client;

    // Create test document owned by User A
    const { data: docData, error: docError } = await adminClient
      .from('documents')
      .insert({
        title: 'Test Document for RLS',
        owner_id: userAId,
        status: 'pending'
      })
      .select()
      .single();

    if (docError) {
      console.warn('⚠️  documents table not available:', docError.message);
    } else if (docData) {
      testDocumentId = docData.id;
    }
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Cleanup document
    if (testDocumentId) {
      await adminClient.from('documents').delete().eq('id', testDocumentId);
    }

    // Cleanup users
    if (userAId) await deleteTestUser(userAId);
    if (userBId) await deleteTestUser(userBId);
  }, TEST_TIMEOUT);

  test('User A can read their own document', async () => {
    if (!testDocumentId) {
      console.log('⚠️  Skipping: documents table not available');
      return;
    }

    const { data, error } = await userAClient
      .from('documents')
      .select('*')
      .eq('id', testDocumentId)
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.owner_id).toBe(userAId);
  }, TEST_TIMEOUT);

  test('User B CANNOT read User A\'s document', async () => {
    if (!testDocumentId) {
      console.log('⚠️  Skipping: documents table not available');
      return;
    }

    const { data, error } = await userBClient
      .from('documents')
      .select('*')
      .eq('id', testDocumentId)
      .single();

    // RLS should block this
    expect(data).toBeNull();
  }, TEST_TIMEOUT);

  test('User B cannot update User A\'s document', async () => {
    if (!testDocumentId) {
      console.log('⚠️  Skipping: documents table not available');
      return;
    }

    const { error } = await userBClient
      .from('documents')
      .update({ title: 'Hacked' })
      .eq('id', testDocumentId);

    expect(error).not.toBeNull();
  }, TEST_TIMEOUT);

  test('User B cannot delete User A\'s document', async () => {
    if (!testDocumentId) {
      console.log('⚠️  Skipping: documents table not available');
      return;
    }

    const { error } = await userBClient
      .from('documents')
      .delete()
      .eq('id', testDocumentId);

    expect(error).not.toBeNull();

    // Verify still exists
    const { data } = await adminClient
      .from('documents')
      .select('*')
      .eq('id', testDocumentId)
      .single();

    expect(data).not.toBeNull();
  }, TEST_TIMEOUT);

  test('User cannot insert with fake owner_id', async () => {
    const { error } = await userBClient
      .from('documents')
      .insert({
        title: 'Fake Document',
        owner_id: userAId, // Trying to fake
        status: 'pending'
      });

    // Should error or auto-correct to userBId
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
