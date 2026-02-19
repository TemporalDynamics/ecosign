import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { appendEvent } from '../_shared/eventHelper.ts';
import { FASE1_EVENT_KINDS } from '../_shared/fase1Events.ts';
import { validateEventAppend } from '../_shared/validateEventAppend.ts';
import {
  decideProtectDocumentV2Pipeline,
  getRequiredEvidenceFromEvents,
  hasAnchorConfirmed,
  hasDocumentCertifiedForWitness,
  type ProtectV2Job,
} from '../_shared/protectDocumentV2PipelineDecision.ts';
import { syncFlagsToDatabase } from '../_shared/flagSync.ts';

type ExecutorJob = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  attempts: number;
  correlation_id?: string;
  trace_id?: string;
};

const V2_PROTECT_JOB_TYPE = 'protect_document_v2';
const BUILD_ARTIFACT_JOB_TYPE = 'build_artifact';
const SUBMIT_ANCHOR_POLYGON_JOB_TYPE = 'submit_anchor_polygon';
const SUBMIT_ANCHOR_BITCOIN_JOB_TYPE = 'submit_anchor_bitcoin';
const RUN_TSA_JOB_TYPE = 'run_tsa';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FUNCTIONS_URL = `${SUPABASE_URL.replace(/\/+$/, '')}/functions/v1`;
const POLYGON_RPC_URL =
  Deno.env.get('POLYGON_RPC_URL') ?? Deno.env.get('ALCHEMY_RPC_URL');

const DEFAULT_LIMIT = 5;
const POLYGON_CONFIRM_TIMEOUT_MS = 60_000;
const POLYGON_CONFIRM_INTERVAL_MS = 5_000;
const TSA_MONITOR_SCAN_LIMIT = 50;

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

async function emitEvent(
  supabase: ReturnType<typeof createClient>,
  documentEntityId: string,
  event: { kind: string; at: string; payload: Record<string, unknown> },
  source: string,
): Promise<void> {
  const result = await appendEvent(supabase, documentEntityId, event, source);

  if (!result.success) {
    throw new Error(result.error ?? 'Failed to append event');
  }
}

async function emitExecutionRequiredEvent(
  supabase: ReturnType<typeof createClient>,
  documentEntityId: string,
  kind: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await emitEvent(
    supabase,
    documentEntityId,
    {
      kind,
      at: new Date().toISOString(),
      payload: {
        document_entity_id: documentEntityId,
        ...payload,
      },
    },
    'fase1-executor',
  );
}

const REQUIRED_EVENT_BY_JOB: Record<ProtectV2Job, string> = {
  run_tsa: 'job.run-tsa.required',
  submit_anchor_polygon: 'job.submit-anchor-polygon.required',
  submit_anchor_bitcoin: 'job.submit-anchor-bitcoin.required',
  build_artifact: 'job.build-artifact.required',
};

async function emitRequiredEventsForDecision(
  supabase: ReturnType<typeof createClient>,
  documentEntityId: string,
  jobs: ProtectV2Job[],
  payload: Record<string, unknown>,
): Promise<void> {
  for (const nextJob of jobs) {
    const eventKind = REQUIRED_EVENT_BY_JOB[nextJob];
    if (!eventKind) continue;
    await emitExecutionRequiredEvent(supabase, documentEntityId, eventKind, payload);
  }
}

