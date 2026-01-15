// Lightweight batch helper for P2.1
// Minimal, non-invasive implementation: types and pure helpers

export type WorkflowStatus = 'draft' | 'active' | 'signed' | 'completed' | 'cancelled' | 'archived';

export type Batch = {
  id: string;
  label?: string;
  assigned_signer_id?: string | null;
  fieldIds: string[];
  frozen?: boolean; // frozen when workflow activated or batch explicitly frozen
};

export function canMutateByWorkflow(status: WorkflowStatus) {
  return status === 'draft';
}

export function assignBatchToSigner(batch: Batch, signerId: string) {
  if (batch.frozen) throw new Error('Batch is frozen and cannot be assigned');
  batch.assigned_signer_id = signerId;
  return batch;
}

export function freezeBatch(batch: Batch) {
  batch.frozen = true;
  return batch;
}

export function unassignBatch(batch: Batch) {
  if (batch.frozen) throw new Error('Batch is frozen and cannot be modified');
  batch.assigned_signer_id = null;
  return batch;
}
