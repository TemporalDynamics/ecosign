import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1'
import { appendEvent as appendCanonicalEvent } from '../_shared/canonicalEventHelper.ts'

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

// Minimal idempotent worker: process a single signer.signed event by id
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const body = await req.json()
    // Supabase DB Webhooks send a full payload with the inserted record under `record`.
    // If the payload includes an event type and it's not signer.signed, ignore early to avoid extra DB reads.
    const eventTypeFromPayload = body?.record?.event_type || body?.event_type
    if (eventTypeFromPayload && eventTypeFromPayload !== 'signer.signed') {
      return json({ ok: true, ignored: true })
    }

    // Accept either direct event_id (manual callers) or the webhook payload.
    const eventId = body?.record?.id || body?.event_id || body?.workflow_event_id
    if (!eventId) return json({ error: 'event_id required' }, 400)

    // If webhook provided the record, use it directly to avoid an extra DB read.
    let ev = body?.record || null
    let evErr = null
    if (!ev) {
      // 1) load the event from DB when not present in payload
      const res = await supabase
        .from('workflow_events')
        .select('*')
        .eq('id', eventId)
        .single()
      ev = res.data
      evErr = res.error
    }

    if (evErr || !ev) return json({ error: 'event not found' }, 404)
    // Filter non-signer.signed events early and return success so webhooks don't error.
    if ((eventTypeFromPayload && eventTypeFromPayload !== 'signer.signed') || ev.event_type !== 'signer.signed') {
      return json({ ok: true, ignored: true })
    }

    const signerId = ev.signer_id
    const workflowId = ev.workflow_id

    // Idempotency: check if signature.applied already exists for this signer+workflow
    const { data: existing } = await supabase
      .from('workflow_events')
      .select('id')
      .eq('workflow_id', workflowId)
      .eq('signer_id', signerId)
      .eq('event_type', 'signature.applied')
      .limit(1)

    if (existing && existing.length > 0) {
      return json({ success: true, skipped: true, reason: 'already processed' })
    }

    // 2) fetch signer and workflow info (including signature_data)
    const { data: signer, error: signerErr } = await supabase
      .from('workflow_signers')
      .select('id, workflow_id, email, name, signature_data, access_token_hash')
      .eq('id', signerId)
      .single()

    if (signerErr || !signer) return json({ error: 'signer not found' }, 404)

    const { data: workflow, error: wfErr } = await supabase
      .from('signature_workflows')
      .select('id, document_path, document_hash')
      .eq('id', workflowId)
      .single()

    if (wfErr || !workflow) return json({ error: 'workflow not found' }, 404)

    if (!signer.signature_data) {
      return json({ error: 'no signature_data available for signer' }, 400)
    }

    const sig = signer.signature_data as any
    const coords = sig.coordinates || sig || {}
    const pageNumber = (coords.page || 1) - 1

    // 3) download current PDF
    if (!workflow.document_path) return json({ error: 'workflow has no document_path' }, 400)

    let pdfBytes: Uint8Array
    if (/^https?:\/\//i.test(workflow.document_path)) {
      const resp = await fetch(workflow.document_path)
      if (!resp.ok) return json({ error: 'failed to fetch document url' }, 500)
      const ab = await resp.arrayBuffer()
      pdfBytes = new Uint8Array(ab)
    } else {
      const { data: fileResp, error: fileErr } = await supabase.storage
        .from('user-documents')
        .download(workflow.document_path)
      if (fileErr || !fileResp) return json({ error: 'failed to download document', details: fileErr?.message }, 500)
      const ab = await fileResp.arrayBuffer()
      pdfBytes = new Uint8Array(ab)
    }

    // 4) download signature image
    let imgBytes: Uint8Array
    if (sig.imageUrl && /^https?:\/\//i.test(sig.imageUrl)) {
      const r = await fetch(sig.imageUrl)
      if (!r.ok) return json({ error: 'failed to fetch signature image' }, 500)
      const ab = await r.arrayBuffer()
      imgBytes = new Uint8Array(ab)
    } else if (sig.imageUrl) {
      // treat as storage path
      const { data: imgResp, error: imgErr } = await supabase.storage
        .from('user-documents')
        .download(sig.imageUrl)
      if (imgErr || !imgResp) return json({ error: 'failed to download signature image', details: imgErr?.message }, 500)
      const ab = await imgResp.arrayBuffer()
      imgBytes = new Uint8Array(ab)
    } else if (sig.imageBase64) {
      // direct base64 payload
      const bstr = atob(sig.imageBase64.replace(/^data:\\w+\/[a-z]+;base64,/, ''))
      imgBytes = new Uint8Array(Array.from(bstr).map((c) => c.charCodeAt(0)))
    } else {
      return json({ error: 'no image found in signature_data' }, 400)
    }

    // 5) apply signature using pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBytes)

    // detect image type via header (PNG/JPEG)
    const isPng = imgBytes[0] === 0x89 && imgBytes[1] === 0x50
    let embeddedImage: any
    if (isPng) embeddedImage = await pdfDoc.embedPng(imgBytes)
    else embeddedImage = await pdfDoc.embedJpg(imgBytes)

    const pages = pdfDoc.getPages()
    if (pageNumber < 0 || pageNumber >= pages.length) return json({ error: 'invalid page number' }, 400)

    const page = pages[pageNumber]

    const width = coords.width || embeddedImage.width || 150
    const height = coords.height || embeddedImage.height || (width * (embeddedImage.height / embeddedImage.width))
    const x = coords.x || 50
    // assume coords.y is from top; convert to PDF bottom-left coordinate
    const topY = coords.y || 50
    const pageHeight = page.getHeight()
    const y = pageHeight - topY - height

    page.drawImage(embeddedImage, {
      x,
      y,
      width,
      height
    })

    const modifiedPdfBytes = await pdfDoc.save()

    // 6) compute hash
    const hashBuf = await crypto.subtle.digest('SHA-256', modifiedPdfBytes)
    const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')

    // 7) upload signed PDF (overwrite same path)
    const uploadPath = workflow.document_path
    const { error: uploadErr } = await supabase.storage
      .from('user-documents')
      .upload(uploadPath, modifiedPdfBytes, { contentType: 'application/pdf', upsert: true })

    if (uploadErr) return json({ error: 'failed to upload signed pdf', details: uploadErr.message }, 500)

    // 8) update workflow document_hash
    const { error: wfUpdErr } = await supabase
      .from('signature_workflows')
      .update({ document_hash: hashHex, updated_at: new Date().toISOString() })
      .eq('id', workflowId)

    if (wfUpdErr) console.warn('could not update workflow hash', wfUpdErr)

    // 9) append canonical event signature.applied
    const evtPayload = {
      workflow_id: workflowId,
      signer_id: signerId,
      witness_pdf_hash: hashHex,
      applied_at: new Date().toISOString(),
      identity_level: ev.payload?.identity_level || null
    }

    const appendResult = await appendCanonicalEvent(supabase, {
      event_type: 'signature.applied',
      workflow_id: workflowId,
      signer_id: signerId,
      payload: evtPayload
    }, 'process-signer-signed')

    if (!appendResult.success) {
      console.warn('append signature.applied failed', appendResult.error)
    }

    return json({ success: true, workflow_id: workflowId, signer_id: signerId, new_hash: hashHex })

  } catch (err: any) {
    console.error('process-signer-signed error', err)
    return json({ error: err?.message || 'unexpected error' }, 500)
  }
})
