// tests/security/rls.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash, randomUUID } from 'crypto';

const adminClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('Row Level Security Tests', () => {
  let userAClient: SupabaseClient;
  let userBClient: SupabaseClient;
  let userAId: string;
  let userBId: string;
  let documentAId: string;

  beforeAll(async () => {
    const userAEmail = `user-a-${Date.now()}@test.com`;
    const userBEmail = `user-b-${Date.now()}@test.com`;

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

    const { data: doc, error: docError } = await userAClient
      .from('documents')
      .insert({
        owner_id: userAId,
        title: 'test-doc.pdf',
        original_filename: 'test-doc.pdf',
        eco_hash: 'abc123'
      })
      .select()
      .single();

    if (docError || !doc) throw docError ?? new Error('Failed to insert document');
    documentAId = doc.id;
  });

  it('User A puede ver sus propios documentos', async () => {
    const { data, error } = await userAClient
      .from('documents')
      .select('*')
      .eq('id', documentAId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].owner_id).toBe(userAId);
  });

  it('User B NO puede ver documentos de User A', async () => {
    const { data, error } = await userBClient
      .from('documents')
      .select('*')
      .eq('id', documentAId);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('User B NO puede actualizar documentos de User A', async () => {
    const { error } = await userBClient
      .from('documents')
      .update({ title: 'hacked' })
      .eq('id', documentAId);

    expect(error).not.toBeNull();
  });

  it('User B NO puede eliminar documentos de User A', async () => {
    const { error } = await userBClient
      .from('documents')
      .delete()
      .eq('id', documentAId);

    expect(error).not.toBeNull();
  });

  it('User A puede crear enlaces solo para sus propios documentos', async () => {
    const token = `test-token-${Date.now()}`;
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const { data, error } = await userAClient
      .from('links')
      .insert({
        document_id: documentAId,
        token_hash: tokenHash,
        require_nda: true
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.document_id).toBe(documentAId);
  });

  it('User B NO puede crear enlaces para documentos de User A', async () => {
    const tokenHash = createHash('sha256').update(`forbidden-${Date.now()}`).digest('hex');

    const { error } = await userBClient
      .from('links')
      .insert({
        document_id: documentAId,
        token_hash: tokenHash,
        require_nda: false
      });

    expect(error).not.toBeNull();
  });

  it('Anchors solo visibles para el owner del documento', async () => {
    await adminClient.from('anchors').insert({
      document_id: documentAId,
      chain: 'bitcoin',
      tx_id: `tx-${Date.now()}`,
      proof_url: 'https://example.com/proof'
    });

    const { data: dataA } = await userAClient
      .from('anchors')
      .select('*')
      .eq('document_id', documentAId);
    expect(dataA).toHaveLength(1);

    const { data: dataB } = await userBClient
      .from('anchors')
      .select('*')
      .eq('document_id', documentAId);
    expect(dataB).toHaveLength(0);
  });

  it('NDA acceptances solo visibles para quien crea el link', async () => {
    const { data: recipient } = await adminClient
      .from('recipients')
      .insert({
        document_id: documentAId,
        email: `recipient-${Date.now()}@test.com`,
        recipient_id: randomUUID()
      })
      .select()
      .single();

    const { data: acceptance } = await adminClient
      .from('nda_acceptances')
      .insert({
        recipient_id: recipient!.id,
        eco_nda_hash: 'nda-hash',
        ip_address: '1.2.3.4'
      })
      .select()
      .single();

    const { data: dataA } = await userAClient
      .from('nda_acceptances')
      .select('*')
      .eq('id', acceptance!.id);
    expect(dataA).toHaveLength(1);

    const { data: dataB } = await userBClient
      .from('nda_acceptances')
      .select('*')
      .eq('id', acceptance!.id);
    expect(dataB).toHaveLength(0);
  });

  afterAll(async () => {
    await adminClient.auth.admin.deleteUser(userAId);
    await adminClient.auth.admin.deleteUser(userBId);
  });
});
