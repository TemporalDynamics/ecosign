import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { appendEvent as appendDocumentEvent } from '../_shared/eventHelper.ts'
import { appendEvent as appendCanonicalEvent } from '../_shared/canonicalEventHelper.ts'
import { requireInternalAuthLogged } from '../_shared/internalAuth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const appUrl = Deno.env.get('APP_URL') || 'https://app.ecosign.app'

const signNowBase = (Deno.env.get('SIGNNOW_API_BASE_URL') || 'https://api-eval.signnow.com').replace(/\/$/, '')
const signNowBasic = Deno.env.get('SIGNNOW_BASIC_TOKEN') || ''
const signNowClientId = Deno.env.get('SIGNNOW_CLIENT_ID') || ''
const signNowClientSecret = Deno.env.get('SIGNNOW_CLIENT_SECRET') || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })

const isFlagEnabled = (name: string) =>
  String(Deno.env.get(name) ?? '').toLowerCase() === 'true'

function normalizeSignature(signature: string | null): string {
  if (!signature) return ''
  const value = signature.trim().toLowerCase()
  return value.startsWith('sha256=') ? value.slice('sha256='.length) : value
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

async function computeHmacSha256Hex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function hasValidWebhookSignature(req: Request, rawBody: string): Promise<boolean> {
  const secret = (Deno.env.get('SIGNNOW_WEBHOOK_SECRET') ?? '').trim()
  if (!secret) return false

  const signatureHeader =
    req.headers.get('x-signature') ||
    req.headers.get('x-signnow-signature') ||
    req.headers.get('x-webhook-signature')

  const receivedSignature = normalizeSignature(signatureHeader)
  if (!receivedSignature) return false

  const expectedSignature = await computeHmacSha256Hex(secret, rawBody)
  return timingSafeEqualHex(receivedSignature, expectedSignature)
}

async function emitDocumentSigned(
  documentEntityId: string,
  source: string
): Promise<void> {
  const { data: entity, error } = await supabase
    .from('document_entities')
    .select('events')
    .eq('id', documentEntityId)
    .single()

  if (error || !entity) {
    console.warn('document_entity not found for document.signed', documentEntityId)
    return
  }

  const events = Array.isArray(entity.events) ? entity.events : []
  if (events.some((event: { kind?: string }) => event.kind === 'document.signed')) {
    return
  }

  await appendDocumentEvent(
    supabase,
    documentEntityId,
    {
      kind: 'document.signed',
      at: new Date().toISOString(),
      payload: { source }
    },
    'signnow-webhook'
  )
}

async function getSignNowAccessToken(): Promise<string> {
  if (!signNowBasic || !signNowClientId || !signNowClientSecret) {
    throw new Error('Missing SignNow credentials in env')
  }
  const body = new URLSearchParams()
  body.append('grant_type', 'client_credentials')
  body.append('client_id', signNowClientId)
  body.append('client_secret', signNowClientSecret)
  body.append('scope', '*')

  const resp = await fetch(`${signNowBase}/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${signNowBasic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  })

  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`SignNow token failed: ${resp.status} ${txt}`)
  }

  const data = await resp.json()
  if (!data.access_token) {
    throw new Error('SignNow token response missing access_token')
  }
  return data.access_token as string
}

async function downloadSignedPdf(signnowDocumentId: string, accessToken: string): Promise<Blob> {
  const resp = await fetch(`${signNowBase}/document/${signnowDocumentId}/download?type=document`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`SignNow download failed: ${resp.status} ${txt}`)
  }
  return await resp.blob()
}

async function hashHex(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const rawBody = await req.text()
    const auth = await requireInternalAuthLogged(req, 'signnow-webhook', { allowCronSecret: true })
    if (!auth.ok) {
      const signatureOk = await hasValidWebhookSignature(req, rawBody)
      if (!signatureOk) {
        return json({ error: 'Forbidden' }, 403)
      }
    }

    let payload: any = {}
    try {
      payload = JSON.parse(rawBody || '{}')
    } catch {
      return json({ error: 'Invalid JSON payload' }, 400)
    }
    const eventType = payload?.event
    const signnowDocumentId = payload?.document?.id || payload?.document_id
    console.log('📬 SignNow webhook received', {
      eventType,
      hasDocumentId: Boolean(signnowDocumentId),
    })

    if (eventType !== 'document.completed' && eventType !== 'document.complete') {
      return json({ ignored: true, reason: 'not a completed event' })
    }

    if (!signnowDocumentId) {
      return json({ error: 'Missing document id' }, 400)
    }

    const { data: workflow, error: wfError } = await supabase
      .from('signature_workflows')
      .select('*')
      .eq('signnow_document_id', signnowDocumentId)
      .single()

    if (wfError || !workflow) {
      console.error('Workflow not found for document', signnowDocumentId, wfError)
      return json({ error: 'Workflow not found' }, 404)
    }

    // Owner email
    const { data: ownerUserResult } = await supabase.auth.admin.getUserById(workflow.owner_id)
    const ownerUserEmail = ownerUserResult?.user?.email ?? null

    const accessToken = await getSignNowAccessToken()
    const signedBlob = await downloadSignedPdf(signnowDocumentId, accessToken)
    const signedHash = await hashHex(signedBlob)

    // Upload signed PDF to storage
    const signedPath = `${workflow.owner_id}/${workflow.id}/signnow_signed_${Date.now()}.pdf`
    const uploadResp = await supabase.storage
      .from('user-documents')
      .upload(signedPath, signedBlob, { upsert: true, contentType: 'application/pdf' })

    if (uploadResp.error) {
      throw new Error(`Storage upload failed: ${uploadResp.error.message}`)
    }

    // Update workflow and signers
    await supabase
      .from('signature_workflows')
      .update({
        signnow_status: 'completed',
        document_path: signedPath,
        document_hash: signedHash,
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .eq('id', workflow.id)

    const existingCompletedEvent = await supabase
      .from('workflow_events')
      .select('id')
      .eq('workflow_id', workflow.id)
      .eq('event_type', 'workflow.completed')
      .limit(1)
      .maybeSingle()

    if (!existingCompletedEvent.error && !existingCompletedEvent.data) {
      const completedEvent = await appendCanonicalEvent(
        supabase as any,
        {
          event_type: 'workflow.completed',
          workflow_id: workflow.id,
          payload: {
            completed_at: new Date().toISOString(),
            source: 'signnow-webhook'
          },
          actor_id: workflow.owner_id ?? null
        },
        'signnow-webhook'
      )
      if (!completedEvent.success) {
        console.warn('signnow-webhook: failed to append workflow.completed', completedEvent.error)
      }
    }

    await supabase.rpc('project_signature_workflow_status', {
      p_workflow_id: workflow.id
    })

    const { data: signers } = await supabase
      .from('workflow_signers')
      .select('*')
      .eq('workflow_id', workflow.id)

    const nowIso = new Date().toISOString()
    if (signers && signers.length > 0) {
      for (const signer of signers) {
        const signedEvent = await appendCanonicalEvent(
          supabase as any,
          {
            event_type: 'signer.signed',
            workflow_id: workflow.id,
            signer_id: signer.id,
            payload: {
              email: signer.email,
              signing_order: signer.signing_order,
              signed_at: nowIso,
              source: 'signnow-webhook'
            },
            actor_id: workflow.owner_id ?? null
          },
          'signnow-webhook'
        )
        if (!signedEvent.success) {
          console.warn('signnow-webhook: failed to append signer.signed', signer.id, signedEvent.error)
        }
      }
    }

    const authorityOnly = isFlagEnabled('V2_AUTHORITY_ONLY') || isFlagEnabled('DISABLE_SIGNNOW_EXECUTION')
    if (authorityOnly) {
      if (workflow.document_entity_id) {
        await emitDocumentSigned(workflow.document_entity_id, 'signnow')
      } else {
        console.warn('workflow.document_entity_id missing, document.signed not emitted')
      }
    } else {
      // Forensic pipeline
      try {
        await supabase.functions.invoke('legal-timestamp', { body: { hash_hex: signedHash } })
      } catch (e) {
        console.error('legal-timestamp failed', e)
      }
      try {
        await supabase.functions.invoke('anchor-polygon', {
          body: { documentHash: signedHash, documentEntityId: workflow.document_entity_id ?? null, userEmail: ownerUserEmail || 'owner@ecosign.app' }
        })
      } catch (e) {
        console.error('anchor-polygon failed', e)
      }
      try {
        await supabase.functions.invoke('anchor-bitcoin', {
          body: { documentHash: signedHash, documentEntityId: workflow.document_entity_id ?? null, userEmail: ownerUserEmail || 'owner@ecosign.app' }
        })
      } catch (e) {
        console.error('anchor-bitcoin failed', e)
      }
    }

    // Notifications
    const workflowTitle = workflow.original_filename || 'Documento'
    const ownerEmail = ownerUserEmail

    if (ownerEmail || (signers && signers.length > 0)) {
      const recipients = new Map<string, { email: string; signer_id?: string | null; recipient_type: 'owner' | 'signer' }>()
      if (ownerEmail) {
        recipients.set(ownerEmail, { email: ownerEmail, recipient_type: 'owner' })
      }
      for (const s of signers ?? []) {
        if (!s?.email) continue
        if (!recipients.has(s.email)) {
          recipients.set(s.email, { email: s.email, recipient_type: 'signer', signer_id: s.id })
        }
      }

      const notifications = Array.from(recipients.values()).map((r) => ({
        workflow_id: workflow.id,
        recipient_email: r.email,
        recipient_type: r.recipient_type,
        signer_id: r.signer_id ?? null,
        notification_type: 'workflow_completed_simple',
        step: 'completion_notice',
        subject: '✅ Proceso de firmas completado',
        body_html: `
          <h2 style="font-family:Arial,sans-serif;color:#0f172a;margin:0 0 12px;">Proceso completado</h2>
          <p style="font-family:Arial,sans-serif;color:#334155;margin:0 0 12px;">
            El documento <strong>${workflowTitle}</strong> ha sido firmado por todos los participantes.
          </p>
          <p style="font-family:Arial,sans-serif;color:#0f172a;font-weight:600;margin:16px 0 0;">EcoSign. Transparencia que acompaña.</p>
        `,
        delivery_status: 'pending'
      }))

      if (notifications.length > 0) {
        await supabase.from('workflow_notifications').insert(notifications)
      }
    }

    console.log('✅ SignNow webhook processed for workflow', workflow.id)
    return json({ success: true, workflow_id: workflow.id, signed_path: signedPath })
  } catch (error) {
    console.error('signnow-webhook error', error)
    return json({ error: error instanceof Error ? error.message : 'Internal error' }, 500)
  }
})
