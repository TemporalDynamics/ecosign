import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

serve(async (req) => {
  throw new Error('Legacy path disabled by EPI invariants')
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined);

  if (Deno.env.get('FASE') !== '1') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    if (!isAllowed) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }
    return new Response('ok', { headers: corsHeaders });
  }

  if (!isAllowed) {
    return jsonResponse({ success: false, error: 'Origin not allowed' }, 403, corsHeaders);
  }

  // Deprecated: TSA evidence must be produced server-side via jobs (run-tsa).
  return jsonResponse(
    {
      success: false,
      error: 'append-tsa-event is deprecated. TSA evidence is produced server-side via jobs (run-tsa).'
    },
    410,
    corsHeaders
  );
});
