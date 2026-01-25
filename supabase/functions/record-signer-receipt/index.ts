import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.92.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface ReceiptPayload {
  signerId: string
  workflowId: string
  email: string
  signerName?: string
  docId?: string
  docIdType?: string
  phone?: string
  metadata?: Record<string, unknown>
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders
    })
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload = (await req.json()) as ReceiptPayload
    if (!payload.signerId || !payload.workflowId || !payload.email) {
      return json({ error: 'Missing signerId, workflowId or email' }, 400)
    }

    const userAgent = req.headers.get('user-agent') || undefined
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      undefined

    const { error: insertErr } = await supabase
      .from('signer_receipts')
      .insert({
        signer_id: payload.signerId,
        workflow_id: payload.workflowId,
        email: payload.email,
        signer_name: payload.signerName || null,
        doc_id: payload.docId || null,
        doc_id_type: payload.docIdType || null,
        phone: payload.phone || null,
        metadata: payload.metadata || {},
        ip: ip || null,
        user_agent: userAgent || null
      })

    if (insertErr) {
      console.error('record-signer-receipt insert failed', insertErr)
      return json({ error: 'Could not save receipt' }, 500)
    }

    // Log ECOX audit for non-repudiation if function exists
    try {
      await supabase.functions.invoke('log-ecox-event', {
        body: {
          workflowId: payload.workflowId,
          signerId: payload.signerId,
          eventType: 'document_received',
          details: {
            docId: payload.docId,
            docIdType: payload.docIdType,
            phone: payload.phone,
            ip,
            userAgent
          }
        }
      })
    } catch (err) {
      console.warn('record-signer-receipt log-ecox-event failed', err)
    }

    return json({ success: true })
  } catch (error: any) {
    console.error('record-signer-receipt error', error)
    return json({ error: error?.message || 'Unexpected error' }, 500)
  }
})
