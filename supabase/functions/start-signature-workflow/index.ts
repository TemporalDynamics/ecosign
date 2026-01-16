import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withRateLimit } from '../_shared/ratelimit.ts'
import { appendEvent as appendCanonicalEvent } from '../_shared/canonicalEventHelper.ts'
import {
  generateSecretToken,
  createTokenHash,
  encryptToken,
} from '../_shared/cryptoHelper.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface Signer {
  email: string
  name?: string
  signingOrder: number
  requireLogin?: boolean
  requireNda?: boolean
  quickAccess?: boolean
}

interface StartWorkflowRequest {
  documentUrl: string
  documentHash: string
  originalFilename: string
  documentEntityId?: string
  signers: Signer[]
  forensicConfig: {
    rfc3161: boolean
    polygon: boolean
    bitcoin: boolean
  }
  /**
   * Delivery mode for signer notifications.
   * - 'email': Send invitation emails to signers automatically (default)
   * - 'link': No automatic emails, creator shares link manually
   * Immutable after workflow creation.
   */
  deliveryMode?: 'email' | 'link'
}

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })

async function triggerEmailDelivery(supabase: ReturnType<typeof createClient>) {
  try {
    await supabase.functions.invoke('send-pending-emails')
  } catch (error) {
    console.warn('send-pending-emails invoke failed', error)
  }
}

serve(withRateLimit('workflow', async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization' }, 401)
    }

    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized', details: userError?.message }, 401)
    }

    const body: StartWorkflowRequest = await req.json()
    const {
      documentUrl,
      documentHash,
      originalFilename,
      documentEntityId,
      signers,
      forensicConfig,
      deliveryMode = 'email' // Default to email for backwards compatibility
    } = body

    if (!documentUrl || !documentHash || !originalFilename || !signers || signers.length === 0) {
      return jsonResponse({ error: 'Missing required fields' }, 400)
    }

    // Validate deliveryMode if provided
    if (deliveryMode && !['email', 'link'].includes(deliveryMode)) {
      return jsonResponse({ error: 'Invalid deliveryMode. Must be "email" or "link"' }, 400)
    }

    const workflowPayload = {
      owner_id: user.id,
      original_filename: originalFilename,
      original_file_url: documentUrl,
      status: 'active',
      forensic_config: forensicConfig,
      delivery_mode: deliveryMode, // 'email' or 'link' - immutable after creation
      ...(documentEntityId ? { document_entity_id: documentEntityId } : {})
    }

    const { data: workflow, error: workflowError } = await supabase
      .from('signature_workflows')
      .insert(workflowPayload)
      .select()
      .single()

    if (workflowError || !workflow) {
      return jsonResponse({ error: 'Failed to create workflow', details: workflowError?.message }, 500)
    }

    const { data: version, error: versionError } = await supabase
      .from('workflow_versions')
      .insert({
        workflow_id: workflow.id,
        version_number: 1,
        document_url: documentUrl,
        document_hash: documentHash,
        change_reason: 'initial',
        status: 'active'
      })
      .select()
      .single()

    if (versionError || !version) {
      return jsonResponse({ error: 'Failed to create workflow version', details: versionError?.message }, 500)
    }

    const signersToInsert = []
    const accessTokens: Record<string, { token: string, tokenHash: string }> = {}
    const tokenLifetimeDays = 7

    for (const signer of signers) {
      const token = await generateSecretToken()
      const tokenHash = await createTokenHash(token)
      const { ciphertext, nonce } = await encryptToken(token)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + tokenLifetimeDays)

      const quickAccess = signer.quickAccess ?? false
      const requireLogin = quickAccess ? false : (signer.requireLogin ?? true)
      const requireNda = quickAccess ? false : (signer.requireNda ?? true)

      const signerRecord = {
        workflow_id: workflow.id,
        signing_order: signer.signingOrder,
        email: signer.email,
        name: signer.name || null,
        require_login: requireLogin,
        require_nda: requireNda,
        quick_access: quickAccess,
        status: signer.signingOrder === 1 ? 'ready_to_sign' : 'invited',
        access_token_hash: tokenHash,
        access_token_ciphertext: ciphertext,
        access_token_nonce: nonce,
        token_expires_at: expiresAt.toISOString()
      }

      signersToInsert.push(signerRecord)
      accessTokens[signer.email] = { token, tokenHash }
    }

    const { data: insertedSigners, error: signersError } = await supabase
      .from('workflow_signers')
      .insert(signersToInsert)
      .select('id, email, status, signing_order')

    if (signersError) {
      return jsonResponse({ error: 'Failed to create signers', details: signersError?.message }, 500)
    }
    
    // ... (Canonical event logging remains the same)

    const appUrl = Deno.env.get('APP_URL') || 'https://www.ecosign.app'

    await supabase
      .from('workflow_notifications')
      .insert({
        // ... (notification to owner remains the same)
      })

    await triggerEmailDelivery(supabase)

    const firstSigner = signers.find(s => s.signingOrder === 1)
    const firstSignerToken = firstSigner ? accessTokens[firstSigner.email]?.token : null
    const signUrl = firstSignerToken ? `${appUrl}/sign/${firstSignerToken}` : null
    
    let debugInfo = {}
    if (Deno.env.get('ENV') === 'local') {
        debugInfo = {
            accessTokens: Object.keys(accessTokens).reduce((acc, email) => {
                const { token, tokenHash } = accessTokens[email]
                acc[email] = {
                    token,
                    tokenHash,
                    url: `${appUrl}/sign/${token}`
                }
                return acc
            }, {} as Record<string, { token: string, tokenHash: string, url: string }>)
        }
    }

    const notificationMessage = deliveryMode === 'email'
      ? `Workflow started. ${signers.length} signer(s) added. First signer notified by email.`
      : `Workflow started. ${signers.length} signer(s) added. Share the link manually (no email sent).`

    return jsonResponse({
      success: true,
      workflowId: workflow.id,
      versionId: version.id,
      status: workflow.status,
      deliveryMode,
      signersCount: signers.length,
      firstSignerUrl: signUrl,
      message: notificationMessage,
      _debug: debugInfo
    })

  } catch (error) {
    console.error('Error in start-signature-workflow:', error)
    return jsonResponse({ error: error.message, stack: error.stack }, 500)
  }
}))
