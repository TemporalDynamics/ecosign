import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { sendEmail, buildSignerOtpEmail } from '../_shared/email.ts'
import { appendEvent as appendCanonicalEvent } from '../_shared/canonicalEventHelper.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { validateSignerAccessToken } from '../_shared/signerAccessToken.ts'

interface RequestPayload {
  signerId: string
  accessToken: string
}

const OTP_RESEND_COOLDOWN_MS = 30_000

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
    if (!accessToken?.trim()) return json({ error: 'accessToken is required' }, 400, corsHeaders)

    const signerValidation = await validateSignerAccessToken<{
      id: string
      email: string | null
      name: string | null
      token_expires_at: string | null
      token_revoked_at: string | null
      workflow: { id: string; title: string | null } | null
      access_token_hash: string | null
    }>(
      supabase,
      signerId,
      accessToken,
      `
        id,
        email,
        name,
        token_expires_at,
        token_revoked_at,
        access_token_hash,
        workflow:signature_workflows (id, title)
      `
    )

    if (!signerValidation.ok) {
      return json({ error: signerValidation.error }, signerValidation.status, corsHeaders)
    }
    const signer = signerValidation.signer

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

    const { data: existingOtp, error: existingOtpError } = await supabase
      .from('signer_otps')
      .select('last_sent_at')
      .eq('signer_id', signer.id)
      .maybeSingle()

    if (existingOtpError) {
      console.warn('send-signer-otp existing record check failed', existingOtpError)
    } else if (existingOtp?.last_sent_at) {
      const lastSentAtMs = new Date(existingOtp.last_sent_at).getTime()
      if (Number.isFinite(lastSentAtMs)) {
        const elapsedMs = Date.now() - lastSentAtMs
        if (elapsedMs >= 0 && elapsedMs < OTP_RESEND_COOLDOWN_MS) {
          const retryAfterSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsedMs) / 1000)
          return json(
            {
              success: false,
              error: 'OTP recently sent',
              retry_after_seconds: retryAfterSeconds,
              retryable: true
            },
            429,
            corsHeaders
          )
        }
      }
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

    // Audit (best-effort)
    // Map OTP send to an existing ECOX event type.
    try {
      await supabase.functions.invoke('log-ecox-event', {
        body: {
          workflow_id: signer.workflow.id,
          signer_id: signer.id,
          event_type: 'otp.sent',
          details: { method: 'email_otp', expires_at: expiresAt }
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
