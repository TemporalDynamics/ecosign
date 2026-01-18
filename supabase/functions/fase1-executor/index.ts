import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { appendEvent } from '../_shared/eventHelper.ts';
import { FASE1_EVENT_KINDS } from '../_shared/fase1Events.ts';

type ExecutorJob = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  attempts: number;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FUNCTIONS_URL = `${SUPABASE_URL.replace(/\/+$/, '')}/functions/v1`;
const POLYGON_RPC_URL =
  Deno.env.get('POLYGON_RPC_URL') ?? Deno.env.get('ALCHEMY_RPC_URL');

const DEFAULT_LIMIT = 5;
const POLYGON_CONFIRM_TIMEOUT_MS = 60_000;
const POLYGON_CONFIRM_INTERVAL_MS = 5_000;

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

async function emitEvent(
  supabase: ReturnType<typeof createClient>,
  documentEntityId: string,
  kind: string,
  payload: Record<string, unknown>,
  source: string,
): Promise<void> {
  const result = await appendEvent(
    supabase,
    documentEntityId,
    { kind, at: new Date().toISOString(), payload },
    source,
  );

  if (!result.success) {
    throw new Error(result.error ?? 'Failed to append event');
  }
}

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

  return data;
}

async function waitForPolygonConfirmation(txHash: string) {
  if (!POLYGON_RPC_URL) {
    throw new Error('POLYGON_RPC_URL not configured');
  }

  const deadline = Date.now() + POLYGON_CONFIRM_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const response = await fetch(POLYGON_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      }),
    });

    const data = await response.json().catch(() => null);
    const receipt = data?.result ?? null;
    if (receipt) {
      return receipt;
    }

    await new Promise((resolve) => setTimeout(resolve, POLYGON_CONFIRM_INTERVAL_MS));
  }

  return null;
}

