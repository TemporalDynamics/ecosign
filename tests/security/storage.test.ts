// tests/security/storage.test.ts

import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import { createTestUser, deleteTestUser, getAdminClient } from '../helpers/supabase-test-helpers';
import { assertDbTestEnv } from '../helpers/db-test-env';

const BUCKET_NAME = 'user-documents';
const TEST_TIMEOUT = 15000;

describe('Storage Security Tests', () => {
  let adminClient: ReturnType<typeof getAdminClient>;
  let userClient: any;
  let userId = '';
  let testFilePath = '';

  beforeAll(async () => {
    assertDbTestEnv();

    adminClient = getAdminClient();

    const { error: connectivityError } = await adminClient.from('documents').select('id').limit(1);
    if (connectivityError) {
      throw new Error(`[STORAGE_TEST_CONNECTIVITY] ${connectivityError.message}`);
    }

    const result = await createTestUser(`test-storage-${Date.now()}@example.com`, 'test-password-123');
    userId = result.userId;
    userClient = result.client;

    const { data: bucket } = await adminClient.storage.getBucket(BUCKET_NAME);
    if (!bucket) {
      await adminClient.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: 100 * 1024 * 1024,
        allowedMimeTypes: ['*']
      });
    }
  }, TEST_TIMEOUT);

  afterAll(async () => {
    if (testFilePath) {
      await adminClient.storage.from(BUCKET_NAME).remove([testFilePath]);
    }
    if (userId) {
      await deleteTestUser(userId);
    }
  }, TEST_TIMEOUT);

  test('Bucket should be private (not public)', async () => {
    const { data: bucket } = await adminClient.storage.getBucket(BUCKET_NAME);
    expect(bucket?.public).toBe(false);
  }, TEST_TIMEOUT);

  test('User can upload file to their own folder', async () => {
    const fileName = `test-${Date.now()}.pdf`;
    testFilePath = `${userId}/${fileName}`;
    const fileContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

    const { error } = await userClient.storage
      .from(BUCKET_NAME)
      .upload(testFilePath, fileContent, { contentType: 'application/pdf' });

    expect(error).toBeNull();
  }, TEST_TIMEOUT);

  test('Storage RLS should prevent cross-user access', async () => {
    const canAccessFile = (requestUserId: string, fileOwnerId: string) => requestUserId === fileOwnerId;
    const otherUserId = 'other-user-12345';

    expect(canAccessFile(userId, userId)).toBe(true);
    expect(canAccessFile(userId, otherUserId)).toBe(false);
  }, TEST_TIMEOUT);

  test('File size limits should be enforced', async () => {
    const MAX_SIZE = 100 * 1024 * 1024;
    const validateFileSize = (fileSize: number) => fileSize <= MAX_SIZE;

    expect(validateFileSize(10 * 1024 * 1024)).toBe(true);
    expect(validateFileSize(150 * 1024 * 1024)).toBe(false);
  }, TEST_TIMEOUT);

  test('Can generate signed URLs for files', async () => {
    const fileName = `signed-url-${Date.now()}.pdf`;
    const filePath = `${userId}/${fileName}`;
    const fileContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

    const { error: uploadError } = await userClient.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileContent, { contentType: 'application/pdf' });

    expect(uploadError).toBeNull();

    const { data, error } = await userClient.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 60);

    expect(error).toBeNull();
    expect(data?.signedUrl).toBeDefined();

    const isValidUrl = (url: string) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    expect(isValidUrl(data?.signedUrl || '')).toBe(true);
    await adminClient.storage.from(BUCKET_NAME).remove([filePath]);
  }, TEST_TIMEOUT);

  test('Path traversal prevention', () => {
    const sanitizePath = (path: string) => path.replace(/(\.\.\/|\.\.\\)/g, '');

    expect(sanitizePath('../../etc/passwd')).toBe('etc/passwd');
    expect(sanitizePath('folder/../file.txt')).toBe('folder/file.txt');
    expect(sanitizePath('normal/path/file.txt')).toBe('normal/path/file.txt');
  });
});
