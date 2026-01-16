import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { captureAndApplySignature } from '../_shared/signatureCapture.ts'

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
    if (signerId && !workflowId) {
      return json({ error: 'Missing workflowId for signerId flow' }, 400)
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
          token_expires_at,
          token_revoked_at,
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
          token_expires_at,
          token_revoked_at,
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

    if (workflowId && signer.workflow_id !== workflowId) {
      console.error('apply-signer-signature: Workflow mismatch', {
        signerId: signer.id,
        signerWorkflowId: signer.workflow_id,
        providedWorkflowId: workflowId
      })
      return json({ error: 'Signer does not belong to this workflow' }, 403)
    }

    // GATE: Check if token has been revoked
    if (signer.token_revoked_at) {
      console.error('apply-signer-signature: Token revoked', {
        signerId: signer.id,
        revokedAt: signer.token_revoked_at
      })
      return json({ error: 'Token has been revoked' }, 403)
    }

    // GATE: Check if token has expired
    if (signer.token_expires_at && new Date(signer.token_expires_at) < new Date()) {
      console.error('apply-signer-signature: Token expired', {
        signerId: signer.id,
        expiredAt: signer.token_expires_at
      })
      return json({ error: 'Token has expired' }, 403)
    }

    // GATE: Check if signer is in a terminal state
    const terminalStates = ['signed', 'cancelled', 'expired']
    if (terminalStates.includes(signer.status)) {
      console.error('apply-signer-signature: Signer in terminal state', {
        signerId: signer.id,
        status: signer.status
      })
      return json({ error: `Cannot sign: signer status is ${signer.status}` }, 403)
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

    // P2.2 — Capture and apply signature to all batch fields
    // Get workflow to resolve document_entity_id
    const { data: workflow, error: wfError } = await supabase
      .from('signature_workflows')
      .select('document_entity_id')
      .eq('id', signer.workflow_id)
      .single()

    if (wfError || !workflow) {
      console.error('apply-signer-signature: Workflow not found', wfError)
      return json({ error: 'Workflow not found' }, 404)
    }

    // Get all batches assigned to this signer
    const { data: batches, error: batchError } = await supabase
      .from('batches')
      .select('id')
      .eq('document_entity_id', workflow.document_entity_id)
      .eq('assigned_signer_id', signer.id)

    if (batchError) {
      console.error('apply-signer-signature: Error fetching batches', batchError)
      return json({ error: 'Could not fetch batches' }, 500)
    }

    if (!batches || batches.length === 0) {
      console.warn('apply-signer-signature: No batches assigned to signer', { signerId: signer.id })
      // Allow workflow to continue even if no batches (legacy compatibility)
    } else {
      // Apply signature to all batches
      for (const batch of batches) {
        try {
          await captureAndApplySignature(supabase, {
            workflow_id: signer.workflow_id,
            document_entity_id: workflow.document_entity_id,
            batch_id: batch.id,
            signer_id: signer.id,
            signature_payload: signatureData || {}
          })
        } catch (captureError: any) {
          console.error('apply-signer-signature: Error capturing signature for batch', {
            batchId: batch.id,
            error: captureError.message
          })
          return json({ error: 'Could not apply signature to batch', details: captureError.message }, 500)
        }
      }
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
