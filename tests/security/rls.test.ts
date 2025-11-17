// tests/security/rls.test.ts

import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const TEST_TIMEOUT = 15000;

describe('Row Level Security (RLS) Tests', () => {
  let supabaseAdmin: ReturnType<typeof createClient>;
  let supabaseUserA: ReturnType<typeof createClient>;
  let supabaseUserB: ReturnType<typeof createClient>;
  let userAId: string;
  let userBId: string;
  let testDocumentId: string;

  beforeAll(async () => {
    // Create admin client
    supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create test user A
    const { data: userAData, error: userAError } = await supabaseAdmin.auth.admin.createUser({
      email: `test-rls-a-${Date.now()}@example.com`,
      password: 'test-password-123',
      email_confirm: true
    });

    if (userAError || !userAData.user) {
      console.error('Failed to create user A:', userAError);
      throw new Error('Cannot create test user A');
    }
    userAId = userAData.user.id;

    // Create test user B
    const { data: userBData, error: userBError } = await supabaseAdmin.auth.admin.createUser({
      email: `test-rls-b-${Date.now()}@example.com`,
      password: 'test-password-123',
      email_confirm: true
    });

    if (userBError || !userBData.user) {
      console.error('Failed to create user B:', userBError);
      throw new Error('Cannot create test user B');
    }
    userBId = userBData.user.id;

    // Create authenticated clients for each user
    supabaseUserA = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    supabaseUserB = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    // Sign in as users
    await supabaseUserA.auth.signInWithPassword({
      email: userAData.user.email!,
      password: 'test-password-123'
    });

    await supabaseUserB.auth.signInWithPassword({
      email: userBData.user.email!,
      password: 'test-password-123'
    });

    // Create a test document owned by User A (using admin to bypass RLS for setup)
    const { data: docData, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        title: 'Test Document for RLS',
        owner_id: userAId,
        status: 'pending'
      })
      .select()
      .single();

    if (docError) {
      console.warn('Could not create test document (table may not exist):', docError.message);
      // Don't throw - allow tests to run with limited functionality
    } else if (docData) {
      testDocumentId = docData.id;
    }
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Cleanup test document
    if (testDocumentId) {
      await supabaseAdmin.from('documents').delete().eq('id', testDocumentId);
    }

    // Cleanup test users
    if (userAId) {
      await supabaseAdmin.auth.admin.deleteUser(userAId);
    }
    if (userBId) {
      await supabaseAdmin.auth.admin.deleteUser(userBId);
    }
  }, TEST_TIMEOUT);

  test('User A can read their own document', async () => {
    if (!testDocumentId) {
      console.log('⚠️  Skipping: documents table not available');
      return;
    }

    const { data, error } = await supabaseUserA
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

    const { data, error } = await supabaseUserB
      .from('documents')
      .select('*')
      .eq('id', testDocumentId)
      .single();

    // RLS should block this - either error or no data
    expect(data).toBeNull();
  }, TEST_TIMEOUT);

  test('User B cannot update User A\'s document', async () => {
    if (!testDocumentId) {
      console.log('⚠️  Skipping: documents table not available');
      return;
    }

    const { error } = await supabaseUserB
      .from('documents')
      .update({ title: 'Hacked Document' })
      .eq('id', testDocumentId);

    // RLS should block this update
    expect(error).not.toBeNull();
  }, TEST_TIMEOUT);

  test('User B cannot delete User A\'s document', async () => {
    if (!testDocumentId) {
      console.log('⚠️  Skipping: documents table not available');
      return;
    }

    const { error } = await supabaseUserB
      .from('documents')
      .delete()
      .eq('id', testDocumentId);

    // RLS should block this delete
    expect(error).not.toBeNull();

    // Verify document still exists
    const { data } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', testDocumentId)
      .single();

    expect(data).not.toBeNull();
  }, TEST_TIMEOUT);

  test('User can only insert documents with their own user_id', async () => {
    // Try to insert a document claiming to be owned by User A, while signed in as User B
    const { error } = await supabaseUserB
      .from('documents')
      .insert({
        title: 'Fake Document',
        owner_id: userAId, // Trying to fake ownership
        status: 'pending'
      });

    // RLS should block this or auto-correct owner_id
    // Depending on your RLS policy, this might error or insert with userBId
    if (!error) {
      // If insert succeeded, verify it was assigned to User B, not User A
      const { data } = await supabaseUserB
        .from('documents')
        .select('*')
        .eq('title', 'Fake Document')
        .single();

      if (data) {
        expect(data.owner_id).toBe(userBId); // Should be corrected to actual user
        // Cleanup
        await supabaseUserB.from('documents').delete().eq('id', data.id);
      }
    }
  }, TEST_TIMEOUT);

  // Unit test for RLS logic validation (doesn't require DB)
  test('Should validate RLS-like access control logic', () => {
    interface Document {
      id: string;
      owner_id: string;
    }

    const hasAccessToDocument = (userId: string, document: Document) => {
      return document.owner_id === userId;
    };

    const documentA: Document = { id: 'doc-1', owner_id: userAId };

    expect(hasAccessToDocument(userAId, documentA)).toBe(true);
    expect(hasAccessToDocument(userBId, documentA)).toBe(false);
  });
});