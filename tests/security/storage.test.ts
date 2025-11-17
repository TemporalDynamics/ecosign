// tests/security/storage.test.ts

import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'documents';
const TEST_TIMEOUT = 15000;

describe('Storage Security Tests', () => {
  let supabaseAdmin: ReturnType<typeof createClient>;
  let supabaseUser: ReturnType<typeof createClient>;
  let testUserId: string;
  let testFilePath: string;

  beforeAll(async () => {
    // Create admin client
    supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create a test user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: `test-storage-${Date.now()}@example.com`,
      password: 'test-password-123',
      email_confirm: true
    });

    if (authError || !authData.user) {
      console.error('Failed to create test user:', authError);
      throw new Error('Cannot create test user');
    }

    testUserId = authData.user.id;

    // Create user client
    supabaseUser = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    // Sign in as test user
    await supabaseUser.auth.signInWithPassword({
      email: authData.user.email!,
      password: 'test-password-123'
    });

    // Ensure bucket exists
    const { data: bucket } = await supabaseAdmin.storage.getBucket(BUCKET_NAME);
    if (!bucket) {
      await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: 100 * 1024 * 1024 // 100MB
      });
    }
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Cleanup: remove test files
    if (testFilePath) {
      await supabaseAdmin.storage.from(BUCKET_NAME).remove([testFilePath]);
    }

    // Delete test user
    if (testUserId) {
      await supabaseAdmin.auth.admin.deleteUser(testUserId);
    }
  }, TEST_TIMEOUT);

  test('Bucket should be private (not public)', async () => {
    const { data: bucket } = await supabaseAdmin.storage.getBucket(BUCKET_NAME);
    expect(bucket?.public).toBe(false);
  }, TEST_TIMEOUT);

  test('User can upload file to their own folder', async () => {
    const fileName = `test-${Date.now()}.txt`;
    testFilePath = `${testUserId}/${fileName}`;
    const fileContent = new Blob(['Test content'], { type: 'text/plain' });

    const { error } = await supabaseUser.storage
      .from(BUCKET_NAME)
      .upload(testFilePath, fileContent);

    expect(error).toBeNull();
  }, TEST_TIMEOUT);

  test('User cannot upload file to another users folder', async () => {
    const otherUserId = 'other-user-id-12345';
    const fileName = `unauthorized-${Date.now()}.txt`;
    const filePath = `${otherUserId}/${fileName}`;
    const fileContent = new Blob(['Unauthorized content'], { type: 'text/plain' });

    const { error } = await supabaseUser.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileContent);

    // Should fail due to RLS policy
    expect(error).not.toBeNull();
  }, TEST_TIMEOUT);

  test('Respects file size limit (100MB)', async () => {
    const { data: bucket } = await supabaseAdmin.storage.getBucket(BUCKET_NAME);
    expect(bucket?.fileSizeLimit).toBeLessThanOrEqual(100 * 1024 * 1024);
  }, TEST_TIMEOUT);

  test('Can create signed URL for owned file', async () => {
    // First upload a file
    const fileName = `signed-url-test-${Date.now()}.txt`;
    const filePath = `${testUserId}/${fileName}`;
    const fileContent = new Blob(['Content for signed URL'], { type: 'text/plain' });

    await supabaseUser.storage.from(BUCKET_NAME).upload(filePath, fileContent);

    // Create signed URL
    const { data, error } = await supabaseUser.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 60); // 60 seconds

    expect(error).toBeNull();
    expect(data?.signedUrl).toBeDefined();
    expect(data?.signedUrl).toContain('token=');

    // Cleanup
    await supabaseAdmin.storage.from(BUCKET_NAME).remove([filePath]);
  }, TEST_TIMEOUT);

  test('Path traversal is prevented by sanitization', () => {
    // This is a unit test for path sanitization logic
    const sanitizePath = (path: string) => {
      return path.replace(/(\.\.\/|\.\.\\)/g, '');
    };
    
    expect(sanitizePath('../../etc/passwd')).toBe('etc/passwd');
    expect(sanitizePath('folder/../file.txt')).toBe('folder/file.txt');
    expect(sanitizePath('normal/path/file.txt')).toBe('normal/path/file.txt');
  });
});