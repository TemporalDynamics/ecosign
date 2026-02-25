import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { getCorsHeaders } from '../_shared/cors.ts';
import { withRateLimit } from '../_shared/ratelimit.ts';

const jsonResponse = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });

const ACTA_HASH_REGEX = /^[a-f0-9]{64}$/i;

const extractActaHash = (
  req: Request,
  body: Record<string, unknown> | null,
): string => {
  const url = new URL(req.url);
  const queryHash = (url.searchParams.get('acta_hash') ?? '').trim();
  if (queryHash) return queryHash;

  if (body && typeof body.acta_hash === 'string') {
    return body.acta_hash.trim();
  }

  return '';
};

serve(
  withRateLimit('verify', async (req) => {
    const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined);

    if (req.method === 'OPTIONS') {
      if (!isAllowed) return new Response('Forbidden', { status: 403, headers: corsHeaders });
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    if (!isAllowed) {
      return jsonResponse({ success: false, error: 'Origin not allowed' }, 403, corsHeaders);
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405, corsHeaders);
    }

    try {
      const body =
        req.method === 'POST'
          ? ((await req.json().catch(() => null)) as Record<string, unknown> | null)
          : null;
      const actaHash = extractActaHash(req, body);

      if (!ACTA_HASH_REGEX.test(actaHash)) {
        return jsonResponse(
          { success: false, error: 'invalid_acta_hash' },
          400,
          corsHeaders,
        );
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

      const { data, error } = await supabase
        .from('presential_verification_sessions')
        .select('session_id, operation_id, acta_hash, acta_payload, acta_timestamps, closed_at')
        .eq('acta_hash', actaHash)
        .order('closed_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('presential-verification-get-acta query error:', error);
        return jsonResponse(
          { success: false, error: 'query_failed' },
          500,
          corsHeaders,
        );
      }

      const session = Array.isArray(data) ? data[0] : null;
      if (!session || !session.acta_payload || typeof session.acta_payload !== 'object') {
        return jsonResponse(
          { success: false, error: 'acta_not_found' },
          404,
          corsHeaders,
        );
      }

      return jsonResponse(
        {
          success: true,
          actaHash: session.acta_hash,
          sessionId: session.session_id,
          operationId: session.operation_id,
          closedAt: session.closed_at ?? null,
          actaEco: session.acta_payload,
          timestamps: Array.isArray(session.acta_timestamps) ? session.acta_timestamps : [],
        },
        200,
        corsHeaders,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('presential-verification-get-acta error:', message);
      return jsonResponse({ success: false, error: message }, 500, corsHeaders);
    }
  }),
);
