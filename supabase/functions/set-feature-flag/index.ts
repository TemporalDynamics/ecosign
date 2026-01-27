/**
 * set-feature-flag Edge Function
 * 
 * Endpoint para actualizar feature flags en tiempo de ejecución
 * Sincroniza los cambios tanto en la tabla SQL como en las variables de entorno
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { withRateLimit } from '../_shared/ratelimit.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

interface SetFeatureFlagRequest {
  flagName: string;
  enabled: boolean;
  // Opcional: token de autorización adicional si se desea mayor seguridad
  authorizationToken?: string;
}

// Validar que el flag name sea uno de los permitidos
const VALID_FLAG_NAMES = [
  'D1_RUN_TSA_ENABLED',
  'D3_BUILD_ARTIFACT_ENABLED', 
  'D4_ANCHORS_ENABLED',
  'D5_NOTIFICATIONS_ENABLED'
];

Deno.serve(withRateLimit('set-feature-flag', async (req) => {
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
    // Validar autorización (requiere service_role o header especial)
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!authHeader || !serviceRoleKey || !authHeader.includes(serviceRoleKey)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body: SetFeatureFlagRequest = await req.json();
    
    // Validar parámetros
    if (!body.flagName || typeof body.enabled !== 'boolean') {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: flagName (string), enabled (boolean)' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validar que el flag name sea válido
    if (!VALID_FLAG_NAMES.includes(body.flagName)) {
      return new Response(JSON.stringify({ 
        error: `Invalid flag name. Valid options: ${VALID_FLAG_NAMES.join(', ')}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Actualizar la tabla de feature flags
    const { error: dbError } = await supabase
      .from('feature_flags')
      .upsert({
        flag_name: body.flagName,
        enabled: body.enabled,
        updated_at: new Date().toISOString()
      }, { onConflict: 'flag_name' });

    if (dbError) {
      console.error('[set-feature-flag] Error updating database:', dbError);
      return new Response(JSON.stringify({ error: 'Database update failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Mapear flag name a variable de entorno correspondiente
    const flagToEnvMap: Record<string, string> = {
      'D1_RUN_TSA_ENABLED': 'ENABLE_D1_CANONICAL',
      'D3_BUILD_ARTIFACT_ENABLED': 'ENABLE_D3_CANONICAL', 
      'D4_ANCHORS_ENABLED': 'ENABLE_D4_CANONICAL',
      'D5_NOTIFICATIONS_ENABLED': 'ENABLE_D5_CANONICAL'
    };

    const envVarName = flagToEnvMap[body.flagName];
    if (envVarName) {
      // En un entorno real, esto requeriría una actualización en el sistema de deployment
      // Por ahora, registramos el cambio para que el equipo lo aplique manualmente
      console.log(`[set-feature-flag] Flag ${body.flagName} set to ${body.enabled}. ` +
                 `To fully take effect, update environment variable ${envVarName} to "${body.enabled}" ` +
                 `and redeploy the function.`);
    }

    console.log(`[set-feature-flag] Updated flag ${body.flagName} to ${body.enabled}`);

    return new Response(JSON.stringify({ 
      success: true,
      flagName: body.flagName,
      enabled: body.enabled,
      message: `Flag ${body.flagName} updated to ${body.enabled}. ` +
               `Note: Environment variable sync requires redeployment for full effect.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in set-feature-flag:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}));