async function handleDocumentProtected(
  supabase: ReturnType<typeof createClient>,
  job: ExecutorJob,
): Promise<void> {
  const payload = job.payload ?? {};
  const documentEntityId = String(payload['document_entity_id'] ?? '');
  const userDocumentId = payload['document_id'] ? String(payload['document_id']) : null;

  if (!documentEntityId) {
    throw new Error('document_entity_id missing in payload');
  }

  const { data: entity, error: entityError } = await supabase
    .from('document_entities')
    .select('id, witness_hash')
    .eq('id', documentEntityId)
    .single();

  if (entityError || !entity) {
    throw new Error(`document_entity not found: ${entityError?.message ?? 'missing'}`);
  }

  const witnessHash = entity.witness_hash || String(payload['witness_hash'] ?? '');
  if (!witnessHash) {
    await emitEvent(
      supabase,
      documentEntityId,
      FASE1_EVENT_KINDS.TSA_FAILED,
      { reason: 'missing_witness_hash', retryable: false },
      'fase1-executor',
    );
    throw new Error('witness_hash missing');
  }

  // TSA
  try {
    const tsaResponse = await callFunction('legal-timestamp', {
      hash_hex: witnessHash,
    });

    await emitEvent(
      supabase,
      documentEntityId,
      FASE1_EVENT_KINDS.TSA_CONFIRMED,
      {
        witness_hash: witnessHash,
        token_b64: tsaResponse.token,
        tsa_url: tsaResponse.tsa_url,
        algorithm: tsaResponse.algorithm,
        standard: tsaResponse.standard,
      },
      'fase1-executor',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await emitEvent(
      supabase,
      documentEntityId,
      FASE1_EVENT_KINDS.TSA_FAILED,
      { reason: message, retryable: false, witness_hash: witnessHash },
      'fase1-executor',
    );
    throw error;
  }

  // Polygon
  try {
    const polygonResponse = await callFunction('anchor-polygon', {
      documentHash: witnessHash,
      userDocumentId,
      documentId: userDocumentId,
      metadata: { source: 'fase1-executor' },
    });

    const txHash = polygonResponse.txHash as string | undefined;
    if (!txHash) {
      throw new Error('polygon tx_hash missing');
    }

    const receipt = await waitForPolygonConfirmation(txHash);
    if (!receipt) {
      await emitEvent(
        supabase,
        documentEntityId,
        FASE1_EVENT_KINDS.ANCHOR_FAILED,
        {
          network: 'polygon',
          reason: 'confirmation_timeout',
          retryable: true,
          tx_hash: txHash,
          witness_hash: witnessHash,
        },
        'fase1-executor',
      );
      throw new Error('polygon confirmation timeout');
    }

    if (receipt.status !== '0x1') {
      await emitEvent(
        supabase,
        documentEntityId,
        FASE1_EVENT_KINDS.ANCHOR_FAILED,
        {
          network: 'polygon',
          reason: 'transaction_failed',
          retryable: false,
          tx_hash: txHash,
          witness_hash: witnessHash,
        },
        'fase1-executor',
      );
      throw new Error('polygon transaction failed');
    }

    await emitEvent(
      supabase,
      documentEntityId,
      FASE1_EVENT_KINDS.ANCHOR_CONFIRMED,
      {
        network: 'polygon',
        tx_hash: txHash,
        witness_hash: witnessHash,
        block_height: receipt.blockNumber,
        confirmed_at: new Date().toISOString(),
      },
      'fase1-executor',
    );
  } catch (error) {
    throw error;
  }

  // Bitcoin (pending allowed)
  try {
    const bitcoinResponse = await callFunction('anchor-bitcoin', {
      documentHash: witnessHash,
      userDocumentId,
      documentId: userDocumentId,
      metadata: { source: 'fase1-executor' },
    });

    await emitEvent(
      supabase,
      documentEntityId,
      FASE1_EVENT_KINDS.ANCHOR_PENDING,
      {
        network: 'bitcoin',
        anchor_id: bitcoinResponse.anchorId ?? null,
        witness_hash: witnessHash,
      },
      'fase1-executor',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await emitEvent(
      supabase,
      documentEntityId,
      FASE1_EVENT_KINDS.ANCHOR_FAILED,
      {
        network: 'bitcoin',
        reason: message,
        retryable: false,
        witness_hash: witnessHash,
      },
      'fase1-executor',
    );
    throw error;
  }
}

Deno.serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204 });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const workerId = Deno.env.get('EXECUTOR_WORKER_ID') ?? `fase1-${crypto.randomUUID()}`;
  const body = await req.json().catch(() => ({}));
  const limit = Number(body?.limit ?? DEFAULT_LIMIT);

  const { data: jobs, error: claimError } = await supabase.rpc('claim_executor_jobs', {
    p_limit: Number.isFinite(limit) ? limit : DEFAULT_LIMIT,
    p_worker_id: workerId,
  });

  if (claimError) {
    return jsonResponse({ error: claimError.message }, 500);
  }

  const results: Array<{ id: string; status: string; error?: string }> = [];
  for (const job of (jobs ?? []) as ExecutorJob[]) {
    const attempt = (job.attempts ?? 0) + 1;
    const startedAt = new Date();

    await supabase.from('executor_jobs').update({
      attempts: attempt,
      updated_at: startedAt.toISOString(),
    }).eq('id', job.id);

    await supabase.from('executor_job_runs').insert({
      job_id: job.id,
      status: 'started',
      attempt,
      worker_id: workerId,
      started_at: startedAt.toISOString(),
    });

    try {
      if (job.type === FASE1_EVENT_KINDS.DOCUMENT_PROTECTED) {
        await handleDocumentProtected(supabase, job);
      } else {
        throw new Error(`No handler for job type: ${job.type}`);
      }

      const finishedAt = new Date();
      await supabase.from('executor_jobs').update({
        status: 'succeeded',
        locked_at: null,
        locked_by: null,
        updated_at: finishedAt.toISOString(),
      }).eq('id', job.id);

      await supabase.from('executor_job_runs').insert({
        job_id: job.id,
        status: 'succeeded',
        attempt,
        worker_id: workerId,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_ms: finishedAt.getTime() - startedAt.getTime(),
      });

      results.push({ id: job.id, status: 'succeeded' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const finishedAt = new Date();

      await supabase.from('executor_jobs').update({
        status: 'failed',
        last_error: message,
        locked_at: null,
        locked_by: null,
        updated_at: finishedAt.toISOString(),
      }).eq('id', job.id);

      await supabase.from('executor_job_runs').insert({
        job_id: job.id,
        status: 'failed',
        attempt,
        worker_id: workerId,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_ms: finishedAt.getTime() - startedAt.getTime(),
        error: message,
      });

      results.push({ id: job.id, status: 'failed', error: message });
    }
  }

  return jsonResponse({ success: true, processed: results.length, results });
});