async function emitArtifactChainPendingIfNeeded(
  supabase: ReturnType<typeof createClient>,
  documentEntityId: string,
  events: Array<{ kind?: string; payload?: Record<string, unknown>; witness_hash?: string }>,
  jobs: ProtectV2Job[],
  witnessHash: string | null,
): Promise<void> {
  if (!jobs.includes('submit_anchor_polygon') && !jobs.includes('submit_anchor_bitcoin')) {
    return;
  }

  if (events.some((event) => event.kind === 'artifact.finalized')) {
    return;
  }

  if (witnessHash && events.some((event) =>
    event.kind === 'artifact.chain.pending' &&
    event.payload?.['witness_hash'] === witnessHash
  )) {
    return;
  }

  const pendingNetworks: string[] = [];
  if (jobs.includes('submit_anchor_polygon')) pendingNetworks.push('polygon');
  if (jobs.includes('submit_anchor_bitcoin')) pendingNetworks.push('bitcoin');

  const requestEvent = events.find((event) => event.kind === 'document.protected.requested');
  const requiredEvidence = Array.isArray(requestEvent?.payload?.['required_evidence'])
    ? (requestEvent?.payload?.['required_evidence'] as unknown[]).filter((item): item is string => typeof item === 'string')
    : [];

  await emitEvent(
    supabase,
    documentEntityId,
    {
      kind: 'artifact.chain.pending',
      at: new Date().toISOString(),
      payload: {
        document_entity_id: documentEntityId,
        witness_hash: witnessHash,
        required_evidence: requiredEvidence,
        pending_networks: pendingNetworks,
      },
    },
    'fase1-executor',
  );
}

async function maybeEmitDocumentCertified(
  supabase: ReturnType<typeof createClient>,
  documentEntityId: string,
  events: Array<{ kind?: string; payload?: Record<string, unknown>; anchor?: Record<string, unknown> }>,
  witnessHash: string | null,
): Promise<void> {
  const requiredEvidence = getRequiredEvidenceFromEvents(events);
  const hasTsa = events.some((event) => event.kind === 'tsa.confirmed');
  if (!hasTsa) return;
  if (hasDocumentCertifiedForWitness(events, witnessHash)) return;

  const networksConfirmed: string[] = [];
  if (hasAnchorConfirmed(events, 'polygon')) networksConfirmed.push('polygon');
  if (hasAnchorConfirmed(events, 'bitcoin')) networksConfirmed.push('bitcoin');

  await emitEvent(
    supabase,
    documentEntityId,
    {
      kind: 'document.certified',
      at: new Date().toISOString(),
      payload: {
        document_entity_id: documentEntityId,
        witness_hash: witnessHash,
        required_evidence: requiredEvidence,
        confirmed_networks: networksConfirmed,
        strengthening_pending: requiredEvidence.filter((item) =>
          (item === 'polygon' && !networksConfirmed.includes('polygon')) ||
          (item === 'bitcoin' && !networksConfirmed.includes('bitcoin'))
        ),
        certified_at: new Date().toISOString(),
      },
    },
    'fase1-executor',
  );
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
    .select('id, witness_hash, events')
    .eq('id', documentEntityId)
    .single();

  if (entityError || !entity) {
    throw new Error(`document_entity not found: ${entityError?.message ?? 'missing'}`);
  }

  const events = Array.isArray(entity.events) ? entity.events : [];
  const requestedWitnessHash =
    (typeof payload['witness_hash'] === 'string' && payload['witness_hash'].trim())
      ? String(payload['witness_hash'])
      : String(entity.witness_hash ?? '');
  const decision = decideProtectDocumentV2Pipeline(events);
  const requiresAnchor = decision.jobs.includes('submit_anchor_polygon') || decision.jobs.includes('submit_anchor_bitcoin');
  if (requiresAnchor && !requestedWitnessHash) {
    throw new Error(`[precondition_failed] anchor submission requires witness_hash (job=${job.id}, entity=${documentEntityId})`);
  }

  await emitArtifactChainPendingIfNeeded(
    supabase,
    documentEntityId,
    events,
    decision.jobs,
    requestedWitnessHash || null,
  );

  await emitRequiredEventsForDecision(
    supabase,
    documentEntityId,
    decision.jobs,
    {
      user_document_id: userDocumentId,
      witness_hash: requestedWitnessHash || null,
    },
  );
}

