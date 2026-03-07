import { createHash, randomUUID } from 'node:crypto';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { afterAll, describe, expect, test } from 'vitest';
import { assertDbTestEnv } from '../helpers/db-test-env';
import { createTestUser, deleteTestUser, getAdminClient } from '../helpers/supabase-test-helpers';

assertDbTestEnv({ requireRunDbIntegration: true });

const admin = getAdminClient();
const createdUserIds = new Set<string>();
const createdWorkflowIds = new Set<string>();
const createdDocumentEntityIds = new Set<string>();
const createdStoragePaths = new Set<string>();

async function createPdfBytes(label: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText(`Race test: ${label}`, {
    x: 60,
    y: 760,
    size: 18,
    font,
  });
  return await doc.save();
}

function sha256Hex(input: Uint8Array): string {
  return createHash('sha256').update(input).digest('hex');
}

async function uploadWorkflowPdf(ownerId: string, suffix: string): Promise<{ storagePath: string; hash: string; publicUrl: string }> {
  const pdfBytes = await createPdfBytes(suffix);
  const hash = sha256Hex(pdfBytes);
  const storagePath = `${ownerId}/race/${suffix}.pdf`;

  const { error } = await admin
    .storage
    .from('user-documents')
    .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true });

  if (error) {
    throw new Error(`Failed to upload PDF fixture: ${error.message}`);
  }

  createdStoragePaths.add(storagePath);
  const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/user-documents/${storagePath}`;
  return { storagePath, hash, publicUrl };
}

async function createDocumentEntity(ownerId: string, suffix: string, hash: string) {
  const id = randomUUID();
  const { error } = await admin.from('document_entities').insert({
    id,
    owner_id: ownerId,
    source_name: `race-${suffix}.pdf`,
    source_mime: 'application/pdf',
    source_size: 2048,
    source_hash: hash,
    custody_mode: 'hash_only',
    lifecycle_status: 'protected',
    witness_hash: hash,
    witness_current_hash: hash,
    witness_current_mime: 'application/pdf',
    witness_current_status: 'generated',
  });

  if (error) {
    throw new Error(`Failed to create document_entity: ${error.message}`);
  }

  createdDocumentEntityIds.add(id);
  return id;
}

function extractSignerToken(firstSignerUrl: string | null | undefined): string {
  if (!firstSignerUrl) throw new Error('Missing firstSignerUrl');
  const marker = '/sign/';
  const idx = firstSignerUrl.lastIndexOf(marker);
  if (idx < 0) throw new Error(`Invalid signer URL: ${firstSignerUrl}`);
  const token = firstSignerUrl.slice(idx + marker.length).trim();
  if (!token) throw new Error(`Missing token in signer URL: ${firstSignerUrl}`);
  return token;
}

async function waitFor<T>(fn: () => Promise<T>, predicate: (value: T) => boolean, retries = 20, delayMs = 120): Promise<T> {
  let last: T | null = null;
  for (let i = 0; i < retries; i += 1) {
    const value = await fn();
    last = value;
    if (predicate(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return last as T;
}

async function postFunction(
  functionName: string,
  body: Record<string, unknown>,
  bearerToken: string
): Promise<{ status: number; body: any }> {
  const resp = await fetch(`${process.env.SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: process.env.SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify(body),
  });

  const payload = await resp.json().catch(() => ({}));
  return { status: resp.status, body: payload };
}

