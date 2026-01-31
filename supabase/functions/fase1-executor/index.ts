import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { appendEvent } from '../_shared/eventHelper.ts';
import { FASE1_EVENT_KINDS } from '../_shared/fase1Events.ts';
import { validateEventAppend } from '../_shared/validateEventAppend.ts';
import { decideProtectDocumentV2 } from '../_shared/protectDocumentV2Decision.ts';
import {
  shouldEnqueueRunTsa,
  shouldEnqueuePolygon,
  shouldEnqueueBitcoin as shouldEnqueueBitcoinCanonical,
  shouldEnqueueArtifact as shouldEnqueueArtifactCanonical,
} from '../_shared/decisionEngineCanonical.ts';
import { isDecisionUnderCanonicalAuthority } from '../_shared/featureFlags.ts';
import { syncFlagsToDatabase } from '../_shared/flagSync.ts';

type ExecutorJob = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  attempts: number;
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
const REQUEUE_TSA_LIMIT = 50;

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

  // 1. LEER VERDAD: Obtener el estado actual de document_entity
  const { data: entity, error: entityError } = await supabase
    .from('document_entities')
    .select('id, witness_hash, events')
    .eq('id', documentEntityId)
    .single();

  if (entityError || !entity) {
    throw new Error(`document_entity not found: ${entityError?.message ?? 'missing'}`);
  }

  // 2. USAR AUTORIDAD: Aplicar reglas de packages/authority
  const events = Array.isArray(entity.events) ? entity.events : [];

  // Decisión basada en packages/authority (shouldEnqueueRunTsa)
  const shouldEnqueueTsa = shouldEnqueueRunTsa(events);

  // 3. ESCRIBIR EN COLA NEUTRAL: En lugar de ejecutar directamente, encolar job
  if (shouldEnqueueTsa) {
    await enqueueExecutorJob(
      supabase,
      'run_tsa', // Tipo de job neutral
      documentEntityId,
      userDocumentId,
      `${documentEntityId}:run_tsa`,
      {
        witness_hash: entity.witness_hash,
        document_entity_id: documentEntityId,
        user_document_id: userDocumentId
      }
    );

    console.log(`[fase1-executor] Job encolado para TSA: ${documentEntityId}`);
  } else {
    console.log(`[fase1-executor] No se requiere TSA para: ${documentEntityId}`);
  }

  // Manejar también anclajes y artifact basados en autoridad
  const protection = Array.isArray(payload['protection'])
    ? (payload['protection'] as Array<unknown>)
    : [];
  const requiresPolygon = protection.includes('polygon');
  const requiresBitcoin = protection.includes('bitcoin');

  const hasTsaConfirmed = events.some((event: { kind?: string }) => event.kind === 'tsa.confirmed');
  const hasAnchorConfirmed = (network: 'polygon' | 'bitcoin') => events.some((event: any) =>
    event.kind === 'anchor' &&
    event.anchor?.network === network &&
    typeof event.anchor?.confirmed_at === 'string'
  );
  const hasPolygonConfirmed = hasAnchorConfirmed('polygon');
  const hasBitcoinConfirmed = hasAnchorConfirmed('bitcoin');

  // Decisión para anclaje Polygon basado en autoridad
  const shouldEnqueuePolygonResult = shouldEnqueuePolygon(events, protection as string[]);
  if (shouldEnqueuePolygonResult) {
    await enqueueExecutorJob(
      supabase,
      'submit_anchor_polygon',
      documentEntityId,
      userDocumentId,
      `${documentEntityId}:submit_anchor_polygon`,
      {
        document_entity_id: documentEntityId,
        user_document_id: userDocumentId,
        witness_hash: entity.witness_hash
      }
    );
  }

  // Decisión para anclaje Bitcoin basado en autoridad
  const shouldEnqueueBitcoinResult = shouldEnqueueBitcoinCanonical(events, protection as string[]);
  if (shouldEnqueueBitcoinResult) {
    await enqueueExecutorJob(
      supabase,
      'submit_anchor_bitcoin',
      documentEntityId,
      userDocumentId,
      `${documentEntityId}:submit_anchor_bitcoin`,
      {
        document_entity_id: documentEntityId,
        user_document_id: userDocumentId,
        witness_hash: entity.witness_hash
      }
    );
  }

  // Decisión para build artifact basado en autoridad
  const shouldEnqueueArtifactResult = shouldEnqueueArtifactCanonical(events, protection as string[]);
  if (shouldEnqueueArtifactResult) {
    await enqueueExecutorJob(
      supabase,
      'build_artifact',
      documentEntityId,
      userDocumentId,
      `${documentEntityId}:build_artifact`,
      {
        document_entity_id: documentEntityId,
        user_document_id: userDocumentId
      }
    );
  }
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
    .select('id, events')
    .eq('id', documentEntityId)
    .single();

  if (entityError || !entity) {
    console.log(`[fase1-executor] NOOP protect_document_v2 (document not found) for job ${job.id}`);
    return;
  }

  const events = Array.isArray(entity.events) ? entity.events : [];

  // SHADOW: Decisión canónica (solo validación, no afecta flujo si no está activa)
  const canonicalShouldEnqueue = shouldEnqueueRunTsa(events);
  const canonicalDecision = canonicalShouldEnqueue ? 'run_tsa' : 'noop';

  // DECISIÓN ACTUAL (autoridad real según flags)
  const isD1Canonical = isDecisionUnderCanonicalAuthority('D1_RUN_TSA_ENABLED');
  const decision = isD1Canonical
    ? (canonicalShouldEnqueue ? 'run_tsa' : 'noop')  // Usar lógica canónica
    : decideProtectDocumentV2(events);               // Usar lógica legacy

  // SHADOW COMPARISON: Comparar decisiones (siempre para monitoreo)
  const currentShouldEnqueue = !isD1Canonical && decideProtectDocumentV2(events) === 'run_tsa';
  if (currentShouldEnqueue !== canonicalShouldEnqueue) {
    console.warn('[SHADOW DISCREPANCY] run_tsa decision mismatch:', {
      documentEntityId,
      jobId: job.id,
      currentDecision: !isD1Canonical ? decideProtectDocumentV2(events) : 'canonical_used',
      canonicalDecision,
      currentShouldEnqueue,
      canonicalShouldEnqueue,
      isD1Canonical,
      eventsCount: events.length,
      hasRequest: events.some((e: any) => e.kind === 'document.protected.requested'),
      hasTsa: events.some((e: any) => e.kind === 'tsa.confirmed'),
      phase: isD1Canonical ? 'PASO_2_CANONICAL_ACTIVE' : 'PASO_1_SHADOW_MODE'
    });
  } else {
    console.log('[SHADOW MATCH] run_tsa decision matches canonical:', {
      documentEntityId,
      jobId: job.id,
      decision,
      shouldEnqueue: canonicalShouldEnqueue,
      isD1Canonical,
      phase: isD1Canonical ? 'PASO_2_CANONICAL_ACTIVE' : 'PASO_1_SHADOW_MODE'
    });
  }

  // CONTINUAR CON LÓGICA SEGÚN AUTORIDAD ACTIVA
  if (decision === 'noop_missing_request') {
    console.log(`[fase1-executor] NOOP protect_document_v2 (no request event) for job ${job.id}`);
    return;
  }

  if (decision !== 'noop_already_tsa') {
    await handleDocumentProtected(supabase, job);
  }

  const updated = await supabase
    .from('document_entities')
    .select('events')
    .eq('id', documentEntityId)
    .single();

  if (updated.error || !updated.data) {
    console.log(`[fase1-executor] NOOP protect_document_v2 (events reload failed) for job ${job.id}`);
    return;
  }

  const updatedEvents = Array.isArray(updated.data.events) ? updated.data.events : [];
  const hasArtifact = updatedEvents.some((event: { kind?: string }) => event.kind === 'artifact.finalized');

  const requestEvent = updatedEvents.find((event: { kind?: string }) =>
    event.kind === 'document.protected.requested'
  ) as { payload?: Record<string, unknown> } | undefined;
  const protection = Array.isArray(requestEvent?.payload?.['protection'])
    ? (requestEvent?.payload?.['protection'] as Array<unknown>)
    : [];
  const requiresPolygon = protection.includes('polygon');
  const requiresBitcoin = protection.includes('bitcoin');

  const hasTsaConfirmed = updatedEvents.some((event: { kind?: string }) => event.kind === 'tsa.confirmed');
  const hasAnchorConfirmed = (network: 'polygon' | 'bitcoin') => updatedEvents.some((event: any) =>
    event.kind === 'anchor' &&
    event.anchor?.network === network &&
    typeof event.anchor?.confirmed_at === 'string'
  );
  const hasPolygonConfirmed = hasAnchorConfirmed('polygon');
  const hasBitcoinConfirmed = hasAnchorConfirmed('bitcoin');

  // DECISIÓN DE ANCLAJES - Polygon
  const isD4Canonical = isDecisionUnderCanonicalAuthority('D4_ANCHORS_ENABLED');
  const currentShouldEnqueuePolygon = !isD4Canonical && hasTsaConfirmed && requiresPolygon && !hasPolygonConfirmed;
  const canonicalShouldEnqueuePolygon = shouldEnqueuePolygon(updatedEvents, protection as string[]);
  const polygonShouldEnqueue = isD4Canonical ? canonicalShouldEnqueuePolygon : currentShouldEnqueuePolygon;

  // SHADOW COMPARISON - Polygon
  if (currentShouldEnqueuePolygon !== canonicalShouldEnqueuePolygon) {
    console.warn('[SHADOW DISCREPANCY] polygon anchor decision mismatch:', {
      documentEntityId,
      jobId: job.id,
      currentDecision: currentShouldEnqueuePolygon,
      canonicalDecision: canonicalShouldEnqueuePolygon,
      hasTsa: hasTsaConfirmed,
      requiresPolygon,
      hasPolygonConfirmed,
      isD4Canonical,
      phase: isD4Canonical ? 'PASO_2_CANONICAL_ACTIVE' : 'PASO_1_SHADOW_MODE_D4'
    });
  } else {
    console.log('[SHADOW MATCH] polygon anchor decision matches canonical:', {
      documentEntityId,
      jobId: job.id,
      shouldEnqueue: polygonShouldEnqueue,
      isD4Canonical,
      phase: isD4Canonical ? 'PASO_2_CANONICAL_ACTIVE' : 'PASO_1_SHADOW_MODE_D4'
    });
  }

  // ENCONE JOB PARA ANCLAJE POLYGON
  if (polygonShouldEnqueue) {
    await enqueueExecutorJob(
      supabase,
      SUBMIT_ANCHOR_POLYGON_JOB_TYPE,
      documentEntityId,
      payload['document_id'] ? String(payload['document_id']) : null,
      `${documentEntityId}:${SUBMIT_ANCHOR_POLYGON_JOB_TYPE}`,
    );
  }

  // DECISIÓN DE ANCLAJES - Bitcoin
  const currentShouldEnqueueBitcoin = !isD4Canonical && hasTsaConfirmed && requiresBitcoin && !hasBitcoinConfirmed;
  const canonicalShouldEnqueueBitcoin = shouldEnqueueBitcoinCanonical(updatedEvents, protection as string[]);
  const bitcoinShouldEnqueue = isD4Canonical ? canonicalShouldEnqueueBitcoin : currentShouldEnqueueBitcoin;

  // SHADOW COMPARISON - Bitcoin
  if (currentShouldEnqueueBitcoin !== canonicalShouldEnqueueBitcoin) {
    console.warn('[SHADOW DISCREPANCY] bitcoin anchor decision mismatch:', {
      documentEntityId,
      jobId: job.id,
      currentDecision: currentShouldEnqueueBitcoin,
      canonicalDecision: canonicalShouldEnqueueBitcoin,
      hasTsa: hasTsaConfirmed,
      requiresBitcoin,
      hasBitcoinConfirmed,
      isD4Canonical,
      phase: isD4Canonical ? 'PASO_2_CANONICAL_ACTIVE' : 'PASO_1_SHADOW_MODE_D4'
    });
  } else {
    console.log('[SHADOW MATCH] bitcoin anchor decision matches canonical:', {
      documentEntityId,
      jobId: job.id,
      shouldEnqueue: bitcoinShouldEnqueue,
      isD4Canonical,
      phase: isD4Canonical ? 'PASO_2_CANONICAL_ACTIVE' : 'PASO_1_SHADOW_MODE_D4'
    });
  }

  // ENCONE JOB PARA ANCLAJE BITCOIN
  if (bitcoinShouldEnqueue) {
    await enqueueExecutorJob(
      supabase,
      SUBMIT_ANCHOR_BITCOIN_JOB_TYPE,
      documentEntityId,
      payload['document_id'] ? String(payload['document_id']) : null,
      `${documentEntityId}:${SUBMIT_ANCHOR_BITCOIN_JOB_TYPE}`,
    );
  }

  // DECISIÓN DE ARTIFACT - Artifact
  const isD3Canonical = isDecisionUnderCanonicalAuthority('D3_BUILD_ARTIFACT_ENABLED');
  const readyForArtifact = hasTsaConfirmed
    && (!requiresPolygon || hasPolygonConfirmed)
    && (!requiresBitcoin || hasBitcoinConfirmed);
  const currentShouldEnqueueArtifact = !isD3Canonical && !hasArtifact && readyForArtifact;
  const canonicalShouldEnqueueArtifact = shouldEnqueueArtifactCanonical(updatedEvents, protection as string[]);
  const artifactShouldEnqueue = isD3Canonical ? canonicalShouldEnqueueArtifact : currentShouldEnqueueArtifact;

  // SHADOW COMPARISON - Artifact
  if (currentShouldEnqueueArtifact !== canonicalShouldEnqueueArtifact) {
    console.warn('[SHADOW DISCREPANCY] artifact decision mismatch:', {
      documentEntityId,
      jobId: job.id,
      currentDecision: currentShouldEnqueueArtifact,
      canonicalDecision: canonicalShouldEnqueueArtifact,
      hasTsa: hasTsaConfirmed,
      hasArtifact,
      readyForArtifact,
      requiresPolygon,
      hasPolygonConfirmed,
      requiresBitcoin,
      hasBitcoinConfirmed,
      isD3Canonical,
      phase: isD3Canonical ? 'PASO_2_CANONICAL_ACTIVE' : 'PASO_1_SHADOW_MODE_D3'
    });
  } else {
    console.log('[SHADOW MATCH] artifact decision matches canonical:', {
      documentEntityId,
      jobId: job.id,
      shouldEnqueue: artifactShouldEnqueue,
      isD3Canonical,
      phase: isD3Canonical ? 'PASO_2_CANONICAL_ACTIVE' : 'PASO_1_SHADOW_MODE_D3'
    });
  }

  // ENCONE JOB PARA BUILD ARTIFACT
  if (artifactShouldEnqueue) {
    await enqueueExecutorJob(
      supabase,
      BUILD_ARTIFACT_JOB_TYPE,
      documentEntityId,
      payload['document_id'] ? String(payload['document_id']) : null,
      `${documentEntityId}:${BUILD_ARTIFACT_JOB_TYPE}`,
    );
  }
}

