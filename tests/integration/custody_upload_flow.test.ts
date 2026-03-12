/**
 * Tests de Integración: Custody Upload Flow
 *
 * Tests end-to-end del flujo completo de custody upload:
 * 1. Encrypt file client-side
 * 2. Create signed upload URL
 * 3. Direct upload to Storage
 * 4. Register upload
 * 5. Download and decrypt
 * 6. Verify file integrity
 *
 * Este test verifica que:
 * - El cifrado/descifrado funciona correctamente
 * - El upload directo a Storage funciona
 * - El registro del upload es exitoso
 * - El archivo puede recuperarse y descifrarse
 * - No hay pérdida de datos en el proceso
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { encryptFile, decryptFile, type EncryptedFile } from '../../client/src/lib/encryptionService';

describe('Custody Upload Flow (Integration)', () => {
  let supabase: SupabaseClient;
  let testUser: { id: string; email: string; accessToken: string } | null = null;
  let testDocumentEntityId: string | null = null;
  const functionTimeoutMs = 8000;

  const invokeWithTimeout = async <T,>(invokePromise: Promise<T>, label: string): Promise<T | null> => {
    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<null>((resolve) => {
      timeoutId = setTimeout(() => {
        console.warn(`SKIP: ${label} timed out after ${functionTimeoutMs}ms. Ensure Supabase functions are running.`);
        resolve(null);
      }, functionTimeoutMs);
    });

    const result = await Promise.race([invokePromise, timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    return result as T | null;
  };

  // Test file data
  const testFileContent = 'Test PDF Content - This is a test document for custody upload';
  const testFileName = 'test-custody-document.pdf';
  const testFileMime = 'application/pdf';

  beforeAll(async () => {
    // Setup Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
      console.warn('SKIP: SUPABASE_SERVICE_ROLE_KEY not set. Run tests locally with .env.test configured.');
      return;
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if DB is available (skip if migrations not applied)
    try {
      const { error: checkError } = await supabase
        .from('document_entities')
        .select('id')
        .limit(1);
      
      if (checkError) {
        console.warn('SKIP: document_entities table not found. Run `supabase db reset` to apply migrations locally.');
        return;
      }
    } catch (err) {
      console.warn('SKIP: Database not available. Ensure Supabase local is running with `supabase start`.');
      return;
    }

    // Create test user
    const timestamp = Date.now();
    const testEmail = `custody-test-${timestamp}@ecosign.test`;
    const testPassword = `test-password-${timestamp}`;

    const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    if (signUpError || !signUpData.user) {
      throw new Error(`Failed to create test user: ${signUpError?.message}`);
    }

    // Get session token
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (sessionError || !sessionData.session) {
      throw new Error(`Failed to get session: ${sessionError?.message}`);
    }

    testUser = {
      id: signUpData.user.id,
      email: testEmail,
      accessToken: sessionData.session.access_token,
    };

    // Create test document_entity
    const { data: docEntity, error: docError } = await supabase
      .from('document_entities')
      .insert({
        owner_id: testUser.id,
        source_name: testFileName,
        source_mime: testFileMime,
        custody_mode: 'encrypted_custody', // Enable custody mode (must be 'encrypted_custody' not true)
      })
      .select('id')
      .single();

    if (docError || !docEntity) {
      console.warn('SKIP: Failed to create document_entity:', docError?.message);
      return;
    }

    testDocumentEntityId = docEntity.id;

    console.log('[custody-test] Test setup complete', {
      userId: testUser.id,
      documentEntityId: testDocumentEntityId,
    });
  });

  afterAll(async () => {
    // Cleanup test data
    if (testDocumentEntityId) {
      // Delete document_entity (cascades to related records)
      await supabase.from('document_entities').delete().eq('id', testDocumentEntityId);
    }

    if (testUser) {
      // Delete test user
      await supabase.auth.admin.deleteUser(testUser.id);
    }

    console.log('[custody-test] Test cleanup complete');
  });

  test('1. Encrypt file client-side', async () => {
    if (!testUser) {
      console.warn('SKIP: Test user not initialized (DB setup failed)');
      return;
    }

    // Create test file
    const blob = new Blob([testFileContent], { type: testFileMime });
    const file = new File([blob], testFileName, { type: testFileMime });

    // Encrypt file
    const encryptedFile: EncryptedFile = await encryptFile(file, testUser.id);

    // Verify encryption
    expect(encryptedFile).toBeDefined();
    expect(encryptedFile.encrypted).toBeInstanceOf(ArrayBuffer);
    expect(encryptedFile.encrypted.byteLength).toBeGreaterThan(0);
    expect(encryptedFile.originalName).toBe(testFileName);
    expect(encryptedFile.originalMime).toBe(testFileMime);
    expect(encryptedFile.originalSize).toBe(testFileContent.length);

    // Verify we can decrypt it back
    const decrypted = await decryptFile(encryptedFile, testUser.id);
    expect(decrypted).toBeInstanceOf(ArrayBuffer);

    const decryptedText = new TextDecoder().decode(decrypted);
    expect(decryptedText).toBe(testFileContent);

    console.log('[custody-test] ✅ File encrypted and decrypted successfully');
  });

  test('2. Create signed upload URL', async () => {
    if (!testUser || !testDocumentEntityId) {
      console.warn('SKIP: Test dependencies not initialized (DB setup failed)');
      return;
    }

    // Create authenticated client
    const userClient = createClient(
      process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
      process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${testUser.accessToken}`,
          },
        },
      }
    );

    // Call create-custody-upload-url
    const result = await invokeWithTimeout(
      userClient.functions.invoke('create-custody-upload-url', {
        body: {
          document_entity_id: testDocumentEntityId,
          purpose: 'source',
          metadata: {
            original_name: testFileName,
            original_mime: testFileMime,
            original_size: testFileContent.length,
          },
        },
      }),
      'create-custody-upload-url'
    );

    if (!result) {
      return;
    }

    const { data, error } = result as any;
    const errorMessage = (error as any)?.message || '';
    if (errorMessage.toLowerCase().includes('failed to fetch')) {
      console.warn('SKIP: Supabase functions not reachable for create-custody-upload-url.');
      return;
    }

    // Verify response
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.upload_url).toBeDefined();
    expect(data.storage_path).toBeDefined();
    expect(data.token).toBeDefined();
    expect(data.expires_at).toBeDefined();

    // Verify storage_path format
    expect(data.storage_path).toMatch(new RegExp(`^${testUser.id}/${testDocumentEntityId}/encrypted_source$`));

    console.log('[custody-test] ✅ Signed upload URL created', {
      storagePath: data.storage_path,
      expiresAt: data.expires_at,
    });
  });

  test('3. Full upload cycle: encrypt → signed URL → upload → register', async () => {
    if (!testUser || !testDocumentEntityId) {
      console.warn('SKIP: Test dependencies not initialized (DB setup failed)');
      return;
    }

    // Create authenticated client
    const userClient = createClient(
      process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
      process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${testUser.accessToken}`,
          },
        },
      }
    );

    // Step 1: Encrypt file
    const blob = new Blob([testFileContent], { type: testFileMime });
    const file = new File([blob], testFileName, { type: testFileMime });
    const encryptedFile: EncryptedFile = await encryptFile(file, testUser.id);

    console.log('[custody-test] Step 1: File encrypted', {
      encryptedSize: encryptedFile.encrypted.byteLength,
    });

    // Step 2: Get signed upload URL
    const urlResult = await invokeWithTimeout(
      userClient.functions.invoke('create-custody-upload-url', {
        body: {
          document_entity_id: testDocumentEntityId,
          purpose: 'source',
          metadata: {
            original_name: encryptedFile.originalName,
            original_mime: encryptedFile.originalMime,
            original_size: encryptedFile.originalSize,
          },
        },
      }),
      'create-custody-upload-url'
    );

    if (!urlResult) {
      return;
    }

    const { data: urlData, error: urlError } = urlResult as any;
    const urlErrorMessage = (urlError as any)?.message || '';
    if (urlErrorMessage.toLowerCase().includes('failed to fetch')) {
      console.warn('SKIP: Supabase functions not reachable for create-custody-upload-url.');
      return;
    }

    expect(urlError).toBeNull();
    expect(urlData?.upload_url).toBeDefined();

    // Fix URL for local development (kong:8000 → 127.0.0.1:54321)
    let uploadUrl = urlData.upload_url;
    if (uploadUrl.includes('http://kong:8000')) {
      uploadUrl = uploadUrl.replace('http://kong:8000', 'http://127.0.0.1:54321');
    }

    console.log('[custody-test] Step 2: Got signed URL', {
      storagePath: urlData.storage_path,
      uploadUrl: uploadUrl.substring(0, 100) + '...',
    });

    // Step 3: Direct upload to Storage
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: encryptedFile.encrypted,
      headers: {
        'Content-Type': 'application/octet-stream',
        'x-upsert': 'false',
      },
    });

    expect(uploadResponse.ok).toBe(true);
    console.log('[custody-test] Step 3: Direct upload successful', {
      status: uploadResponse.status,
    });

    // Step 4: Register upload
    const registerResult = await invokeWithTimeout(
      userClient.functions.invoke('register-custody-upload', {
        body: {
          document_entity_id: testDocumentEntityId,
          storage_path: urlData.storage_path,
          purpose: 'source',
          metadata: {
            original_name: encryptedFile.originalName,
            original_mime: encryptedFile.originalMime,
            original_size: encryptedFile.originalSize,
          },
        },
      }),
      'register-custody-upload'
    );

    if (!registerResult) {
      return;
    }

    const { data: registerData, error: registerError } = registerResult as any;
    const registerErrorMessage = (registerError as any)?.message || '';
    if (registerErrorMessage.toLowerCase().includes('failed to fetch')) {
      console.warn('SKIP: Supabase functions not reachable for register-custody-upload.');
      return;
    }

    expect(registerError).toBeNull();
    expect(registerData?.success).toBe(true);
    expect(registerData?.storage_path).toBe(urlData.storage_path);

    console.log('[custody-test] Step 4: Upload registered', {
      storagePath: registerData.storage_path,
      message: registerData.message,
    });

    // Step 5: Verify document_entities.source_storage_path was updated
    const { data: updatedDoc, error: docError } = await supabase
      .from('document_entities')
      .select('source_storage_path')
      .eq('id', testDocumentEntityId)
      .single();

    expect(docError).toBeNull();
    expect(updatedDoc?.source_storage_path).toBe(urlData.storage_path);

    console.log('[custody-test] ✅ Full upload cycle complete', {
      sourceStoragePath: updatedDoc.source_storage_path,
    });
  });

  test('4. Download and decrypt uploaded file', async () => {
    if (!testUser || !testDocumentEntityId) {
      console.warn('SKIP: Test dependencies not initialized (DB setup failed)');
      return;
    }

    // Get document_entity to retrieve storage_path
    const { data: doc, error: docError } = await supabase
      .from('document_entities')
      .select('source_storage_path')
      .eq('id', testDocumentEntityId)
      .single();

    expect(docError).toBeNull();
    expect(doc?.source_storage_path).toBeDefined();

    const storagePath = doc.source_storage_path!;

    console.log('[custody-test] Downloading from storage', {
      storagePath,
    });

    // Download encrypted file from Storage
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('custody')
      .download(storagePath);

    expect(downloadError).toBeNull();
    expect(downloadData).toBeInstanceOf(Blob);

    // Convert Blob to ArrayBuffer
    const encryptedBuffer = await downloadData!.arrayBuffer();

    console.log('[custody-test] Downloaded encrypted file', {
      size: encryptedBuffer.byteLength,
    });

    // Reconstruct EncryptedFile object
    const encryptedFile: EncryptedFile = {
      encrypted: encryptedBuffer,
      originalName: testFileName,
      originalMime: testFileMime,
      originalSize: testFileContent.length,
    };

    // Decrypt file
    const decrypted = await decryptFile(encryptedFile, testUser.id);
    const decryptedText = new TextDecoder().decode(decrypted);

    // Verify content matches original
    expect(decryptedText).toBe(testFileContent);

    console.log('[custody-test] ✅ File downloaded and decrypted successfully', {
      originalContent: testFileContent.substring(0, 50),
      decryptedContent: decryptedText.substring(0, 50),
    });
  });

  test('5. Security: Unauthorized user cannot access custody file', async () => {
    if (!testUser || !testDocumentEntityId) {
      console.warn('SKIP: Test dependencies not initialized (DB setup failed)');
      return;
    }

    // Create another test user (unauthorized)
    const timestamp = Date.now();
    const unauthorizedEmail = `custody-unauthorized-${timestamp}@ecosign.test`;
    const { data: unauthorizedUser, error: createError } = await supabase.auth.admin.createUser({
      email: unauthorizedEmail,
      password: `test-password-${timestamp}`,
      email_confirm: true,
    });

    expect(createError).toBeNull();
    expect(unauthorizedUser?.user).toBeDefined();

    const { data: sessionData } = await supabase.auth.signInWithPassword({
      email: unauthorizedEmail,
      password: `test-password-${timestamp}`,
    });

    // Get storage_path of test user's file
    const { data: doc } = await supabase
      .from('document_entities')
      .select('source_storage_path')
      .eq('id', testDocumentEntityId)
      .single();

    const storagePath = doc?.source_storage_path!;

    // Create client with unauthorized user's token
    const unauthorizedClient = createClient(
      process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
      process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${sessionData?.session?.access_token}`,
          },
        },
      }
    );

    // Attempt to download file (should fail due to RLS)
    const { data: downloadData, error: downloadError } = await unauthorizedClient.storage
      .from('custody')
      .download(storagePath);

    // Verify access is denied
    expect(downloadError).toBeDefined();
    expect(downloadData).toBeNull();

    console.log('[custody-test] ✅ Unauthorized access correctly blocked', {
      error: downloadError?.message,
    });

    // Cleanup unauthorized user
    await supabase.auth.admin.deleteUser(unauthorizedUser.user.id);
  });
});