async function handleProtectDocumentV2(
  supabase: ReturnType<typeof createClient>,
  job: ExecutorJob,
): Promise<void> {
  const payload = job.payload ?? {};
  const documentEntityId = String(payload['document_entity_id'] ?? '');

  if (!documentEntityId) {
    console.log(`[fase1-executor] NOOP protect_document_v2 (missing document_entity_id) for job ${job.id}`);
    return;
  }

  const { data: entity, error: entityError } = await supabase
    .from('document_entities')
    .select('id, events, witness_hash')
    .eq('id', documentEntityId)
    .single();

  if (entityError || !entity) {
    console.log(`[fase1-executor] NOOP protect_document_v2 (document not found) for job ${job.id}`);
    return;
  }

  const events = Array.isArray(entity.events) ? entity.events : [];
  const requestedWitnessHash =
    (typeof payload['witness_hash'] === 'string' && String(payload['witness_hash']).trim())
      ? String(payload['witness_hash'])
      : String(entity.witness_hash ?? '');

  const decision = decideProtectDocumentV2Pipeline(events);
  if (decision.reason === 'noop_missing_request') {
    console.log(`[fase1-executor] NOOP protect_document_v2 (no request event) for job ${job.id}`);
    return;
  }

  const requiresAnchor = decision.jobs.includes('submit_anchor_polygon') || decision.jobs.includes('submit_anchor_bitcoin');
  if (requiresAnchor && !requestedWitnessHash) {
    throw new Error(`[precondition_failed] anchor submission requires witness_hash (job=${job.id}, entity=${documentEntityId})`);
  }

  await emitArtifactChainPendingIfNeeded(
    supabase,
    documentEntityId,
    events,
    decision.jobs,
    requestedWitnessHash || null,
  );

  await emitRequiredEventsForDecision(
    supabase,
    documentEntityId,
    decision.jobs,
    {
      document_id: payload['document_id'] ? String(payload['document_id']) : null,
      witness_hash: requestedWitnessHash,
    },
  );

  await maybeEmitDocumentCertified(
    supabase,
    documentEntityId,
    events,
    requestedWitnessHash || null,
  );
}

async function emitMissingTsaMonitoringEvents(
  supabase: ReturnType<typeof createClient>,
): Promise<void> {
  const { data: entities, error } = await supabase
    .from('document_entities')
    .select('id, events')
    .contains('events', [{ kind: 'document.protected.requested' }])
    .limit(TSA_MONITOR_SCAN_LIMIT);

  if (error) {
    console.error('[fase1-executor] Error fetching TSA monitoring candidates:', error.message);
    return;
  }

  const candidates = (entities ?? []).filter((entity: any) => {
    const events = Array.isArray(entity.events) ? entity.events : [];
    const decision = decideProtectDocumentV2Pipeline(events);
    const hasMonitoringEvent = events.some((event: { kind?: string }) =>
      event.kind === 'monitoring.tsa.missing.detected'
    );
    return decision.reason === 'needs_tsa' && !hasMonitoringEvent;
  });

  for (const entity of candidates) {
    const entityId = String(entity.id);
    const event = {
      kind: 'monitoring.tsa.missing.detected',
      at: new Date().toISOString(),
      payload: {
        document_entity_id: entityId,
        reason: 'tsa_not_confirmed_after_scan',
        source: 'fase1-executor',
      },
    };
    await emitEvent(supabase, entityId, event, 'fase1-executor');
  }
}

async function handleBuildArtifact(
  supabase: ReturnType<typeof createClient>,
  job: ExecutorJob,
): Promise<void> {
  const documentEntityId = String(job.payload?.['document_entity_id'] ?? '');
  const documentId = job.payload?.['document_id'] ? String(job.payload['document_id']) : null;

  if (!documentEntityId) {
    throw new Error('document_entity_id missing in payload');
  }

  await callFunction('build-artifact', {
    document_entity_id: documentEntityId,
    document_id: documentId,
  });
}

