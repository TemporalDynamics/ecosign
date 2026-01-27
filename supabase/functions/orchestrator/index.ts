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
import { appendEvent } from '../_shared/eventHelper.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Tipos de jobs soportados
type JobType = 'run_tsa' | 'submit_anchor_polygon' | 'submit_anchor_bitcoin' | 'build_artifact';

interface ExecutorJob {
  id: string;
  type: JobType;
  entity_id: string;
  payload: Record<string, unknown>;
  attempts: number;
  created_at: string;
}

// Handlers para cada tipo de job
const jobHandlers: Record<JobType, (job: ExecutorJob) => Promise<any>> = {
  'run_tsa': async (job) => {
    const { witness_hash, document_entity_id } = job.payload;
    
    console.log(`🏃 Ejecutando TSA para entity: ${document_entity_id}`);
    
    // Llamar al worker de TSA
    const tsaResponse = await callFunction('legal-timestamp', {
      hash_hex: String(witness_hash),
    });

    return {
      success: true,
      result: {
        witness_hash,
        token_b64: tsaResponse.token,
        tsa_url: tsaResponse.tsa_url,
        algorithm: tsaResponse.algorithm,
        standard: tsaResponse.standard,
      }
    };
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
  
  try {
    console.log(`🔧 Procesando job: ${jobId} (${type}) para entity: ${documentEntityId}`);
    
    // Actualizar estado del job
    await supabase
      .from('executor_jobs')
      .update({
        status: 'processing',
        locked_at: new Date().toISOString(),
        locked_by: 'orchestrator',
        attempts: job.attempts + 1
      })
      .eq('id', jobId);

    // Ejecutar el job usando el handler correspondiente
    const handler = jobHandlers[type];
    if (!handler) {
      throw new Error(`Handler no encontrado para job type: ${type}`);
    }

    const result = await handler(job);
    
    if (!result.success) {
      throw new Error(`Job falló: ${JSON.stringify(result.error)}`);
    }

    // Reportar resultado como evento canónico
    const eventKind = getEventKindForResult(type);
    const eventPayload = {
      job_id: jobId,
      ...result.result,
      executed_at: new Date().toISOString()
    };

    await appendEvent(
      supabase,
      documentEntityId,
      {
        kind: eventKind,
        at: new Date().toISOString(),
        payload: eventPayload
      },
      'orchestrator'
    );

    // Marcar job como completado
    await supabase
      .from('executor_jobs')
      .update({
        status: 'succeeded',
        locked_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    console.log(`✅ Job completado: ${jobId} para entity: ${documentEntityId}`);
    
  } catch (error) {
    console.error(`❌ Error procesando job ${jobId}:`, error);
    
    // Marcar job como fallido
    await supabase
      .from('executor_jobs')
      .update({
        status: 'failed',
        last_error: error instanceof Error ? error.message : String(error),
        locked_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    throw error;
  }
}

// Mapeo de tipos de job a eventos de resultado
function getEventKindForResult(type: JobType): string {
  switch (type) {
    case 'run_tsa':
      return 'tsa.completed';
    case 'submit_anchor_polygon':
      return 'anchor.submitted';
    case 'submit_anchor_bitcoin':
      return 'anchor.submitted';
    case 'build_artifact':
      return 'artifact.completed';
    default:
      return 'job.completed';
  }
}

// Poll jobs de la cola
async function pollJobs(): Promise<void> {
  console.log('👂 Orchestrator iniciado, buscando jobs...');
  
  try {
    const { data: jobs, error } = await supabase
      .from('executor_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(10); // Procesar lotes de 10

    if (error) {
      throw new Error(`Error obteniendo jobs: ${error.message}`);
    }

    if (!jobs || jobs.length === 0) {
      console.log('💤 No hay jobs pendientes');
      return;
    }

    console.log(`📦 Procesando ${jobs.length} jobs...`);
    
    // Procesar cada job
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
      return new Response(
        JSON.stringify({ error: error.message }),
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
      return new Response(
        JSON.stringify({ error: error.message }),
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