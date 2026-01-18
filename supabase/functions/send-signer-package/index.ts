import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildSignerPackageEmail, sendEmail } from '../_shared/email.ts'

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

// AES-GCM helpers (same format as client: IV prepended to ciphertext)
async function importKey(base64: string): Promise<CryptoKey> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return await crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['decrypt'])
}

async function decryptBlob(encrypted: Blob, keyBase64: string): Promise<Blob> {
  const buffer = new Uint8Array(await encrypted.arrayBuffer())
  const iv = buffer.slice(0, 12)
  const ciphertext = buffer.slice(12)
  const key = await importKey(keyBase64)
  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new Blob([plainBuffer], { type: 'application/pdf' })
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

    const { signerId } = (await req.json()) as RequestPayload
    if (!signerId) return json({ error: 'signerId is required' }, 400)

    const { data: signer, error: signerErr } = await supabase
      .from('workflow_signers')
      .select(`
        id,
        email,
        name,
        workflow_id,
        workflow:signature_workflows (
          id,
          owner_id,
          title,
          document_path,
          encryption_key
        )
      `)
      .eq('id', signerId)
      .single()

    if (signerErr || !signer) return json({ error: 'Signer not found' }, 404)

    if (!signer.workflow?.document_path) {
      return json({ error: 'No signed document available' }, 400)
    }

    // Download encrypted PDF
    const { data: file, error: dlErr } = await supabase.storage
      .from('user-documents')
      .download(signer.workflow.document_path)

    if (dlErr || !file) {
      console.error('send-signer-package download failed', dlErr)
      return json({ error: 'Could not download document' }, 500)
    }

    // Decrypt if key present
    let pdfBlob: Blob = file
    if (signer.workflow.encryption_key) {
      pdfBlob = await decryptBlob(file, signer.workflow.encryption_key)
    }

    const packagePath = `packages/${signer.workflow_id}/${signer.id}/signed.pdf`
    const ecoPath = `packages/${signer.workflow_id}/${signer.id}/certificate.eco.json`

    // Upload PDF
    const { error: uploadErr } = await supabase.storage
      .from('user-documents')
      .upload(packagePath, pdfBlob, { upsert: true, cacheControl: '3600' })

    if (uploadErr) {
      console.error('send-signer-package upload failed', uploadErr)
      return json({ error: 'Could not upload package' }, 500)
    }

    // Generate ECO and upload
    let ecoUrl: string | null = null
    try {
      const { data: ecoData, error: ecoErr } = await supabase.rpc('generate_ecox_certificate', {
        p_workflow_id: signer.workflow_id
      })
      if (!ecoErr && ecoData) {
        const ecoBlob = new Blob([JSON.stringify(ecoData, null, 2)], { type: 'application/json' })
        const { error: ecoUploadErr } = await supabase.storage
          .from('user-documents')
          .upload(ecoPath, ecoBlob, { upsert: true, cacheControl: '3600' })
        if (!ecoUploadErr) {
          const { data: ecoSigned } = await supabase.storage
            .from('user-documents')
            .createSignedUrl(ecoPath, 7 * 24 * 3600)
          ecoUrl = ecoSigned?.signedUrl || null
        }
      }
    } catch (err) {
      console.warn('send-signer-package eco generation failed', err)
    }

    // Signed URL for PDF
    const { data: pdfSigned, error: signedErr } = await supabase.storage
      .from('user-documents')
      .createSignedUrl(packagePath, 7 * 24 * 3600)

    if (signedErr || !pdfSigned) {
      console.error('send-signer-package signed url failed', signedErr)
      return json({ error: 'Could not create signed link' }, 500)
    }

    // Send email to signer
    const emailPayload = await buildSignerPackageEmail({
      signerEmail: signer.email,
      signerName: signer.name,
      documentName: signer.workflow.title || 'Documento',
      downloadUrl: pdfSigned.signedUrl,
      ecoUrl,
      siteUrl: Deno.env.get('SITE_URL')
    })
    await sendEmail(emailPayload)

    // Audit
    try {
      await supabase.functions.invoke('log-ecox-event', {
        body: {
          workflowId: signer.workflow_id,
          signerId: signer.id,
          eventType: 'package_sent',
          details: { pdfPath: packagePath, ecoPath }
        }
      })
    } catch (err) {
      console.warn('send-signer-package log-ecox-event failed', err)
    }

    return json({ success: true, pdfUrl: pdfSigned.signedUrl, ecoUrl })
  } catch (error: any) {
    console.error('send-signer-package error', error)
    return json({ error: error?.message || 'Unexpected error' }, 500)
  }
})
