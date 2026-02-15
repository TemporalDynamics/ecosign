import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { appendEvent } from '../_shared/eventHelper.ts';

type SubmitAnchorRequest = {
  document_entity_id: string;
  document_id?: string;
  witness_hash?: string;
  anchor_stage?: 'initial' | 'intermediate' | 'final';
  step_index?: number;
  correlation_id?: string;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FUNCTIONS_URL = `${SUPABASE_URL.replace(/\/+$/, '')}/functions/v1`;

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

async function callFunction(name: string, body: Record<string, unknown>) {
  const response = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (data as { error?: string }).error || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return data as Record<string, unknown>;
}

async function emitEvent(
  supabase: ReturnType<typeof createClient>,
  documentEntityId: string,
  event: { kind: string; at: string },
  source: string,
): Promise<void> {
  const result = await appendEvent(supabase, documentEntityId, event, source);
  if (!result.success) {
    throw new Error(result.error ?? 'Failed to append event');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204 });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const body = (await req.json().catch(() => ({}))) as Partial<SubmitAnchorRequest>;
  const documentEntityId = String(body.document_entity_id ?? '');

  // Validate correlation_id: canonical rule is correlation_id = document_entity_id
  let correlationId = body.correlation_id || documentEntityId;
  if (correlationId && correlationId !== documentEntityId) {
    console.warn('[submit-anchor-bitcoin] correlation_id mismatch - overriding to canonical', {
      received_correlation_id: correlationId,
      document_entity_id: documentEntityId,
    });
    correlationId = documentEntityId;
  }

  if (!documentEntityId) {
    return jsonResponse({ error: 'document_entity_id required' }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: entity, error: entityError } = await supabase
    .from('document_entities')
    .select('id, witness_hash, events')
    .eq('id', documentEntityId)
    .single();

  if (entityError || !entity) {
    return jsonResponse({ error: 'document_entity not found' }, 404);
  }

  const events = Array.isArray(entity.events) ? entity.events : [];

  const witnessHash = String(body.witness_hash ?? entity.witness_hash ?? '');
  if (!witnessHash) {
    await emitEvent(
      supabase,
      documentEntityId,
      { kind: 'anchor.failed', at: new Date().toISOString() },
      'submit-anchor-bitcoin',
    );
    return jsonResponse({ error: 'witness_hash missing' }, 400);
  }

  const hasTsaForHash = events.some((event: { kind?: string; witness_hash?: string }) =>
    event.kind === 'tsa.confirmed' && event.witness_hash === witnessHash
  );
  if (!hasTsaForHash) {
    return jsonResponse({ error: 'precondition_failed:missing_tsa_for_witness_hash' }, 409);
  }

  try {
    await callFunction('anchor-bitcoin', {
      documentHash: witnessHash,
      documentEntityId,
      documentId: body.document_id ?? null,
      metadata: { source: 'executor_v2' },
    });

    await emitEvent(
      supabase,
      documentEntityId,
      {
        kind: 'anchor.pending',
        at: new Date().toISOString(),
        correlation_id: correlationId,  // NUEVO: heredado del job
        anchor: {
          network: 'bitcoin',
          witness_hash: witnessHash,
          anchor_stage: body.anchor_stage ?? 'initial',
          step_index: body.step_index ?? 0
        }
      },
      'submit-anchor-bitcoin',
    );

    return jsonResponse({ success: true });
  } catch (error) {
    await emitEvent(
      supabase,
      documentEntityId,
      { kind: 'anchor.failed', at: new Date().toISOString() },
      'submit-anchor-bitcoin',
    );
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});
