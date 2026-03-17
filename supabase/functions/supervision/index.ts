/**
 * Supervision Edge Function (Consolidated)
 * 
 * Acciones:
 * - get_dashboard: Obtener dashboard de supervisión
 * - invite_member: Invitar miembro al workspace
 * - member_action: Acciones sobre miembros (suspender, activar, remover, cambiar rol, resend invite)
 * 
 * Request pattern:
 * POST /functions/v1/supervision
 * { "action": "get_dashboard" | "invite_member" | "member_action", ...payload }
 */

import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { handleGetDashboard } from './handlers/getDashboard.ts'
import { handleInviteMember } from './handlers/inviteMember.ts'
import { handleMemberAction } from './handlers/memberAction.ts'

const jsonResponse = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })

serve(async (req) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    if (!isAllowed) return new Response('Forbidden', { status: 403, headers: corsHeaders })
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  if (!isAllowed) {
    return jsonResponse({ ok: false, error: 'origin_not_allowed' }, 403, corsHeaders)
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405, corsHeaders)
  }

  try {
    // Determine action from request
    let action: string = 'get_dashboard' // default for GET requests
    
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      action = typeof body?.action === 'string' ? body.action : 'get_dashboard'
    }

    // Route to appropriate handler
    let result: any

    switch (action) {
      case 'get_dashboard':
      case 'dashboard':
        result = await handleGetDashboard(req, corsHeaders)
        break
      
      case 'invite_member':
      case 'inviteMember':
        result = await handleInviteMember(req, corsHeaders)
        break
      
      case 'member_action':
      case 'memberAction':
        result = await handleMemberAction(req, corsHeaders)
        break
      
      default:
        return jsonResponse({ 
          ok: false, 
          error: 'unknown_action',
          message: `Action '${action}' not recognized. Valid actions: get_dashboard, invite_member, member_action`
        }, 400, corsHeaders)
    }

    // Return response
    if (result.ok === true) {
      return jsonResponse(result.data || { ok: true }, result.status || 200, corsHeaders)
    } else {
      return jsonResponse(result, result.status || 500, corsHeaders)
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[supervision] Error:', message)
    return jsonResponse({ ok: false, error: 'internal_error', message }, 500, corsHeaders)
  }
})
