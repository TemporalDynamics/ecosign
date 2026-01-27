import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { sendEmail, buildSignerOtpEmail } from '../_shared/email.ts'
import { appendEvent as appendCanonicalEvent } from '../_shared/canonicalEventHelper.ts'
import { createTokenHash } from '../_shared/cryptoHelper.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

interface RequestPayload {
  signerId: string
  accessToken?: string
}

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' }
  })

const hashCode = async (code: string) => {
  const encoder = new TextEncoder()
  const buf = encoder.encode(code)
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

const requireCronSecret = (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET') ?? ''
  const provided = req.headers.get('x-cron-secret') ?? ''
  if (cronSecret && provided === cronSecret) return null
  return new Response('Forbidden', { status: 403 })
}

serve(async (req) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined)
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  if (req.method === 'OPTIONS') {
    if (!isAllowed) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }
    return new Response('ok', { headers: corsHeaders })
  }
  if (!isAllowed) return json({ error: 'Origin not allowed' }, 403, corsHeaders)
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, corsHeaders)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { signerId, accessToken } = (await req.json()) as RequestPayload
    if (!signerId) return json({ error: 'signerId is required' }, 400, corsHeaders)

    const authError = requireCronSecret(req)
    if (authError) {
      if (!accessToken) return authError
    }

    // Fetch signer info
    const tokenHash = accessToken
      ? (/^[a-f0-9]{64}$/i.test(accessToken) ? accessToken : await createTokenHash(accessToken))
      : null

    let signerQuery = supabase
      .from('workflow_signers')
      .select(`
        id,
        email,
        name,
        token_expires_at,
        token_revoked_at,
        workflow:signature_workflows (id, title)
      `)
      .eq('id', signerId)

    if (tokenHash) {
      signerQuery = signerQuery.eq('access_token_hash', tokenHash)
    }

    const { data: signer, error: signerErr } = await signerQuery.single()

    if (signerErr || !signer) {
      return json(
        { error: 'Signer not found', details: signerErr?.message || 'signer_missing' },
        404,
        corsHeaders
      )
    }

    if (!signer.email) {
      return json(
        { error: 'Signer email missing', details: 'signer_email_empty' },
        400,
        corsHeaders
      )
    }

    if (signer.token_revoked_at) {
      return json({ error: 'Token has been revoked' }, 403, corsHeaders)
    }

    if (signer.token_expires_at && new Date(signer.token_expires_at) < new Date()) {
      return json({ error: 'Token has expired' }, 403, corsHeaders)
    }

    if (!signer.workflow?.id) {
      return json(
        { error: 'Workflow not found for signer', details: 'workflow_missing' },
        500,
        corsHeaders
      )
    }

    const code = generateCode()
    const hash = await hashCode(code)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Upsert OTP
    const { error: upsertErr } = await supabase
      .from('signer_otps')
      .upsert({
        signer_id: signer.id,
        workflow_id: signer.workflow.id,
        otp_hash: hash,
        expires_at: expiresAt,
        attempts: 0,
        verified_at: null,
        last_sent_at: new Date().toISOString()
      })

    if (upsertErr) {
      console.error('send-signer-otp upsert failed', upsertErr)
      return json(
        {
          error: 'Could not generate OTP',
          details: upsertErr.message
        },
        500,
        corsHeaders
      )
    }

    // Send email
    const emailPayload = await buildSignerOtpEmail({
      signerEmail: signer.email,
      signerName: signer.name,
      workflowTitle: signer.workflow?.title || 'Documento',
      otpCode: code,
      siteUrl: Deno.env.get('SITE_URL')
    })
    const emailRes = await sendEmail(emailPayload)
    if (!emailRes.success) {
      console.error('send-signer-otp email failed', emailRes)
      return json(
        {
          error: 'No se pudo enviar el email con OTP',
          details: emailRes.body || emailRes.error || 'email_send_failed',
          statusCode: emailRes.statusCode,
          signerEmail: signer.email
        },
        500,
        corsHeaders
      )
    }

    // Audit
    try {
      await supabase.functions.invoke('log-ecox-event', {
        body: {
          workflowId: signer.workflow.id,
          signerId: signer.id,
          eventType: 'otp_sent',
          details: { expiresAt }
        }
      })
    } catch (err) {
      console.warn('send-signer-otp log-ecox-event failed', err)
    }

    await appendCanonicalEvent(
      supabase,
      {
        event_type: 'otp.sent',
        workflow_id: signer.workflow.id,
        signer_id: signer.id,
        payload: { expires_at: expiresAt }
      },
      'send-signer-otp'
    )

    return json({ success: true, expiresAt, emailSent: !!emailRes.success }, 200, corsHeaders)
  } catch (error: any) {
    console.error('send-signer-otp error', error)
    return json({ error: error?.message || 'Unexpected error', details: error?.stack }, 500, corsHeaders)
  }
})
