import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { getCorsHeaders } from '../_shared/cors.ts'

const jsonResponse = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })

async function resolveAuthUser(supabase: any, authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

serve(async (req) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined)

  if (req.method === 'OPTIONS') {
    if (!isAllowed) return new Response('Forbidden', { status: 403, headers: corsHeaders })
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  if (!isAllowed) return jsonResponse({ ok: false, error: 'origin_not_allowed' }, 403, corsHeaders)
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405, corsHeaders)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ ok: false, error: 'missing_supabase_env' }, 500, corsHeaders)

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const authUser = await resolveAuthUser(supabase, req.headers.get('Authorization'))
    if (!authUser?.id) return jsonResponse({ ok: false, error: 'unauthorized' }, 401, corsHeaders)

    const body = await req.json().catch(() => ({}))
    const workspaceId = typeof body?.workspace_id === 'string' ? body.workspace_id : null
    if (!workspaceId) return jsonResponse({ ok: false, error: 'missing_workspace_id' }, 400, corsHeaders)

    const { error } = await supabase
      .from('workspace_members')
      .update({ last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('user_id', authUser.id)
      .neq('status', 'removed')

    if (error) return jsonResponse({ ok: false, error: 'update_failed' }, 500, corsHeaders)
    return jsonResponse({ ok: true }, 200, corsHeaders)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ ok: false, error: 'internal_error', message }, 500, corsHeaders)
  }
})

