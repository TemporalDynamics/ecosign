// tests/security/storage.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const adminClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = 'eco-files';
const PUBLIC_BUCKET = 'proofs';

describe('Storage Security Tests', () => {
  let userAClient: SupabaseClient;
  let userBClient: SupabaseClient;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    const userAEmail = `user-a-storage-${Date.now()}@test.com`;
    const userBEmail = `user-b-storage-${Date.now()}@test.com`;

    const { data: userA, error: userAError } = await adminClient.auth.admin.createUser({
      email: userAEmail,
      password: 'test123456',
      email_confirm: true
    });
    if (userAError || !userA.user) throw userAError ?? new Error('Failed to create user A');
    userAId = userA.user.id;

    const { data: userB, error: userBError } = await adminClient.auth.admin.createUser({
      email: userBEmail,
      password: 'test123456',
      email_confirm: true
    });
    if (userBError || !userB.user) throw userBError ?? new Error('Failed to create user B');
    userBId = userB.user.id;

    const { data: sessionA, error: sessionAError } = await adminClient.auth.signInWithPassword({
      email: userAEmail,
      password: 'test123456'
    });
    if (sessionAError || !sessionA.session) throw sessionAError ?? new Error('Failed to sign in user A');

    userAClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${sessionA.session.access_token}` } } }
    );

    const { data: sessionB, error: sessionBError } = await adminClient.auth.signInWithPassword({
      email: userBEmail,
      password: 'test123456'
    });
    if (sessionBError || !sessionB.session) throw sessionBError ?? new Error('Failed to sign in user B');

    userBClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${sessionB.session.access_token}` } } }
    );
  });

  it('User A puede subir archivos a su carpeta personal', async () => {
    const filePath = `${userAId}/test.eco`;
    const file = new File(['test content'], 'test.eco', { type: 'application/octet-stream' });

    const { error } = await userAClient.storage.from(BUCKET).upload(filePath, file, { upsert: true });

    expect(error).toBeNull();
  }, 20000);

  it('User A NO puede subir a la carpeta de User B', async () => {
    const filePath = `${userBId}/test.eco`;
    const file = new File(['malicious'], 'test.eco', { type: 'application/octet-stream' });

    const { error } = await userAClient.storage.from(BUCKET).upload(filePath, file);

    expect(error).not.toBeNull();
  }, 20000);

  it('User B NO puede leer archivos de User A', async () => {
    const filePath = `${userAId}/private.eco`;
    await userAClient.storage.from(BUCKET).upload(filePath, new File(['secret'], 'private.eco'), { upsert: true });

    const { error } = await userBClient.storage.from(BUCKET).download(filePath);

    expect(error).not.toBeNull();
  }, 20000);

  it('User B NO puede eliminar archivos de User A', async () => {
    const filePath = `${userAId}/to-delete.eco`;
    await userAClient.storage.from(BUCKET).upload(filePath, new File(['test'], 'to-delete.eco'), { upsert: true });

    const { error } = await userBClient.storage.from(BUCKET).remove([filePath]);

    expect(error).not.toBeNull();
  }, 20000);

  it('Archivos en bucket proofs son públicos para lectura', async () => {
    const proofPath = `public-proof-${Date.now()}.txt`;

    await adminClient.storage.from(PUBLIC_BUCKET).upload(proofPath, new File(['proof'], 'proof.txt'), { upsert: true });

    const anonClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    const { data, error } = await anonClient.storage.from(PUBLIC_BUCKET).download(proofPath);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  }, 20000);

  it('Signed URLs expiran correctamente', async () => {
    const filePath = `${userAId}/timed.eco`;
    await userAClient.storage.from(BUCKET).upload(filePath, new File(['test'], 'timed.eco'), { upsert: true });

    const { data, error } = await userAClient.storage.from(BUCKET).createSignedUrl(filePath, 2);
    expect(error).toBeNull();
    const signedUrl = data?.signedUrl;
    expect(signedUrl).toBeDefined();

    const response1 = await fetch(signedUrl!);
    expect(response1.ok).toBe(true);

    await new Promise(resolve => setTimeout(resolve, 3000));

    const response2 = await fetch(signedUrl!);
    expect(response2.ok).toBe(false);
  }, 20000);

  it('Temp uploads bucket existe y no es público', async () => {
    const { data, error } = await adminClient.storage.getBucket('temp-uploads');
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.public).toBe(false);
  });

  afterAll(async () => {
    await adminClient.auth.admin.deleteUser(userAId);
    await adminClient.auth.admin.deleteUser(userBId);

    const { data: files } = await adminClient.storage.from(BUCKET).list(userAId);
    if (files) {
      const paths = files.map(f => `${userAId}/${f.name}`);
      await adminClient.storage.from(BUCKET).remove(paths);
    }
  });
});
