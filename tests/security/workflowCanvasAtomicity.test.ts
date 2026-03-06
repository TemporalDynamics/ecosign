import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, test } from 'vitest';
import { assertDbTestEnv } from '../helpers/db-test-env';
import { createTestUser, deleteTestUser, getAdminClient } from '../helpers/supabase-test-helpers';

assertDbTestEnv({ requireRunDbIntegration: true });

const admin = getAdminClient();
const createdUserIds = new Set<string>();
const createdDocumentEntityIds = new Set<string>();

async function createDocumentEntity(ownerId: string, suffix: string) {
  const id = randomUUID();
  const hash = 'a'.repeat(64);

  const { error } = await admin.from('document_entities').insert({
    id,
    owner_id: ownerId,
    source_name: `atomic-${suffix}.pdf`,
    source_mime: 'application/pdf',
    source_size: 1024,
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

afterAll(async () => {
  for (const entityId of createdDocumentEntityIds) {
    await admin.from('workflow_fields').delete().eq('document_entity_id', entityId);
    await admin.from('batches').delete().eq('document_entity_id', entityId);
    await admin.from('signature_workflows').delete().eq('document_entity_id', entityId);
    await admin.from('document_entities').delete().eq('id', entityId);
  }

  for (const userId of createdUserIds) {
    await deleteTestUser(userId);
  }
});

describe('workflow canvas/fields atomic persistence', () => {
  test('persists canvas_snapshot + fields + batches atomically on success', async () => {
    const suffix = Date.now().toString(36);
    const ownerEmail = `atomic-owner-${suffix}@example.com`;
    const signerEmail = `atomic-signer-${suffix}@example.com`;
    const { userId, client: ownerClient } = await createTestUser(ownerEmail, 'P4ssword!123');
    createdUserIds.add(userId);

    const documentEntityId = await createDocumentEntity(userId, `${suffix}-ok`);
    const fieldId = randomUUID();
    const batchId = randomUUID();

    const { data, error } = await ownerClient.functions.invoke('start-signature-workflow', {
      body: {
        documentUrl: `${process.env.SUPABASE_URL}/storage/v1/object/public/user-documents/atomic-${suffix}.pdf`,
        documentHash: 'b'.repeat(64),
        originalFilename: `wf-atomic-ok-${suffix}.pdf`,
        documentEntityId,
        signers: [{ email: signerEmail, signingOrder: 1 }],
        forensicConfig: { rfc3161: true, polygon: false, bitcoin: false },
        deliveryMode: 'link',
        canvasSnapshot: {
          version: 1,
          pages: [{ page: 1, width: 1000, height: 1414 }],
        },
        workflowFields: [
          {
            external_field_id: fieldId,
            field_type: 'signature',
            position: { page: 1, x: 100, y: 200, width: 180, height: 48 },
            assigned_to: signerEmail,
            required: true,
            batch_id: batchId,
          },
        ],
      },
    });

    if (error) {
      throw new Error(`start-signature-workflow failed: ${error.message}`);
    }

    expect((data as any)?.success).toBe(true);
    const workflowId = (data as any)?.workflowId as string;
    expect(typeof workflowId).toBe('string');

    const { data: workflowRow, error: workflowErr } = await admin
      .from('signature_workflows')
      .select('id, canvas_snapshot, document_entity_id')
      .eq('id', workflowId)
      .single();

    if (workflowErr || !workflowRow) {
      throw new Error(`Failed to load workflow: ${workflowErr?.message}`);
    }

    expect(workflowRow.document_entity_id).toBe(documentEntityId);
    expect(workflowRow.canvas_snapshot).toBeTruthy();

    const { data: fieldRows, error: fieldErr } = await admin
      .from('workflow_fields')
      .select('external_field_id, document_entity_id, batch_id')
      .eq('document_entity_id', documentEntityId)
      .eq('external_field_id', fieldId);

    if (fieldErr) {
      throw new Error(`Failed to load workflow_fields: ${fieldErr.message}`);
    }

    expect(fieldRows?.length ?? 0).toBe(1);
    expect(fieldRows?.[0].batch_id).toBe(batchId);

    const { data: batchRows, error: batchErr } = await admin
      .from('batches')
      .select('id, document_entity_id')
      .eq('id', batchId)
      .eq('document_entity_id', documentEntityId);

    if (batchErr) {
      throw new Error(`Failed to load batches: ${batchErr.message}`);
    }
    expect(batchRows?.length ?? 0).toBe(1);
  });

  test('rolls back workflow creation when atomic RPC fails', async () => {
    const suffix = `${Date.now().toString(36)}-err`;
    const ownerEmail = `atomic-owner-${suffix}@example.com`;
    const signerEmail = `atomic-signer-${suffix}@example.com`;
    const { userId, client: ownerClient } = await createTestUser(ownerEmail, 'P4ssword!123');
    createdUserIds.add(userId);

    const documentEntityId = await createDocumentEntity(userId, `${suffix}-rollback`);
    const originalFilename = `wf-atomic-rollback-${suffix}.pdf`;

    const { data, error } = await ownerClient.functions.invoke('start-signature-workflow', {
      body: {
        documentUrl: `${process.env.SUPABASE_URL}/storage/v1/object/public/user-documents/atomic-${suffix}.pdf`,
        documentHash: 'c'.repeat(64),
        originalFilename,
        documentEntityId,
        signers: [{ email: signerEmail, signingOrder: 1 }],
        forensicConfig: { rfc3161: true, polygon: false, bitcoin: false },
        deliveryMode: 'link',
        canvasSnapshot: {
          version: 1,
          pages: [{ page: 1, width: 1000, height: 1414 }],
        },
        workflowFields: [
          {
            external_field_id: randomUUID(),
            field_type: 'signature',
            position: { page: 1, x: 100, y: 200, width: 180, height: 48 },
            assigned_to: signerEmail,
            required: true,
            batch_id: 'not-a-uuid', // forces RPC cast failure
          },
        ],
      },
    });

    // supabase-js may surface non-2xx as error or as data payload with error.
    expect(Boolean(error) || (data as any)?.error).toBe(true);

    const { data: leakedWorkflowRows, error: leakCheckErr } = await admin
      .from('signature_workflows')
      .select('id')
      .eq('original_filename', originalFilename);

    if (leakCheckErr) {
      throw new Error(`Failed to verify cleanup: ${leakCheckErr.message}`);
    }

    expect(leakedWorkflowRows?.length ?? 0).toBe(0);
  });
});
