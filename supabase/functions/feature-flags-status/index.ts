/**
 * feature-flags-status Edge Function
 * 
 * Endpoint para consultar el estado actual de todos los feature flags
 * Muestra tanto el estado en Deno (TypeScript) como en SQL
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { withRateLimit } from '../_shared/ratelimit.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(withRateLimit('feature-flags-status', async (req) => {
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

  try {
    // Validar autorización (requiere service_role)
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!authHeader || !serviceRoleKey || !authHeader.includes(serviceRoleKey)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Obtener flags desde la base de datos
    const { data: sqlFlags, error: dbError } = await supabase
      .from('feature_flags')
      .select('flag_name, enabled')
      .in('flag_name', [
        'D1_RUN_TSA_ENABLED',
        'D3_BUILD_ARTIFACT_ENABLED', 
        'D4_ANCHORS_ENABLED',
        'D5_NOTIFICATIONS_ENABLED'
      ]);

    if (dbError) {
      console.error('[feature-flags-status] Error reading from database:', dbError);
      return new Response(JSON.stringify({ error: 'Database read failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Mapear flags SQL a objeto
    const sqlFlagsObj: Record<string, boolean> = {};
    sqlFlags.forEach(row => {
      sqlFlagsObj[row.flag_name] = row.enabled;
    });

    // Obtener flags desde Deno env
    const denoFlags = {
      'D1_RUN_TSA_ENABLED': Deno.env.get('ENABLE_D1_CANONICAL') === 'true',
      'D3_BUILD_ARTIFACT_ENABLED': Deno.env.get('ENABLE_D3_CANONICAL') === 'true',
      'D4_ANCHORS_ENABLED': Deno.env.get('ENABLE_D4_CANONICAL') === 'true',
      'D5_NOTIFICATIONS_ENABLED': Deno.env.get('ENABLE_D5_CANONICAL') === 'true',
    };

    // Calcular estado de sincronización
    let syncStatus = 'OK';
    for (const flagName in denoFlags) {
      if (sqlFlagsObj[flagName] !== denoFlags[flagName]) {
        syncStatus = 'MISMATCH';
        break;
      }
    }

    // Calcular discrepancias
    const mismatches: string[] = [];
    for (const flagName in denoFlags) {
      if (sqlFlagsObj[flagName] !== denoFlags[flagName]) {
        mismatches.push(`${flagName}: Deno=${denoFlags[flagName]}, SQL=${sqlFlagsObj[flagName]}`);
      }
    }

    const statusResponse = {
      timestamp: new Date().toISOString(),
      sync_status: syncStatus,
      mismatches: mismatches,
      typescript_flags: denoFlags,
      sql_flags: sqlFlagsObj,
      message: syncStatus === 'OK' 
        ? 'All flags are synchronized between TypeScript and SQL' 
        : `Discrepancies found: ${mismatches.join('; ')}. Sync needed.`,
      note: 'SQL flags are updated by executor on startup. Deno flags are source of truth.'
    };

    return new Response(JSON.stringify(statusResponse, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in feature-flags-status:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}));