/**
 * Admin-Trials Edge Function (Consolidated)
 * 
 * Acciones:
 * - grant_trial: Conceder trial a usuario nuevo
 * - issue_offer: Emitir oferta de trial con descuento
 * - invite_member: Invitar miembro a workspace existente
 * - expire_trials: Expirar trials vencidos (cron job)
 * 
 * Request pattern:
 * POST /functions/v1/admin-trials
 * { "action": "grant_trial" | "issue_offer" | "invite_member" | "expire_trials", ...payload }
 * 
 * Auth:
 * - Internal (service_role o cron secret)
 * - Admin user (email en ADMIN_EMAILS env)
 */

import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { handleGrantTrial } from './handlers/grantTrial.ts'
import { handleIssueOffer } from './handlers/issueOffer.ts'
import { handleInviteMember } from './handlers/inviteMember.ts'
import { handleExpireTrials } from './handlers/expireTrials.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret, x-internal-secret',
}

const jsonResponse = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405, corsHeaders)
  }

  try {
    // Determine action from request
    const body = await req.json().catch(() => ({}))
    const action = typeof body?.action === 'string' ? body.action : ''

    if (!action) {
      return jsonResponse({ 
        ok: false, 
        error: 'missing_action',
        message: 'Action is required. Valid actions: grant_trial, issue_offer, invite_member, expire_trials'
      }, 400, corsHeaders)
    }

    // Route to appropriate handler
    let result: any

    switch (action) {
      case 'grant_trial':
      case 'grantTrial':
        result = await handleGrantTrial(req, corsHeaders)
        break
      
      case 'issue_offer':
      case 'issueOffer':
        result = await handleIssueOffer(req, corsHeaders)
        break
      
      case 'invite_member':
      case 'inviteMember':
        result = await handleInviteMember(req, corsHeaders)
        break
      
      case 'expire_trials':
      case 'expireTrials':
        result = await handleExpireTrials(req, corsHeaders)
        break
      
      default:
        return jsonResponse({ 
          ok: false, 
          error: 'unknown_action',
          message: `Action '${action}' not recognized. Valid actions: grant_trial, issue_offer, invite_member, expire_trials`
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
    console.error('[admin-trials] Error:', message)
    return jsonResponse({ ok: false, error: 'internal_error', message }, 500, corsHeaders)
  }
})
