import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { appendEvent } from '../_shared/eventHelper.ts';
import { validateEventAppend } from '../_shared/validateEventAppend.ts';

type RunTsaRequest = {
  document_entity_id: string;
  witness_hash?: string;
  signer_id?: string;
  workflow_id?: string;
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${FUNCTIONS_URL}/${name}`, {
      method: 'POST',
      signal: controller.signal,
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
  } finally {
    clearTimeout(timeout);
  }
}

async function emitEvent(
  supabase: any,
  documentEntityId: string,
  event: { kind: string; at: string; [key: string]: unknown },
  source: string,
): Promise<void> {
  const result = await appendEvent(supabase, documentEntityId, event, source);
  if (!result.success) {
    throw new Error(result.error ?? 'Failed to append event');
  }
}

function getRequiredEvidence(events: Array<{ kind?: string; payload?: Record<string, unknown> }>): string[] {
  const requestEvent = events.find((event) => event.kind === 'document.protected.requested');
  const requiredEvidence = requestEvent?.payload?.['required_evidence'];
  if (Array.isArray(requiredEvidence)) {
    return requiredEvidence.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

function hasRequiredAnchorEvent(
  events: Array<{ kind?: string; payload?: Record<string, unknown> }>,
  kind: string,
  witnessHash: string,
): boolean {
  return events.some((event) =>
    event.kind === kind &&
    typeof event.payload?.['witness_hash'] === 'string' &&
    event.payload?.['witness_hash'] === witnessHash
  );
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

  // Validate correlation_id: canonical rule is correlation_id = document_entity_id
  let correlationId = body.correlation_id || documentEntityId;
  if (correlationId && correlationId !== documentEntityId) {
    console.warn('[run-tsa] correlation_id mismatch - overriding to canonical', {
      received_correlation_id: correlationId,
      document_entity_id: documentEntityId,
    });
    correlationId = documentEntityId;
  }

  if (!documentEntityId) {
    return jsonResponse({ error: 'document_entity_id required' }, 400);
  }

  console.log('[run-tsa] start', { document_entity_id: documentEntityId, correlation_id: correlationId });

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
      {
        kind: 'tsa.failed',
        at: new Date().toISOString(),
      },
      'run-tsa',
    );
    return jsonResponse({ error: 'witness_hash missing' }, 400);
  }

  const hasTsaForHash = events.some((event: { kind?: string; witness_hash?: string }) =>
    event.kind === 'tsa.confirmed' && event.witness_hash === witnessHash
  );
  if (hasTsaForHash) {
    return jsonResponse({ success: true, noop: true });
  }

  // Guard: TSA evidence must be causally after an explicit protection request.
  // This prevents out-of-order histories caused by races or alternate writers.
  const hasProtectionRequest = events.some((event: { kind?: string }) => event.kind === 'document.protected.requested');
  if (!hasProtectionRequest) {
    return jsonResponse(
      {
        error: 'precondition_failed:missing_document.protected.requested',
        retryable: true,
      },
      409,
    );
  }

  try {
    const tsaResponse = await callFunction('legal-timestamp', {
      hash_hex: witnessHash,
    });

    const tsaEvent = {
      kind: 'tsa.confirmed',
      at: new Date().toISOString(),
      correlation_id: correlationId,  // NUEVO: heredado del job
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

    const requiredEvidence = getRequiredEvidence(events);
    const witnessHashForJobs = witnessHash;
    const shouldRequirePolygon = requiredEvidence.includes('polygon') &&
      !hasRequiredAnchorEvent(events, 'job.submit-anchor-polygon.required', witnessHashForJobs);
    const shouldRequireBitcoin = requiredEvidence.includes('bitcoin') &&
      !hasRequiredAnchorEvent(events, 'job.submit-anchor-bitcoin.required', witnessHashForJobs);

    if (shouldRequirePolygon) {
      await emitEvent(
        supabase,
        documentEntityId,
        {
          kind: 'job.submit-anchor-polygon.required',
          at: new Date().toISOString(),
          payload: {
            document_entity_id: documentEntityId,
            witness_hash: witnessHashForJobs,
            workflow_id: body.workflow_id ?? null,
          },
        },
        'run-tsa',
      );
    }

    if (shouldRequireBitcoin) {
      await emitEvent(
        supabase,
        documentEntityId,
        {
          kind: 'job.submit-anchor-bitcoin.required',
          at: new Date().toISOString(),
          payload: {
            document_entity_id: documentEntityId,
            witness_hash: witnessHashForJobs,
            workflow_id: body.workflow_id ?? null,
          },
        },
        'run-tsa',
      );
    }

    // Enqueue signature evidence generation (per signer, post-TSA).
    if (body.signer_id) {
      const dedupeKey = `${documentEntityId}:signature_evidence:${witnessHash}:${body.signer_id}`;
      const { error: jobErr } = await supabase
        .from('executor_jobs')
        .insert({
          type: 'generate_signature_evidence',
          entity_type: 'document',
          entity_id: documentEntityId,
          correlation_id: documentEntityId,
          dedupe_key: dedupeKey,
          payload: {
            document_entity_id: documentEntityId,
            signer_id: body.signer_id,
            workflow_id: body.workflow_id ?? null,
            witness_hash: witnessHash,
          },
          status: 'queued',
          run_at: new Date().toISOString(),
        });

      if (jobErr) {
        console.warn('[run-tsa] failed to enqueue generate_signature_evidence', jobErr);
      }
    } else {
      console.info('[run-tsa] TSA confirmed without signer_id; evidence not enqueued', {
        document_entity_id: documentEntityId,
        witness_hash: witnessHash,
      });
    }

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
