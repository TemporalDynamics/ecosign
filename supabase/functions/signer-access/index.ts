import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as base64Encode } from 'https://deno.land/std@0.182.0/encoding/base64.ts'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface RequestBody {
  token: string
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })

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

async function uploadToSignNow(
  accessToken: string,
  supabase: ReturnType<typeof createClient>,
  storagePath: string,
  documentName: string
): Promise<{ id?: string; document_id?: string }> {
  // Descargar PDF desde Supabase Storage
  const { data: fileResp, error: fileErr } = await supabase.storage
    .from('user-documents')
    .download(storagePath)
  if (fileErr || !fileResp) {
    throw new Error(`No se pudo descargar el documento: ${fileErr?.message}`)
  }
  const fileBuffer = new Uint8Array(await fileResp.arrayBuffer())
  const blob = new Blob([fileBuffer], { type: 'application/pdf' })
  const form = new FormData()
  form.append('file', blob, documentName || 'document.pdf')

  const resp = await fetch(`${signNowBase}/document`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: form
  })

  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`SignNow upload failed: ${resp.status} ${txt}`)
  }

  return await resp.json()
}

async function createSignNowEmbeddedInvite(
  accessToken: string,
  documentId: string,
  signerEmail: string,
  order: number
): Promise<{ embed_url?: string }> {
  // Crear invite (estándar)
  const invitePayload = {
    to: [
      {
        email: signerEmail,
        role: `Signer ${order}`,
        order
      }
    ]
  }

  const inviteResp = await fetch(`${signNowBase}/document/${documentId}/invite`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(invitePayload)
  })

  if (!inviteResp.ok) {
    const txt = await inviteResp.text()
    throw new Error(`SignNow invite failed: ${inviteResp.status} ${txt}`)
  }

  // Obtener embedded invite
  const embedResp = await fetch(`${signNowBase}/document/${documentId}/embedded-invites`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(invitePayload)
  })

  if (!embedResp.ok) {
    const txt = await embedResp.text()
    throw new Error(`SignNow embedded invite failed: ${embedResp.status} ${txt}`)
  }

  const embedData = await embedResp.json() as { data?: Array<{ url?: string }> }
  return { embed_url: embedData.data?.[0]?.url }
}

const signNowBase = (Deno.env.get('SIGNNOW_API_BASE_URL') || 'https://api-eval.signnow.com').replace(/\/$/, '')
const signNowBasic = Deno.env.get('SIGNNOW_BASIC_TOKEN') || ''
const signNowClientId = Deno.env.get('SIGNNOW_CLIENT_ID') || ''
const signNowClientSecret = Deno.env.get('SIGNNOW_CLIENT_SECRET') || ''
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey
    )

    const { token } = (await req.json()) as RequestBody
    if (!token) return json({ error: 'token is required' }, 400)

    const tryFindSigner = async (tokenValue: string) => {
      return await supabase
        .from('workflow_signers')
        .select(`
          *,
          workflow:signature_workflows (
            id,
            owner_id,
            original_filename,
            document_path,
            document_hash,
            encryption_key,
            signature_type,
            signnow_embed_url,
            signnow_document_id,
            signnow_status
          )
        `)
        .eq('access_token_hash', tokenValue)
        .single()
    }

    // Primero intentar con el token como hash directo
    let { data: signer, error: signerError } = await tryFindSigner(token)

    // Si no existe, hashear y reintentar (links antiguos que usan token plano)
    if ((!signer || signerError) && token.length !== 64) {
      const hashed = await hashToken(token)
      const res = await tryFindSigner(hashed)
      signer = res.data
      signerError = res.error
    }

    if (signerError || !signer) {
      return json({ error: 'Invalid or expired token' }, 404)
    }

    // Obtener versión activa del workflow para mostrar nombre/hash
    const { data: version } = await supabase
      .from('workflow_versions')
      .select('id, document_url, document_hash, version_number')
      .eq('workflow_id', signer.workflow_id)
      .eq('status', 'active')
      .single()

    // Generar URL firmada para el PDF (si hay path)
    let encryptedPdfUrl: string | null = null
    if (signer.workflow.document_path) {
      const { data: signedUrlData } = await supabase.storage
        .from('user-documents')
        .createSignedUrl(signer.workflow.document_path, 3600)
      encryptedPdfUrl = signedUrlData?.signedUrl ?? null
    }

    // Si es SIGNNOW y no tenemos embed_url para este signer, crearlo
    let signnowEmbedUrl = signer.signnow_embed_url || signer.workflow.signnow_embed_url || null
    let signnowDocumentId = signer.workflow.signnow_document_id || null

    if ((signer.workflow.signature_type || '').toUpperCase() === 'SIGNNOW' && !signnowEmbedUrl) {
      if (!signer.workflow.document_path) {
        return json({ error: 'Missing document path for SignNow workflow' }, 400)
      }

      const accessToken = await getSignNowAccessToken()
      // Subir a SignNow si no hay document_id
      if (!signnowDocumentId) {
        const upload = await uploadToSignNow(accessToken, supabase, signer.workflow.document_path, signer.workflow.original_filename || version?.document_url || 'document.pdf')
        signnowDocumentId = upload.id || upload.document_id || null
        if (signnowDocumentId) {
          await supabase
            .from('signature_workflows')
            .update({ signnow_document_id: signnowDocumentId })
            .eq('id', signer.workflow_id)
        }
      }

      if (!signnowDocumentId) {
        return json({ error: 'Could not create SignNow document' }, 500)
      }

      const invite = await createSignNowEmbeddedInvite(accessToken, signnowDocumentId, signer.email, signer.signing_order || 1)
      signnowEmbedUrl = invite.embed_url || null

      if (signnowEmbedUrl) {
        await supabase
          .from('workflow_signers')
          .update({ signnow_embed_url: signnowEmbedUrl })
          .eq('id', signer.id)
      }
    }

    return json({
      success: true,
      id: signer.id,
      workflow_id: signer.workflow_id,
      email: signer.email,
      name: signer.name,
      signing_order: signer.signing_order,
      status: signer.status,
      access_token_hash: signer.access_token_hash,
      require_nda: signer.require_nda,
      require_login: signer.require_login,
      quick_access: signer.quick_access,
      nda_accepted: signer.nda_accepted ?? false,
      nda_accepted_at: signer.nda_accepted_at,
      encrypted_pdf_url: encryptedPdfUrl,
      workflow: {
        id: signer.workflow.id,
        title: signer.workflow.original_filename || signer.workflow.title || null,
        document_path: signer.workflow.document_path ?? version?.document_url ?? null,
        document_hash: signer.workflow.document_hash ?? version?.document_hash ?? null,
        encryption_key: signer.workflow.encryption_key ?? null,
        owner_id: signer.workflow.owner_id,
        status: signer.workflow.status,
        require_sequential: signer.workflow.require_sequential ?? false,
        original_filename: signer.workflow.original_filename ?? null,
        signature_type: signer.workflow.signature_type ?? 'ECOSIGN',
        signnow_embed_url: signnowEmbedUrl,
        signnow_document_id: signnowDocumentId
      }
    })
  } catch (error) {
    console.error('signer-access error', error)
    return json({ error: 'Internal error' }, 500)
  }
})