async function handleSubmitAnchorPolygon(
  supabase: ReturnType<typeof createClient>,
  job: ExecutorJob,
): Promise<void> {
  const documentEntityId = String(job.payload?.['document_entity_id'] ?? '');
  const documentId = job.payload?.['document_id'] ? String(job.payload['document_id']) : null;

  if (!documentEntityId) {
    throw new Error('document_entity_id missing in payload');
  }

  await callFunction('submit-anchor-polygon', {
    document_entity_id: documentEntityId,
    document_id: documentId,
    witness_hash: job.payload?.['witness_hash'] ?? null,
  });
}

async function handleSubmitAnchorBitcoin(
  supabase: ReturnType<typeof createClient>,
  job: ExecutorJob,
): Promise<void> {
  const documentEntityId = String(job.payload?.['document_entity_id'] ?? '');
  const documentId = job.payload?.['document_id'] ? String(job.payload['document_id']) : null;

  if (!documentEntityId) {
    throw new Error('document_entity_id missing in payload');
  }

  await callFunction('submit-anchor-bitcoin', {
    document_entity_id: documentEntityId,
    document_id: documentId,
    witness_hash: job.payload?.['witness_hash'] ?? null,
  });
}

Deno.serve(async (req) => {
  // FASE guard disabled for MVP - executor always available
  // if (Deno.env.get('FASE') !== '1') {
  //   return new Response('disabled', { status: 204 });
  // }

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

  // Sincronizar flags desde Deno Env hacia SQL (una vez por ejecución)
  try {
    await syncFlagsToDatabase(supabase);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[fase1-executor] Error sincronizando flags:', message);
    // Continuar con ejecución normal, usar valores por defecto
  }

  // Emitir observabilidad operativa para documentos sin TSA confirmado
  try {
    await emitMissingTsaMonitoringEvents(supabase);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[fase1-executor] Error emitiendo monitoreo TSA missing:', message);
  }

  const { data: jobs, error: claimError } = await supabase.rpc('claim_initial_decision_jobs', {
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
    }).eq('id', job.id).eq('locked_by', workerId);

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
      } else if (job.type === V2_PROTECT_JOB_TYPE) {
        await handleProtectDocumentV2(supabase, job);
      } else if (job.type === BUILD_ARTIFACT_JOB_TYPE) {
        await handleBuildArtifact(supabase, job);
      } else if (job.type === SUBMIT_ANCHOR_POLYGON_JOB_TYPE) {
        await handleSubmitAnchorPolygon(supabase, job);
      } else if (job.type === RUN_TSA_JOB_TYPE) {
        await handleRunTsa(supabase, job);
      } else if (job.type === SUBMIT_ANCHOR_BITCOIN_JOB_TYPE) {
        await handleSubmitAnchorBitcoin(supabase, job);
      } else {
        throw new Error(`No handler for job type: ${job.type}`);
      }

      const finishedAt = new Date();
      await supabase.from('executor_jobs').update({
        status: 'succeeded',
        locked_at: null,
        locked_by: null,
        updated_at: finishedAt.toISOString(),
      }).eq('id', job.id).eq('locked_by', workerId);

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
      }).eq('id', job.id).eq('locked_by', workerId);

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

async function handleRunTsa(supabase: any, job: ExecutorJob) {
  console.log(`[handleRunTsa] Processing run_tsa job: ${job.id}`);
  
  const { document_entity_id } = job.payload;
  
  if (!document_entity_id) {
    throw new Error(`Missing document_entity_id in job payload: ${JSON.stringify(job.payload)}`);
  }
  
  try {
    // Delegar el flujo completo a la función run-tsa (incluye validación y append del evento).
    await callFunction('run-tsa', {
      document_entity_id,
    });
    
    console.log(`[handleRunTsa] Successfully processed TSA for document ${document_entity_id}`);
  } catch (error) {
    console.error(`[handleRunTsa] Error processing TSA for job ${job.id}:`, error);
    throw error;
  }
}
