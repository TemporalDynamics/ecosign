import { canonicalize, round4, sha256Hex } from './canonicalHash.ts';

type WorkflowFieldRow = {
  external_field_id: string | null;
  field_type: 'signature' | 'text' | 'date';
  position: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  required: boolean;
  assigned_signer_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function buildCanonicalFieldSchemaV1(params: {
  workflow_id: string;
  document_entity_id: string;
  fields: WorkflowFieldRow[];
}) {
  const fields = (params.fields || [])
    .filter((f) => f.external_field_id)
    .map((f) => {
      const meta = (f.metadata || {}) as Record<string, unknown>;
      const rules: Record<string, unknown> = {};
      if (typeof meta.format === 'string') rules.format = meta.format;
      if (typeof meta.max_length === 'number') rules.max_length = meta.max_length;
      return {
        field_id: f.external_field_id as string,
        type: f.field_type,
        page: f.position.page,
        rect: {
          x: round4(f.position.x),
          y: round4(f.position.y),
          w: round4(f.position.width),
          h: round4(f.position.height),
        },
        required: Boolean(f.required),
        assigned_signer_id: f.assigned_signer_id ?? null,
        rules,
      };
    })
    .sort((a, b) => a.field_id.localeCompare(b.field_id));

  return {
    version: 'field_schema.v1',
    workflow_id: params.workflow_id,
    document_entity_id: params.document_entity_id,
    fields,
  };
}

export async function hashCanonicalFieldSchemaV1(schema: ReturnType<typeof buildCanonicalFieldSchemaV1>) {
  return sha256Hex(canonicalize(schema));
}
