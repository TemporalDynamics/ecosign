/**
 * dead-jobs Edge Function
 *
 * Endpoint para listar jobs en estado 'dead' con contexto suficiente
 * para diagnosticar "qué se rompió y dónde" en minutos.
 *
 * Fase 2.2: Dead jobs diagnostics
 *
 * Auth: Requiere service_role (no público)
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { getCorsHeaders } from '../_shared/cors.ts';

interface DeadJobReport {
  summary: {
    total_dead: number;
    by_type: Record<string, number>;
    by_reason: Record<string, number>;
    query_params: {
      limit: number;
      since_hours: number;
      type?: string;
      correlation_id?: string;
    };
  };
  jobs: Array<{
    job_id: string;
    type: string;
    entity_id: string;
    correlation_id: string | null;
    trace_id: string | null;

    status: string;
    attempts: number;
    max_attempts: number;

    locked_at: string | null;
    locked_by: string | null;
    heartbeat_at: string | null;

    reason: 'ttl_exceeded' | 'max_attempts_exceeded' | 'handler_error' | 'precondition_failed';

    created_at: string;
    updated_at: string;
    run_at: string;

    last_error: string | null;
  }>;
}

type DeadJob = {
  id: string;
  type: string;
  entity_id: string;
  correlation_id: string | null;
  trace_id: string | null;
  status: string;
  attempts: number;
  max_attempts: number;
  locked_at: string | null;
  locked_by: string | null;
  heartbeat_at: string | null;
  created_at: string;
  updated_at: string;
  run_at: string;
  last_error: string | null;
};

function deriveReason(job: DeadJob): 'ttl_exceeded' | 'max_attempts_exceeded' | 'handler_error' | 'precondition_failed' {
  const lastError = job.last_error || '';

  // TTL exceeded (reclaimed by TTL mechanism)
  if (lastError.startsWith('RECLAIMED_TTL:')) {
    return 'ttl_exceeded';
  }

  // Precondition failed (authority/invariant violation)
  if (lastError.startsWith('precondition_failed:') || lastError.includes('authority_reject:')) {
    return 'precondition_failed';
  }

  // Max attempts exceeded (default for dead status)
  if (job.attempts >= job.max_attempts) {
    return 'max_attempts_exceeded';
  }

  // Default: handler error
  return 'handler_error';
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

    // Parse query parameters
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || '50'), 500);
    const sinceHours = Number(url.searchParams.get('since_hours') || '24');
    const typeFilter = url.searchParams.get('type') || undefined;
    const correlationIdFilter = url.searchParams.get('correlation_id') || undefined;

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Build query - derive dead condition instead of relying on status='dead'
    // Dead = attempts >= max_attempts AND status IN ('dead', 'failed')
    // Note: status='dead' is legacy (set by old code), 'failed' is canonical
    // Running jobs with TTL exceeded are NOT dead - they're reclaimable
    let query = supabase
      .from('executor_jobs')
      .select('*')
      .in('status', ['dead', 'failed'])  // Derive dead from attempts, not just status
      .gte('updated_at', new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString())
      .order('updated_at', { ascending: false })
      .limit(limit * 2);  // Fetch 2x to filter by attempts >= max_attempts

    if (typeFilter) {
      query = query.eq('type', typeFilter);
    }

    if (correlationIdFilter) {
      query = query.eq('correlation_id', correlationIdFilter);
    }

    const { data: candidateJobs, error: queryError } = await query;

    if (queryError) {
      throw new Error(`Database query failed: ${queryError.message}`);
    }

    // Filter to truly dead jobs: attempts >= max_attempts
    const deadJobs = (candidateJobs || [])
      .filter((job: DeadJob) => job.attempts >= job.max_attempts)
      .slice(0, limit);  // Apply limit after filtering

    const jobs = deadJobs as DeadJob[];

    // Build summary
    const byType: Record<string, number> = {};
    const byReason: Record<string, number> = {};

    const mappedJobs = jobs.map((job) => {
      const reason = deriveReason(job);

      // Aggregate by type
      byType[job.type] = (byType[job.type] || 0) + 1;

      // Aggregate by reason
      byReason[reason] = (byReason[reason] || 0) + 1;

      return {
        job_id: job.id,
        type: job.type,
        entity_id: job.entity_id,
        correlation_id: job.correlation_id,
        trace_id: job.trace_id,
        status: job.status,
        attempts: job.attempts,
        max_attempts: job.max_attempts,
        locked_at: job.locked_at,
        locked_by: job.locked_by,
        heartbeat_at: job.heartbeat_at,
        reason,
        created_at: job.created_at,
        updated_at: job.updated_at,
        run_at: job.run_at,
        last_error: job.last_error,
      };
    });

    const report: DeadJobReport = {
      summary: {
        total_dead: jobs.length,
        by_type: byType,
        by_reason: byReason,
        query_params: {
          limit,
          since_hours: sinceHours,
          type: typeFilter,
          correlation_id: correlationIdFilter,
        },
      },
      jobs: mappedJobs,
    };

    // Log if there are dead jobs (for monitoring)
    if (jobs.length > 0) {
      console.log('[dead-jobs] Found dead jobs', {
        total: jobs.length,
        by_type: byType,
        by_reason: byReason,
      });
    }

    return new Response(JSON.stringify(report, null, 2), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[dead-jobs] Error:', error);
    const message = error instanceof Error ? error.message : String(error);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
