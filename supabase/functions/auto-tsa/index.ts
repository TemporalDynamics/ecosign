import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

serve(async (req) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ success: false, error: 'Method not allowed' }, 405)

  // Deprecated: TSA evidence must be produced via the canonical job pipeline (run_tsa -> run-tsa).
  // This endpoint used to write tsa.confirmed directly, which violates Phase 1 canonical closure.
  return new Response(
    JSON.stringify({
      success: false,
      error: 'auto-tsa is deprecated. Use the canonical job pipeline (run_tsa -> run-tsa).'
    }),
    { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
