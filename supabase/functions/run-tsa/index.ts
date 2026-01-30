import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { appendEvent } from '../_shared/eventHelper.ts';
import { validateEventAppend } from '../_shared/validateEventAppend.ts';

type RunTsaRequest = {
  document_entity_id: string;
  witness_hash?: string;
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
  event: { kind: string; at: string; [key: string]: unknown },
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

  const body = (await req.json().catch(() => ({}))) as Partial<RunTsaRequest>;
  const documentEntityId = String(body.document_entity_id ?? '');

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
  if (events.some((event: { kind?: string }) => event.kind === 'tsa.confirmed')) {
    return jsonResponse({ success: true, noop: true });
  }

  const witnessHash = String(entity.witness_hash ?? '');
  if (!witnessHash) {
    await emitEvent(
      supabase,
      documentEntityId,
      {
        kind: 'tsa.failed',
        at: new Date().toISOString(),
      },
      'run-tsa',
    );
    return jsonResponse({ error: 'witness_hash missing' }, 400);
  }

  try {
    const tsaResponse = await callFunction('legal-timestamp', {
      hash_hex: witnessHash,
    });

    const tsaEvent = {
      kind: 'tsa.confirmed',
      at: new Date().toISOString(),
      witness_hash: witnessHash,
      tsa: {
        token_b64: tsaResponse.token,
      }
    };

    const validation = validateEventAppend(entity, tsaEvent);
    if (!validation.ok) {
      throw new Error(`authority_reject:${validation.reason}`);
    }

    await emitEvent(supabase, documentEntityId, tsaEvent, 'run-tsa');
    return jsonResponse({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await emitEvent(
      supabase,
      documentEntityId,
      {
        kind: 'tsa.failed',
        at: new Date().toISOString(),
        payload: {
          retryable: true,
          error: { message }
        }
      },
      'run-tsa',
    );
    return jsonResponse({ error: message }, 500);
  }
});