async function enqueueExecutorJob(
  supabase: ReturnType<typeof createClient>,
  type: string,
  documentEntityId: string,
  documentId: string | null,
  dedupeKey: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  const jobPayload = payload ?? {
    document_entity_id: documentEntityId,
    document_id: documentId,
  };

  const { error } = await supabase
    .from('executor_jobs')
    .insert({
      type,
      entity_type: 'document',
      entity_id: documentEntityId,
      dedupe_key: dedupeKey,
      payload: jobPayload,
      status: 'queued',
      run_at: new Date().toISOString(),
    });

  if (error && error.code !== '23505') {
    console.log(`[fase1-executor] Failed to enqueue ${type} for ${documentEntityId}: ${error.message}`);
    return;
  }

  if (error && error.code === '23505') {
    const { error: updateError } = await supabase
      .from('executor_jobs')
      .update({
        status: 'queued',
        run_at: new Date().toISOString(),
        locked_at: null,
        locked_by: null,
        last_error: null,
      })
      .eq('dedupe_key', dedupeKey)
      .in('status', ['failed', 'retry_scheduled', 'dead']);

    if (updateError) {
      console.log(`[fase1-executor] Failed to requeue ${type} for ${documentEntityId}: ${updateError.message}`);
    }
  }
}

async function requeueMissingTsaJobs(
  supabase: ReturnType<typeof createClient>,
): Promise<void> {
  const { data: entities, error } = await supabase
    .from('document_entities')
    .select('id, events')
    .contains('events', [{ kind: 'document.protected.requested' }])
    .limit(REQUEUE_TSA_LIMIT);

  if (error) {
    console.error('[fase1-executor] Error fetching TSA requeue candidates:', error.message);
    return;
  }

  const candidates = (entities ?? []).filter((entity: any) => {
    const events = Array.isArray(entity.events) ? entity.events : [];
    const hasTsa = events.some((event: { kind?: string }) => event.kind === 'tsa.confirmed');
    return !hasTsa && shouldEnqueueRunTsa(events);
  });

  for (const entity of candidates) {
    await enqueueExecutorJob(
      supabase,
      RUN_TSA_JOB_TYPE,
      String(entity.id),
      null,
      `${entity.id}:${RUN_TSA_JOB_TYPE}`,
    );
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

  // Reencolar TSA si hay protección solicitada sin TSA confirmada
  try {
    await requeueMissingTsaJobs(supabase);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[fase1-executor] Error reencolando TSA:', message);
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
