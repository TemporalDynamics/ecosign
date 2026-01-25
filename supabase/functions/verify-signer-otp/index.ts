import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.92.0?target=deno'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { appendEvent, hashIP, getBrowserFamily } from '../_shared/eventHelper.ts'
import { appendEvent as appendCanonicalEvent } from '../_shared/canonicalEventHelper.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface RequestPayload {
  signerId: string
  otp: string
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

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Extract metadata from request
    const metadata = {
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                  req.headers.get('x-real-ip') || null,
      user_agent: req.headers.get('user-agent') || null,
      country: req.headers.get('cf-ipcountry') || req.headers.get('x-vercel-ip-country') || null,
      session_id: crypto.randomUUID()
    }

    const { signerId, otp } = (await req.json()) as RequestPayload
    if (!signerId || !otp) return json({ error: 'signerId and otp are required' }, 400)

    const { data: record, error: otpErr } = await supabase
      .from('signer_otps')
      .select('signer_id, workflow_id, otp_hash, expires_at, attempts, verified_at')
      .eq('signer_id', signerId)
      .single()

    if (otpErr || !record) return json({ error: 'OTP not found' }, 404)

    if (record.verified_at) return json({ error: 'OTP already used' }, 400)

    if (record.attempts >= 5) return json({ error: 'Too many attempts' }, 429)

    const now = new Date()
    if (new Date(record.expires_at) < now) {
      return json({ error: 'OTP expired' }, 400)
    }

    const hash = await hashCode(otp.trim())
    const isValid = hash === record.otp_hash

    const { error: updateErr } = await supabase
      .from('signer_otps')
      .update({
        attempts: record.attempts + 1,
        verified_at: isValid ? new Date().toISOString() : null
      })
      .eq('signer_id', signerId)

    if (updateErr) {
      console.error('verify-signer-otp update failed', updateErr)
    }

    if (!isValid) {
      return json({ error: 'OTP inválido' }, 400)
    }

    // === PROBATORY EVENT: otp_verified ===
    // Get signer email and workflow info for event
    try {
      const { data: signer } = await supabase
        .from('workflow_signers')
        .select('email, name')
        .eq('id', signerId)
        .single()

      const { data: workflow } = await supabase
        .from('signature_workflows')
        .select('id, document_entity_id')
        .eq('id', record.workflow_id)
        .single()

      if (workflow?.document_entity_id && signer) {
        const ipHash = metadata.ip_address ? await hashIP(metadata.ip_address) : null
        const browserFamily = getBrowserFamily(metadata.user_agent)

        const eventResult = await appendEvent(
          supabase,
          workflow.document_entity_id,
          {
            kind: 'otp_verified',
            at: new Date().toISOString(),
            otp: {
              signer_email: signer.email,
              workflow_id: record.workflow_id,
              verification_method: 'email_otp',
              attempts: record.attempts + 1 // Include the current successful attempt
            },
            context: {
              ip_hash: ipHash,
              geo: metadata.country,
              browser: browserFamily,
              session_id: metadata.session_id
            }
          },
          'verify-signer-otp'
        )

        if (!eventResult.success) {
          console.error('Failed to append otp_verified event:', eventResult.error)
          // Don't fail the request, OTP was verified successfully
        }
      }
    } catch (err) {
      console.warn('verify-signer-otp event recording failed', err)
      // Don't fail the request
    }

    // Log ECOX
    try {
      await supabase.functions.invoke('log-ecox-event', {
        body: {
          workflowId: record.workflow_id,
          signerId,
          eventType: 'otp_verified'
        }
      })
    } catch (err) {
      console.warn('verify-signer-otp log-ecox-event failed', err)
    }

    await appendCanonicalEvent(
      supabase,
      {
        event_type: 'otp.verified',
        workflow_id: record.workflow_id,
        signer_id: signerId,
        payload: { attempts: record.attempts + 1 }
      },
      'verify-signer-otp'
    )

    return json({ success: true })
  } catch (error: any) {
    console.error('verify-signer-otp error', error)
    return json({ error: error?.message || 'Unexpected error' }, 500)
  }
})