async function createSingleSignerWorkflow(suffix: string) {
  const ownerEmail = `race-owner-${suffix}@example.com`;
  const signerEmail = `race-signer-${suffix}@example.com`;
  const { userId, client: ownerClient } = await createTestUser(ownerEmail, 'P4ssword!123');
  createdUserIds.add(userId);

  const { hash, publicUrl } = await uploadWorkflowPdf(userId, suffix);
  const documentEntityId = await createDocumentEntity(userId, suffix, hash);
  const batchId = randomUUID();
  const fieldId = randomUUID();

  const { data, error } = await ownerClient.functions.invoke('start-signature-workflow', {
    body: {
      documentUrl: publicUrl,
      documentHash: hash,
      originalFilename: `race-${suffix}.pdf`,
      documentEntityId,
      signers: [
        { email: signerEmail, signingOrder: 1, requireLogin: false, quickAccess: true },
      ],
      forensicConfig: { rfc3161: true, polygon: false, bitcoin: false },
      deliveryMode: 'link',
      requireSequential: true,
      workflowFields: [
        {
          external_field_id: fieldId,
          field_type: 'signature',
          position: { page: 1, x: 0.2, y: 0.75, width: 0.25, height: 0.07 },
          assigned_to: signerEmail,
          required: true,
          batch_id: batchId,
        },
      ],
      canvasSnapshot: {
        version: 1,
        pages: [{ page: 1, width: 595, height: 842 }],
      },
    },
  });

  if (error || !(data as any)?.success) {
    throw new Error(`start-signature-workflow failed: ${error?.message ?? JSON.stringify(data)}`);
  }

  const workflowId = (data as any).workflowId as string;
  createdWorkflowIds.add(workflowId);
  const signerToken = extractSignerToken((data as any).firstSignerUrl);

  const signerRow = await waitFor(
    async () => {
      const { data: signerData, error: signerErr } = await admin
        .from('workflow_signers')
        .select('id, status')
        .eq('workflow_id', workflowId)
        .order('signing_order', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (signerErr) throw new Error(`Failed to load signer row: ${signerErr.message}`);
      return signerData as { id: string; status: string } | null;
    },
    (row) => Boolean(row && row.status === 'ready_to_sign'),
  );

  if (!signerRow) {
    throw new Error('Signer row not found after workflow creation');
  }

  const ownerSession = await ownerClient.auth.getSession();
  const ownerJwt = ownerSession.data.session?.access_token;
  if (!ownerJwt) {
    throw new Error('Failed to obtain owner JWT');
  }

  return {
    workflowId,
    signerId: signerRow.id,
    signerToken,
    ownerJwt,
    batchId,
  };
}

afterAll(async () => {
  for (const workflowId of createdWorkflowIds) {
    await admin.from('signature_application_events').delete().eq('workflow_id', workflowId);
    await admin.from('signature_instances').delete().eq('workflow_id', workflowId);
    await admin.from('workflow_notifications').delete().eq('workflow_id', workflowId);
    await admin.from('workflow_events').delete().eq('workflow_id', workflowId);
    await admin.from('workflow_signers').delete().eq('workflow_id', workflowId);
    await admin.from('workflow_versions').delete().eq('workflow_id', workflowId);
    await admin.from('signature_workflows').delete().eq('id', workflowId);
  }

  for (const entityId of createdDocumentEntityIds) {
    await admin.from('workflow_fields').delete().eq('document_entity_id', entityId);
    await admin.from('batches').delete().eq('document_entity_id', entityId);
    await admin.from('document_entities').delete().eq('id', entityId);
  }

  if (createdStoragePaths.size > 0) {
    await admin.storage.from('user-documents').remove(Array.from(createdStoragePaths));
  }

  for (const userId of createdUserIds) {
    await deleteTestUser(userId);
  }
});

describe('workflow signing concurrency/race contracts', () => {
  test('concurrent apply-signer-signature calls are idempotent (single signer.signed)', async () => {
    const suffix = `${Date.now().toString(36)}-dupe`;
    const { workflowId, signerId, signerToken, batchId } = await createSingleSignerWorkflow(suffix);

    const payload = {
      workflowId,
      signerId,
      accessToken: signerToken,
      witness_pdf_hash: 'f'.repeat(64),
      applied_at: new Date().toISOString(),
      identity_level: 'account_authenticated',
      signatureData: {},
      fieldValues: {},
    };

    const results = await Promise.all([
      postFunction('apply-signer-signature', payload, process.env.SUPABASE_ANON_KEY!),
      postFunction('apply-signer-signature', payload, process.env.SUPABASE_ANON_KEY!),
      postFunction('apply-signer-signature', payload, process.env.SUPABASE_ANON_KEY!),
    ]);

    const successCount = results.filter((r) => r.status === 200 && r.body?.success === true).length;
    expect(successCount).toBeGreaterThanOrEqual(1);
    expect(results.every((r) => r.status < 500)).toBe(true);

    const signerStatus = await waitFor(
      async () => {
        const { data, error } = await admin
          .from('workflow_signers')
          .select('status')
          .eq('id', signerId)
          .single();
        if (error) throw new Error(`Failed to fetch signer status: ${error.message}`);
        return data.status as string;
      },
      (status) => status === 'signed',
    );

    expect(signerStatus).toBe('signed');

    const { count: signedEventCount, error: signedEventErr } = await admin
      .from('workflow_events')
      .select('id', { count: 'exact', head: true })
      .eq('workflow_id', workflowId)
      .eq('signer_id', signerId)
      .eq('event_type', 'signer.signed');

    if (signedEventErr) {
      throw new Error(`Failed to count signer.signed events: ${signedEventErr.message}`);
    }
    expect(signedEventCount ?? 0).toBe(1);

    const { count: signatureInstancesCount, error: signatureInstancesErr } = await admin
      .from('signature_instances')
      .select('id', { count: 'exact', head: true })
      .eq('workflow_id', workflowId)
      .eq('signer_id', signerId)
      .eq('batch_id', batchId);

    if (signatureInstancesErr) {
      throw new Error(`Failed to count signature_instances: ${signatureInstancesErr.message}`);
    }
    expect(signatureInstancesCount ?? 0).toBe(1);

    // Re-entry/retry after terminal signed state must not duplicate side effects.
    const retryResult = await postFunction('apply-signer-signature', payload, process.env.SUPABASE_ANON_KEY!);
    expect(retryResult.status).toBeLessThan(500);

    const { count: signedEventCountAfterRetry, error: signedEventRetryErr } = await admin
      .from('workflow_events')
      .select('id', { count: 'exact', head: true })
      .eq('workflow_id', workflowId)
      .eq('signer_id', signerId)
      .eq('event_type', 'signer.signed');

    if (signedEventRetryErr) {
      throw new Error(`Failed to count signer.signed events after retry: ${signedEventRetryErr.message}`);
    }
    expect(signedEventCountAfterRetry ?? 0).toBe(1);

    const { count: signatureInstancesAfterRetry, error: signatureInstancesRetryErr } = await admin
      .from('signature_instances')
      .select('id', { count: 'exact', head: true })
      .eq('workflow_id', workflowId)
      .eq('signer_id', signerId)
      .eq('batch_id', batchId);

    if (signatureInstancesRetryErr) {
      throw new Error(`Failed to count signature_instances after retry: ${signatureInstancesRetryErr.message}`);
    }
    expect(signatureInstancesAfterRetry ?? 0).toBe(1);
  }, 20_000);

  test('cancel + sign race closes without server errors and without duplicate terminal events', async () => {
    const suffix = `${Date.now().toString(36)}-cancel-race`;
    const { workflowId, signerId, signerToken, ownerJwt } = await createSingleSignerWorkflow(suffix);

    const signPayload = {
      workflowId,
      signerId,
      accessToken: signerToken,
      witness_pdf_hash: 'e'.repeat(64),
      applied_at: new Date().toISOString(),
      identity_level: 'account_authenticated',
      signatureData: {},
      fieldValues: {},
    };

    const [signResult, cancelResult] = await Promise.all([
      postFunction('apply-signer-signature', signPayload, process.env.SUPABASE_ANON_KEY!),
      postFunction('cancel-workflow', { workflowId }, ownerJwt),
    ]);

    expect(signResult.status).toBeLessThan(500);
    expect(cancelResult.status).toBeLessThan(500);

    const { count: signedEventCount, error: signedEventErr } = await admin
      .from('workflow_events')
      .select('id', { count: 'exact', head: true })
      .eq('workflow_id', workflowId)
      .eq('signer_id', signerId)
      .eq('event_type', 'signer.signed');

    if (signedEventErr) {
      throw new Error(`Failed to count signer.signed events: ${signedEventErr.message}`);
    }
    expect(signedEventCount ?? 0).toBeLessThanOrEqual(1);

    const { count: cancelledEventCount, error: cancelledEventErr } = await admin
      .from('workflow_events')
      .select('id', { count: 'exact', head: true })
      .eq('workflow_id', workflowId)
      .eq('event_type', 'workflow.cancelled');

    if (cancelledEventErr) {
      throw new Error(`Failed to count workflow.cancelled events: ${cancelledEventErr.message}`);
    }
    expect(cancelledEventCount ?? 0).toBeLessThanOrEqual(1);
  }, 15_000);
});
