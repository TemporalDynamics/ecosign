type CustodyAccessType = 'upload' | 'download' | 'decrypt' | 'share';

type CustodyAccessInput = {
  document_entity_id: string;
  accessed_by: string | null;
  access_type: CustodyAccessType;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown> | null;
};

type CustodyRotationInput = {
  document_entity_id: string;
  rotated_by?: string | null;
  previous_key_id?: string | null;
  new_key_id: string;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function logCustodyAccess(
  supabase: any,
  input: CustodyAccessInput,
): Promise<void> {
  const payload = {
    document_entity_id: input.document_entity_id,
    accessed_by: input.accessed_by,
    access_type: input.access_type,
    ip_address: input.ip_address ?? null,
    user_agent: input.user_agent ?? null,
    metadata: input.metadata ?? null,
  };

  const { error } = await supabase.from('custody_access_log').insert(payload);
  if (error) {
    console.warn('[custody_access_log] insert failed (non-critical):', error);
  }
}

export async function logCustodyKeyRotation(
  supabase: any,
  input: CustodyRotationInput,
): Promise<void> {
  const payload = {
    document_entity_id: input.document_entity_id,
    rotated_by: input.rotated_by ?? null,
    previous_key_id: input.previous_key_id ?? null,
    new_key_id: input.new_key_id,
    reason: input.reason ?? null,
    metadata: input.metadata ?? null,
  };

  const { error } = await supabase.from('custody_key_rotations').insert(payload);
  if (error) {
    console.warn('[custody_key_rotations] insert failed (non-critical):', error);
  }
}
