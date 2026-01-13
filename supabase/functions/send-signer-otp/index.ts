import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { sendEmail, buildSignerOtpEmail } from '../_shared/email.ts'
import { appendEvent as appendCanonicalEvent } from '../_shared/canonicalEventHelper.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface RequestPayload {
  signerId: string
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { signerId } = (await req.json()) as RequestPayload
    if (!signerId) return json({ error: 'signerId is required' }, 400)

    // Fetch signer info
    const { data: signer, error: signerErr } = await supabase
      .from('workflow_signers')
      .select(`
        id,
        email,
        name,
        workflow:signature_workflows (id, title)
      `)
      .eq('id', signerId)
      .single()

    if (signerErr || !signer) {
      return json(
        { error: 'Signer not found', details: signerErr?.message || 'signer_missing' },
        404
      )
    }

    if (!signer.email) {
      return json(
        { error: 'Signer email missing', details: 'signer_email_empty' },
        400
      )
    }

    if (!signer.workflow?.id) {
      return json(
        { error: 'Workflow not found for signer', details: 'workflow_missing' },
        500
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
        500
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
        500
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

    return json({ success: true, expiresAt, emailSent: !!emailRes.success })
  } catch (error: any) {
    console.error('send-signer-otp error', error)
    return json({ error: error?.message || 'Unexpected error', details: error?.stack }, 500)
  }
})
