/**
 * create-custody-upload-url Edge Function
 *
 * Generates a signed URL for direct upload to custody bucket.
 * Client uploads directly to Storage (bypasses Edge Function payload limits).
 *
 * POST /create-custody-upload-url
 * Body: {
 *   document_entity_id: string,
 *   purpose: 'source' | 'witness',
 *   metadata: {
 *     original_name: string,
 *     original_mime: string,
 *     original_size: number
 *   }
 * }
 *
 * Returns: {
 *   upload_url: string,      // Signed URL for PUT request
 *   storage_path: string,    // Path where file will be stored
 *   expires_at: string       // URL expiration time
 * }
 *
 * Flow:
 * 1. Client calls this function to get signed URL
 * 2. Client uploads encrypted file directly to Storage via PUT
 * 3. Client calls register-custody-upload to finalize
 */

import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'


const jsonResponse = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    }
  })

interface CreateUploadUrlRequest {
  document_entity_id: string
  purpose: 'source' | 'witness'
  metadata: {
    original_name: string
    original_mime: string
    original_size: number
  }
}

const UPLOAD_URL_EXPIRY_SECONDS = 3600 // 1 hour

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response(null, { status: 204 });
  }
  console.log('[create-custody-upload-url] Request received')

  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined)

  if (req.method === 'OPTIONS') {
    if (!isAllowed) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }
    return new Response('ok', { headers: corsHeaders })
  }

  if (!isAllowed) {
    return jsonResponse({ error: 'Origin not allowed' }, 403, corsHeaders)
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, 401, corsHeaders)
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders)
    }

    // 2. Parse body (small payload - no file data)
    const body: CreateUploadUrlRequest = await req.json()
    const { document_entity_id, purpose = 'source', metadata } = body

    if (!document_entity_id || !metadata) {
      return jsonResponse({
        error: 'Invalid request: document_entity_id and metadata required'
      }, 400, corsHeaders)
    }

    console.log('[create-custody-upload-url] Request:', {
      document_entity_id,
      purpose,
      metadata,
      userId: user.id
    })

    // 3. Validate document_entity exists and belongs to user
    const { data: documentEntity, error: documentError } = await supabase
      .from('document_entities')
      .select('id, owner_id, custody_mode')
      .eq('id', document_entity_id)
      .single()

    if (documentError || !documentEntity) {
      return jsonResponse({ error: 'Document entity not found' }, 404, corsHeaders)
    }

    if (documentEntity.owner_id !== user.id) {
      return jsonResponse({ error: 'Unauthorized: you do not own this document' }, 403, corsHeaders)
    }

    // 4. Generate storage path
    const storagePath = purpose === 'witness'
      ? `${user.id}/${document_entity_id}/encrypted_witness/${Date.now()}`
      : `${user.id}/${document_entity_id}/encrypted_source`

    // 5. Create signed upload URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('custody')
      .createSignedUploadUrl(storagePath)

    if (signedUrlError || !signedUrlData) {
      console.error('[create-custody-upload-url] Failed to create signed URL:', signedUrlError)
      return jsonResponse({
        error: `Failed to create upload URL: ${signedUrlError?.message || 'Unknown error'}`
      }, 500)
    }

    const expiresAt = new Date(Date.now() + UPLOAD_URL_EXPIRY_SECONDS * 1000).toISOString()

    console.log('[create-custody-upload-url] ✅ Signed URL created', {
      storagePath,
      expiresAt
    })

    return jsonResponse({
      upload_url: signedUrlData.signedUrl,
      storage_path: storagePath,
      token: signedUrlData.token, // Token needed for the upload
      expires_at: expiresAt,
      purpose,
      document_entity_id
    })

  } catch (error) {
    console.error('[create-custody-upload-url] Error:', error)
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, 500)
  }
})
