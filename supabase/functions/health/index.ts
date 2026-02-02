/**
 * health Edge Function
 *
 * Health endpoint para observabilidad agregada del sistema.
 * Métricas en tiempo real del estado de executor_jobs.
 *
 * Fase 2.1: Health endpoint (observabilidad operativa)
 *
 * Auth: Requiere service_role (no público)
 *
 * Principios:
 * - Read-only (no escribe, no repara, solo observa)
 * - Cheap (queries simples, sin JOINs pesados)
 * - Fast (< 200ms target)
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { getCorsHeaders } from '../_shared/cors.ts';

interface HealthReport {
  jobs_queued: {
    by_type: Record<string, number>;
    total: number;
  };
  jobs_processing: {
    count: number;
    avg_age_seconds: number;
  };
  stuck_count: number;
  dead_last_24h: number;
  estimated_lag_seconds: number;
  runtime_version: string;
}

// TTL por tipo de job (en segundos)
// Si locked_at > TTL sin heartbeat → stuck
const JOB_TTLS: Record<string, number> = {
  'protect_document_v2': 5 * 60,        // 5 min
  'document.protected': 5 * 60,         // 5 min (legacy)
  'run_tsa': 30 * 60,                   // 30 min
  'submit_anchor_polygon': 60 * 60,     // 60 min
  'submit_anchor_bitcoin': 60 * 60,     // 60 min
  'build_artifact': 15 * 60,            // 15 min
};

const DEFAULT_TTL = 30 * 60; // 30 min default

function getTTL(jobType: string): number {
  return JOB_TTLS[jobType] || DEFAULT_TTL;
}

Deno.serve(async (req) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    if (!isAllowed) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }
    return new Response('ok', { headers: corsHeaders });
  }

  if (!isAllowed) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Validar autorización (requiere service_role)
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!authHeader || !serviceRoleKey || !authHeader.includes(serviceRoleKey)) {
      return new Response(JSON.stringify({ error: 'Unauthorized - service_role required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const startTime = Date.now();

    // 1. Jobs queued (by_type + total)
    const { data: queuedJobs, error: queuedError } = await supabase
      .from('executor_jobs')
      .select('type')
      .eq('status', 'queued');

    if (queuedError) {
      throw new Error(`Failed to fetch queued jobs: ${queuedError.message}`);
    }

    const byType: Record<string, number> = {};
    for (const job of queuedJobs || []) {
      byType[job.type] = (byType[job.type] || 0) + 1;
    }

    // 2. Jobs processing (count + avg_age_seconds)
    const { data: processingJobs, error: processingError } = await supabase
      .from('executor_jobs')
      .select('locked_at')
      .eq('status', 'running');

    if (processingError) {
      throw new Error(`Failed to fetch processing jobs: ${processingError.message}`);
    }

    const now = Date.now();
    const processingAges = (processingJobs || [])
      .map(job => {
        if (!job.locked_at) return 0;
        const lockedAt = new Date(job.locked_at).getTime();
        return Math.max(0, (now - lockedAt) / 1000);
      })
      .filter(age => age > 0);

    const avgProcessingAge = processingAges.length > 0
      ? Math.round(processingAges.reduce((a, b) => a + b, 0) / processingAges.length)
      : 0;

    // 3. Stuck jobs (locked_at > TTL + no heartbeat)
    // Un job está stuck si:
    // - status = 'running'
    // - locked_at < now - TTL(type)
    // - heartbeat_at no avanzó (heartbeat_at < now - TTL o NULL)
    const { data: runningJobs, error: runningError } = await supabase
      .from('executor_jobs')
      .select('type, locked_at, heartbeat_at')
      .eq('status', 'running');

    if (runningError) {
      throw new Error(`Failed to fetch running jobs: ${runningError.message}`);
    }

    let stuckCount = 0;
    for (const job of runningJobs || []) {
      if (!job.locked_at) continue;

      const ttl = getTTL(job.type);
      const lockedAt = new Date(job.locked_at).getTime();
      const ttlThreshold = now - ttl * 1000;

      // Stuck si locked_at es viejo Y (no hay heartbeat O heartbeat es viejo)
      const isLockedTooLong = lockedAt < ttlThreshold;

      let isHeartbeatStale = true;
      if (job.heartbeat_at) {
        const heartbeatAt = new Date(job.heartbeat_at).getTime();
        isHeartbeatStale = heartbeatAt < ttlThreshold;
      }

      if (isLockedTooLong && isHeartbeatStale) {
        stuckCount++;
      }
    }

    // 4. Dead jobs (last 24h)
    // Dead = attempts >= max_attempts AND status IN ('dead', 'failed')
    const { data: deadCandidates, error: deadError } = await supabase
      .from('executor_jobs')
      .select('attempts, max_attempts')
      .in('status', ['dead', 'failed'])
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (deadError) {
      throw new Error(`Failed to fetch dead jobs: ${deadError.message}`);
    }

    const deadLast24h = (deadCandidates || [])
      .filter(job => job.attempts >= (job.max_attempts || 10))
      .length;

    // 5. Estimated lag (oldest queued job age)
    // Lag = now() - min(run_at) de jobs queued
    const { data: oldestQueued, error: oldestError } = await supabase
      .from('executor_jobs')
      .select('run_at')
      .eq('status', 'queued')
      .order('run_at', { ascending: true })
      .limit(1)
      .single();

    let estimatedLagSeconds = 0;
    if (!oldestError && oldestQueued?.run_at) {
      const runAt = new Date(oldestQueued.run_at).getTime();
      estimatedLagSeconds = Math.max(0, Math.round((now - runAt) / 1000));
    }

    // 6. Runtime version
    const runtimeVersion = 'fase2-unified';

    // Build report
    const report: HealthReport = {
      jobs_queued: {
        by_type: byType,
        total: (queuedJobs || []).length,
      },
      jobs_processing: {
        count: (processingJobs || []).length,
        avg_age_seconds: avgProcessingAge,
      },
      stuck_count: stuckCount,
      dead_last_24h: deadLast24h,
      estimated_lag_seconds: estimatedLagSeconds,
      runtime_version: runtimeVersion,
    };

    const duration = Date.now() - startTime;

    // Log performance
    console.log('[health] Report generated', {
      duration_ms: duration,
      jobs_queued: report.jobs_queued.total,
      jobs_processing: report.jobs_processing.count,
      stuck_count: stuckCount,
      dead_last_24h: deadLast24h,
      estimated_lag_seconds: estimatedLagSeconds,
    });

    return new Response(JSON.stringify(report, null, 2), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[health] Error:', error);
    const message = error instanceof Error ? error.message : String(error);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
