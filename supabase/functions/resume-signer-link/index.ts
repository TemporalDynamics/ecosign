import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { getCorsHeaders } from '../_shared/cors.ts'
import { decryptToken } from '../_shared/cryptoHelper.ts'

type ResumeRequest = {
  workflowId?: string
}

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 })
  }

  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined)
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  if (req.method === 'OPTIONS') {
    if (!isAllowed) return new Response('Forbidden', { status: 403, headers: corsHeaders })
    return new Response('ok', { headers: corsHeaders })
  }

  if (!isAllowed) return json({ success: false, error_code: 'ORIGIN_NOT_ALLOWED', message: 'Origin not allowed' }, 403)
  if (req.method !== 'POST') return json({ success: false, error_code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }, 405)

  try {
    const body = (await req.json().catch(() => ({}))) as ResumeRequest
    const workflowId = String(body?.workflowId ?? '').trim()
    if (!workflowId) {
      return json({
        success: false,
        error_code: 'WORKFLOW_ID_REQUIRED',
        message: 'workflowId is required',
        retryable: false
      }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({
        success: false,
        error_code: 'UNAUTHORIZED',
        message: 'Missing authorization',
        retryable: false
      }, 401)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: authData, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !authData.user) {
      return json({
        success: false,
        error_code: 'UNAUTHORIZED',
        message: 'Unauthorized',
        retryable: false
      }, 401)
    }

    const ownerId = authData.user.id
    const { data: workflow, error: workflowError } = await supabase
      .from('signature_workflows')
      .select('id, owner_id, status')
      .eq('id', workflowId)
      .single()

    if (workflowError || !workflow) {
      return json({
        success: false,
        error_code: 'WORKFLOW_NOT_FOUND',
        message: 'Workflow not found',
        retryable: false
      }, 404)
    }

    if (workflow.owner_id !== ownerId) {
      return json({
        success: false,
        error_code: 'WORKFLOW_OWNER_MISMATCH',
        message: 'Only workflow owner can resume signer link',
        workflow_status: workflow.status,
        retryable: false
      }, 403)
    }

    if (!['active', 'ready'].includes(workflow.status)) {
      return json({
        success: false,
        error_code: 'FLOW_NOT_ACTIVE',
        message: 'Workflow is not resumable',
        workflow_status: workflow.status,
        retryable: false
      }, 409)
    }

    const { data: signers, error: signersError } = await supabase
      .from('workflow_signers')
      .select('id, status, signing_order, access_token_hash, access_token_ciphertext, access_token_nonce, token_expires_at, token_revoked_at')
      .eq('workflow_id', workflowId)
      .order('signing_order', { ascending: true })

    if (signersError || !signers || signers.length === 0) {
      return json({
        success: false,
        error_code: 'SIGNER_NOT_FOUND',
        message: 'No signers found for workflow',
        workflow_status: workflow.status,
        retryable: false
      }, 404)
    }

    const signer = signers.find((s: any) => s.status === 'ready_to_sign')
    if (!signer) {
      return json({
        success: false,
        error_code: 'SIGNER_NOT_READY_TO_SIGN',
        message: 'No signer currently ready to sign',
        workflow_status: workflow.status,
        retryable: false
      }, 409)
    }

    if (signer.token_revoked_at) {
      return json({
        success: false,
        error_code: 'SIGNER_TOKEN_REVOKED',
        message: 'Signer token has been revoked',
        workflow_status: workflow.status,
        retryable: false
      }, 409)
    }

    if (signer.token_expires_at && new Date(signer.token_expires_at) < new Date()) {
      return json({
        success: false,
        error_code: 'SIGNER_TOKEN_EXPIRED',
        message: 'Signer token has expired',
        workflow_status: workflow.status,
        retryable: false
      }, 409)
    }

    let tokenOrHash: string | null = signer.access_token_hash ?? null
    if (signer.access_token_ciphertext && signer.access_token_nonce) {
      try {
        tokenOrHash = await decryptToken({
          ciphertext: signer.access_token_ciphertext,
          nonce: signer.access_token_nonce
        })
      } catch (decryptErr) {
        console.warn('resume-signer-link: failed to decrypt token, using hash fallback', decryptErr)
      }
    }

    if (!tokenOrHash) {
      return json({
        success: false,
        error_code: 'SIGNER_TOKEN_UNAVAILABLE',
        message: 'Could not resolve signer token',
        workflow_status: workflow.status,
        retryable: false
      }, 500)
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://app.ecosign.app'
    const signUrl = `${appUrl}/sign/${tokenOrHash}`

    return json({
      success: true,
      workflow_id: workflow.id,
      workflow_status: workflow.status,
      signer_id: signer.id,
      signer_status: signer.status,
      sign_url: signUrl
    })
  } catch (error) {
    console.error('resume-signer-link error', error)
    return json({
      success: false,
      error_code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Internal error',
      retryable: true
    }, 500)
  }
})
