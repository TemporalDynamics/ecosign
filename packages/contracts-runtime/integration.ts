/**
 * Integración del Motor de Decisiones con el Executor
 * 
 * Este archivo documenta cómo conectar el decision engine canónico
 * con el executor actual para la migración controlada.
 * 
 * El objetivo es mover la decisión de "cuándo encolar run_tsa"
 * del executor al runtime canónico, con validación UI completa.
 */

import { decideNextJobs, shouldEnqueueRunTsa } from './decisionEngine.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Función para integrar con el executor existente en modo shadow
export async function validateExecutorDecision(
  supabase: ReturnType<typeof createClient>,
  documentEntityId: string,
  currentExecutorJobs: string[],
  protection: string[]
): Promise<{ 
  canonicalDecision: string[]; 
  matchesCurrent: boolean; 
  discrepancies: string[] 
}> {
  
  // 1. Obtener eventos del documento
  const { data: entity, error } = await supabase
    .from('document_entities')
    .select('events')
    .eq('id', documentEntityId)
    .single();

  if (error || !entity) {
    throw new Error(`Failed to get document entity: ${error?.message}`);
  }

  const events = Array.isArray(entity.events) ? entity.events : [];

  // 2. Obtener decisión canónica
  const canonicalDecision = decideNextJobs(events, protection);

  // 3. Comparar con decisión actual del executor
  const matchesCurrent = JSON.stringify(currentExecutorJobs.sort()) === 
                        JSON.stringify(canonicalDecision.jobs.sort());

  const discrepancies: string[] = [];
  if (!matchesCurrent) {
    discrepancies.push(
      `Executor: [${currentExecutorJobs.join(', ')}]`,
      `Canonical: [${canonicalDecision.jobs.join(', ')}]`
    );
  }

  return {
    canonicalDecision: canonicalDecision.jobs,
    matchesCurrent,
    discrepancies
  };
}

// Función para modo shadow: comparar decisiones sin afectar sistema
export async function runShadowComparison(
  supabase: ReturnType<typeof createClient>,
  documentEntityId: string,
  currentJobs: string[],
  protection: string[]
): Promise<void> {
  try {
    const comparison = await validateExecutorDecision(
      supabase,
      documentEntityId,
      currentJobs,
      protection
    );

    if (!comparison.matchesCurrent) {
      console.warn('DISCREPANCY FOUND:', {
        documentEntityId,
        executorDecision: currentJobs,
        canonicalDecision: comparison.canonicalDecision,
        reason: 'decision_engine_comparison'
      });
    } else {
      console.log('DECISION MATCH:', {
        documentEntityId,
        decision: currentJobs,
        reason: 'decision_engine_match'
      });
    }
  } catch (error) {
    console.error('Shadow comparison failed:', error);
  }
}

// Función para activar modo controlado (usar decisión canónica)
export async function executeCanonicalDecision(
  supabase: ReturnType<typeof createClient>,
  documentEntityId: string,
  protection: string[]
): Promise<{ executedJobs: string[]; reason: string }> {
  
  // 1. Obtener eventos
  const { data: entity, error } = await supabase
    .from('document_entities')
    .select('events')
    .eq('id', documentEntityId)
    .single();

  if (error || !entity) {
    throw new Error(`Failed to get document entity: ${error?.message}`);
  }

  const events = Array.isArray(entity.events) ? entity.events : [];

  // 2. Tomar decisión canónica
  const decision = decideNextJobs(events, protection);

  // 3. Ejecutar jobs según decisión canónica
  const executedJobs: string[] = [];
  
  for (const job of decision.jobs) {
    try {
      // Aquí iría la lógica para encolar el job específico
      // usando el sistema de executor_jobs
      
      // Ejemplo de encolado:
      const { error: jobError } = await supabase
        .from('executor_jobs')
        .insert({
          type: job,
          entity_type: 'document',
          entity_id: documentEntityId,
          payload: { 
            document_entity_id: documentEntityId,
            protection
          },
          status: 'queued',
          run_at: new Date().toISOString(),
          dedupe_key: `${documentEntityId}:${job}:${Date.now()}`
        });

      if (!jobError) {
        executedJobs.push(job);
      } else {
        console.error(`Failed to queue job ${job}:`, jobError.message);
      }
    } catch (jobError) {
      console.error(`Error queuing job ${job}:`, jobError);
    }
  }

  return {
    executedJobs,
    reason: decision.reason
  };
}

/**
 * Validación específica para la decisión de run_tsa
 * 
 * Esta función se puede usar para validar que la decisión de run_tsa
 * sea consistente entre el sistema actual y el canónico.
 */
export async function validateRunTsaDecision(
  supabase: ReturnType<typeof createClient>,
  documentEntityId: string
): Promise<{ 
  shouldEnqueue: boolean; 
  reason: string; 
  eventsSnapshot: any[] 
}> {
  
  const { data: entity, error } = await supabase
    .from('document_entities')
    .select('events')
    .eq('id', documentEntityId)
    .single();

  if (error || !entity) {
    throw new Error(`Failed to get document entity: ${error?.message}`);
  }

  const events = Array.isArray(entity.events) ? entity.events : [];

  const shouldEnqueue = shouldEnqueueRunTsa(events);
  const hasRequest = events.some((e: any) => e.kind === 'document.protected.requested');
  const hasTsa = events.some((e: any) => e.kind === 'tsa.confirmed');

  let reason = '';
  if (!hasRequest) {
    reason = 'no_protection_requested';
  } else if (hasTsa) {
    reason = 'tsa_already_confirmed';
  } else {
    reason = 'needs_tsa_protection';
  }

  return {
    shouldEnqueue,
    reason,
    eventsSnapshot: events
  };
}