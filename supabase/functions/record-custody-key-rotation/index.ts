import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { requireInternalAuthLogged } from '../_shared/internalAuth.ts'
import { logCustodyKeyRotation } from '../_shared/custodyAudit.ts'

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

type RotationRequest = {
  document_entity_id?: string
  rotated_by?: string | null
  previous_key_id?: string | null
  new_key_id?: string | null
  reason?: string | null
  metadata?: Record<string, unknown> | null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const authResult = requireInternalAuthLogged(req, 'record-custody-key-rotation')
  if (!authResult.ok) {
    return jsonResponse({ error: authResult.reason }, 401)
  }

  try {
    const body = (await req.json().catch(() => ({}))) as RotationRequest
    const documentEntityId = String(body.document_entity_id ?? '').trim()
    const newKeyId = String(body.new_key_id ?? '').trim()

    if (!documentEntityId || !newKeyId) {
      return jsonResponse({ error: 'document_entity_id and new_key_id required' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse({ error: 'Supabase env missing' }, 500)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    await logCustodyKeyRotation(supabase, {
      document_entity_id: documentEntityId,
      rotated_by: body.rotated_by ?? null,
      previous_key_id: body.previous_key_id ?? null,
      new_key_id: newKeyId,
      reason: body.reason ?? null,
      metadata: body.metadata ?? null,
    })

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('[record-custody-key-rotation] error', error)
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500)
  }
})
