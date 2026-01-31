/**
 * Orchestrator: Motor de ejecución pesada
 * 
 * Este componente solo:
 * 1. Lee jobs de la cola neutral (executor_jobs)
 * 2. Ejecuta trabajos
 * 3. Escribe eventos resultado en document_entities.events[]
 * 
 * NUNCA decide reglas de negocio - eso es autoridad
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
// Orchestrator ejecuta jobs y marca estado en executor_jobs.
// Los hechos canónicos (TSA/anchors/artifact) los emiten las funciones específicas.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const WORKER_ID = 'orchestrator';
const RUN_INSTANCE_ID = crypto.randomUUID();
const RUN_WORKER_ID = `${WORKER_ID}-${RUN_INSTANCE_ID}`;

const HEARTBEAT_INTERVAL_MS = 15_000;

// Tipos de jobs soportados
type JobType = 'run_tsa' | 'submit_anchor_polygon' | 'submit_anchor_bitcoin' | 'build_artifact';

interface ExecutorJob {
  id: string;
  type: JobType;
  entity_id: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts?: number;
  created_at: string;
}

function computeRetryDelayMs(type: JobType, attempts: number): number {
  const attempt = Math.max(1, Math.floor(attempts || 1));
  const baseMs = type === 'run_tsa' ? 30_000 : 60_000;
  const capMs = 10 * 60_000;
  return Math.min(capMs, baseMs * attempt);
}

async function logRun(
  status: 'started' | 'succeeded' | 'failed',
  job: ExecutorJob,
  startedAt: Date,
  finishedAt?: Date,
  error?: string,
): Promise<void> {
  const durationMs = finishedAt ? Math.max(0, finishedAt.getTime() - startedAt.getTime()) : null;
  await supabase.from('executor_job_runs').insert({
    job_id: job.id,
    status,
    attempt: job.attempts ?? 1,
    worker_id: RUN_WORKER_ID,
    started_at: startedAt.toISOString(),
    finished_at: finishedAt ? finishedAt.toISOString() : null,
    duration_ms: durationMs,
    error: error ?? null,
  });
}

// Handlers para cada tipo de job
const jobHandlers: Record<JobType, (job: ExecutorJob) => Promise<any>> = {
  'run_tsa': async (job) => {
    const documentEntityId = String(job.payload?.document_entity_id ?? job.entity_id);

    console.log(`🏃 Ejecutando TSA (canónico) para entity: ${documentEntityId}`);

    // Use canonical TSA writer which is idempotent (noop if already confirmed)
    const tsaResponse = await callFunction('run-tsa', {
      document_entity_id: documentEntityId,
    });

    return { success: true, result: tsaResponse };
  },

  'submit_anchor_polygon': async (job) => {
    const { document_entity_id, witness_hash } = job.payload;
    
    console.log(`🏃 Ejecutando anclaje Polygon para entity: ${document_entity_id}`);
    
    // Llamar al worker de anclaje Polygon
    const anchorResponse = await callFunction('submit-anchor-polygon', {
      document_entity_id: String(document_entity_id),
      witness_hash: String(witness_hash),
    });

    return {
      success: true,
      result: {
        network: 'polygon',
        ...anchorResponse
      }
    };
  },

  'submit_anchor_bitcoin': async (job) => {
    const { document_entity_id, witness_hash } = job.payload;
    
    console.log(`🏃 Ejecutando anclaje Bitcoin para entity: ${document_entity_id}`);
    
    // Llamar al worker de anclaje Bitcoin
    const anchorResponse = await callFunction('submit-anchor-bitcoin', {
      document_entity_id: String(document_entity_id),
      witness_hash: String(witness_hash),
    });

    return {
      success: true,
      result: {
        network: 'bitcoin',
        ...anchorResponse
      }
    };
  },

  'build_artifact': async (job) => {
    const { document_entity_id, user_document_id } = job.payload;
    
    console.log(`🏃 Construyendo artifact para entity: ${document_entity_id}`);
    
    // Llamar al worker de construcción de artifact
    const artifactResponse = await callFunction('build-artifact', {
      document_entity_id: String(document_entity_id),
      document_id: String(user_document_id),
    });

    return {
      success: true,
      result: {
        artifact_url: artifactResponse.artifact_url,
        ...artifactResponse
      }
    };
  }
};

// Función para llamar a funciones de Supabase
async function callFunction(functionName: string, body: Record<string, unknown>): Promise<any> {
  const FUNCTIONS_URL = `${SUPABASE_URL.replace(/\/+$/, '')}/functions/v1`;
  
  const response = await fetch(`${FUNCTIONS_URL}/${functionName}`, {
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

// Procesar un job
async function processJob(job: ExecutorJob): Promise<void> {
  const { id: jobId, type, entity_id: documentEntityId, payload } = job;

  const startedAt = new Date();
  await logRun('started', job, startedAt);

  const isLongJob = type === 'run_tsa' || type === 'submit_anchor_polygon' || type === 'submit_anchor_bitcoin';
  let heartbeatTimer: number | null = null;
  const stopHeartbeat = () => {
    if (heartbeatTimer !== null) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const startHeartbeat = () => {
    if (!isLongJob) return;
    if (heartbeatTimer !== null) return;
    heartbeatTimer = setInterval(async () => {
      try {
        await supabase.rpc('update_job_heartbeat', {
          p_job_id: jobId,
          p_worker_id: WORKER_ID,
        });
      } catch (e) {
        // Non-fatal: reclaim TTL is still the fallback.
        console.warn(`[orchestrator] heartbeat update failed for job ${jobId}:`, e);
      }
    }, HEARTBEAT_INTERVAL_MS);
  };

  try {
    console.log(`🔧 Procesando job: ${jobId} (${type}) para entity: ${documentEntityId}`);

    startHeartbeat();

    // NOTA: El job ya fue reclamado por claim_orchestrator_jobs
    // con status='processing', locked_at=now(), locked_by='orchestrator', attempts incrementado
    // NO necesitamos actualizar el status aquí

    // Ejecutar el job usando el handler correspondiente
    const handler = jobHandlers[type];
    if (!handler) {
      throw new Error(`Handler no encontrado para job type: ${type}`);
    }

    const result = await handler(job);

    if (!result.success) {
      throw new Error(`Job falló: ${JSON.stringify(result.error)}`);
    }

    // Marcar job como completado
    stopHeartbeat();
    await supabase
      .from('executor_jobs')
      .update({
        status: 'succeeded',
        locked_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('locked_by', WORKER_ID);

    await logRun('succeeded', job, startedAt, new Date());

    console.log(`✅ Job completado: ${jobId} para entity: ${documentEntityId}`);

  } catch (error) {
    console.error(`❌ Error procesando job ${jobId}:`, error);

    stopHeartbeat();

    const finishedAt = new Date();
    const message = error instanceof Error ? error.message : String(error);
    await logRun('failed', job, startedAt, finishedAt, message);

    const attempt = Number(job.attempts ?? 1);
    const maxAttempts = Number(job.max_attempts ?? 10);
    const shouldDeadLetter = attempt >= maxAttempts;
    const nextRunAt = new Date(Date.now() + computeRetryDelayMs(type, attempt));

    const updatePayload: Record<string, unknown> = {
      status: shouldDeadLetter ? 'dead' : 'retry_scheduled',
      last_error: message,
      locked_at: null,
      locked_by: null,
      updated_at: finishedAt.toISOString(),
    };
    if (!shouldDeadLetter) {
      updatePayload.run_at = nextRunAt.toISOString();
    }

    // Marcar job como retry_scheduled o dead (para permitir reintentos reales)
    await supabase
      .from('executor_jobs')
      .update(updatePayload)
      .eq('id', jobId)
      .eq('locked_by', WORKER_ID);

    throw error;
  }
}

// Poll jobs de la cola usando claim atómico
async function pollJobs(): Promise<void> {
  console.log('👂 Orchestrator iniciado, buscando jobs...');

  try {
    // Usar claim_orchestrator_jobs para reclamar jobs de forma atómica
    // Esto previene conflictos de concurrencia usando FOR UPDATE SKIP LOCKED
    const { data: jobs, error } = await supabase.rpc('claim_orchestrator_jobs', {
      p_limit: 10,
      p_worker_id: WORKER_ID
    });

    if (error) {
      throw new Error(`Error reclamando jobs: ${error.message}`);
    }

    if (!jobs || jobs.length === 0) {
      console.log('💤 No hay jobs pendientes');
      return;
    }

    console.log(`📦 Procesando ${jobs.length} jobs reclamados...`);

    // Procesar cada job ya reclamado
    for (const job of jobs) {
      try {
        await processJob(job as ExecutorJob);
      } catch (error) {
        console.error(`Error procesando job ${job.id}:`, error);
        // Continuar con el siguiente job
      }
    }

  } catch (error) {
    console.error('❌ Error en el polling de jobs:', error);
  }
}

// Handler para Supabase Edge Function
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (req.method === 'GET') {
    // Endpoint para polling manual
    try {
      await pollJobs();
      return new Response(
        JSON.stringify({ success: true, message: 'Polling completado' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Error en polling manual:', error);
      const message = error instanceof Error ? error.message : String(error);
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  if (req.method === 'POST') {
    // Procesar un job específico si se proporciona
    try {
      const { jobId } = await req.json();
      
      if (jobId) {
        // Obtener job específico y procesarlo
        const { data: job, error } = await supabase
          .from('executor_jobs')
          .select('*')
          .eq('id', jobId)
          .single();
        
        if (error || !job) {
          return new Response(
            JSON.stringify({ error: 'Job no encontrado' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }
        
        await processJob(job as ExecutorJob);
        
        return new Response(
          JSON.stringify({ success: true, jobId }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        // Procesar jobs pendientes
        await pollJobs();
        return new Response(
          JSON.stringify({ success: true, message: 'Jobs procesados' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch (error) {
      console.error('Error en procesamiento POST:', error);
      const message = error instanceof Error ? error.message : String(error);
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: 'Método no permitido' }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
});

// Exportar para testing
export { pollJobs, processJob };
