import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    const { signerId, accessToken, workflowId, witness_pdf_hash, applied_at, identity_level, signatureData } = body

    if (!signerId && !accessToken) {
      return json({ error: 'Missing signerId or accessToken' }, 400)
    }

    // Resolve signer
    let signer: any = null

    if (signerId) {
      console.log('apply-signer-signature: Looking for signerId:', signerId)

      const { data, error } = await supabase
        .from('workflow_signers')
        .select(`
          id,
          workflow_id,
          status,
          signer_otps!inner(verified_at)
        `)
        .eq('id', signerId)
        .single()

      console.log('apply-signer-signature: Query result:', { data, error })

      if (error || !data) {
        console.error('apply-signer-signature: Signer not found', { signerId, error })
        return json({ error: 'Signer not found' }, 404)
      }

      // Map the joined data to match expected structure
      // Note: signer_otps is returned as an array due to the join
      const otpData = Array.isArray(data.signer_otps) ? data.signer_otps[0] : data.signer_otps
      signer = {
        ...data,
        otp_verified: otpData?.verified_at != null,
        signer_otps: otpData
      }
    } else if (accessToken) {
      // accessToken may be raw or already hashed
      const tokenHash = /^[a-f0-9]{64}$/i.test(accessToken) ? accessToken : await (async () => {
        const enc = new TextEncoder()
        const buf = enc.encode(accessToken)
        const hash = await crypto.subtle.digest('SHA-256', buf)
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
      })()

      console.log('apply-signer-signature: Looking for accessToken (hash):', tokenHash.substring(0, 10) + '...')

      const { data, error } = await supabase
        .from('workflow_signers')
        .select(`
          id,
          workflow_id,
          status,
          signer_otps!inner(verified_at)
        `)
        .eq('access_token_hash', tokenHash)
        .single()

      console.log('apply-signer-signature: Query result (token):', { data, error })

      if (error || !data) {
        console.error('apply-signer-signature: Signer not found for token', { tokenHash: tokenHash.substring(0, 10) + '...', error })
        return json({ error: 'Signer not found for token' }, 404)
      }

      // Map the joined data to match expected structure
      // Note: signer_otps is returned as an array due to the join
      const otpData = Array.isArray(data.signer_otps) ? data.signer_otps[0] : data.signer_otps
      signer = {
        ...data,
        otp_verified: otpData?.verified_at != null,
        signer_otps: otpData
      }
    }

    // Validate OTP confirmed
    console.log('apply-signer-signature: Validating OTP', {
      signerId: signer.id,
      otpVerified: signer.otp_verified,
      otpVerifiedAt: signer.signer_otps?.verified_at
    })

    if (!signer.otp_verified) {
      console.error('apply-signer-signature: OTP not verified', {
        signerId: signer.id,
        otpVerifiedAt: signer.signer_otps?.verified_at
      })
      return json({ error: 'OTP not verified for signer' }, 403)
    }

    // Insert canonical event: use existing event_type allowed by DB
    const eventPayload = {
      witness_pdf_hash: witness_pdf_hash || null,
      applied_at: applied_at || new Date().toISOString(),
      identity_level: identity_level || null
    }

    const { error: insertErr } = await supabase
      .from('workflow_events')
      .insert({
        workflow_id: signer.workflow_id,
        signer_id: signer.id,
        event_type: 'signer.signed',
        payload: eventPayload
      })

    if (insertErr) {
      console.error('insert workflow_event failed', insertErr)
      return json({ error: 'Could not insert event', details: insertErr.message }, 500)
    }

    // Update signer status and persist signature data
    const { error: signerUpdErr } = await supabase
      .from('workflow_signers')
      .update({ status: 'signed', signed_at: new Date().toISOString(), signature_data: signatureData || null })
      .eq('id', signer.id)

    if (signerUpdErr) {
      console.error('update signer failed', signerUpdErr)
      return json({ error: 'Could not update signer', details: signerUpdErr.message }, 500)
    }

    // Determine if workflow is fully signed
    const { data: remaining, error: remErr } = await supabase
      .from('workflow_signers')
      .select('id')
      .eq('workflow_id', signer.workflow_id)
      .neq('status', 'signed')

    if (remErr) {
      console.warn('could not check remaining signers', remErr)
    }

    if (Array.isArray(remaining)) {
      const newStatus = remaining.length === 0 ? 'completed' : 'partially_signed'
      const { error: wfErr } = await supabase
        .from('signature_workflows')
        .update({ status: newStatus })
        .eq('id', signer.workflow_id)
      if (wfErr) console.warn('could not update workflow status', wfErr)
    }

    return json({ success: true })

  } catch (err: any) {
    console.error('apply-signer-signature error', err)
    return json({ error: err?.message || 'Unexpected error' }, 500)
  }
})
