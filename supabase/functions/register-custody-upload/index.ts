/**
 * register-custody-upload Edge Function
 *
 * Finalizes a direct custody upload by validating and registering it.
 * Called after client uploads directly to Storage via signed URL.
 *
 * POST /register-custody-upload
 * Body: {
 *   document_entity_id: string,
 *   storage_path: string,       // Path returned by create-custody-upload-url
 *   purpose: 'source' | 'witness',
 *   metadata: {
 *     original_name: string,
 *     original_mime: string,
 *     original_size: number
 *   }
 * }
 *
 * Returns: {
 *   success: boolean,
 *   storage_path: string,
 *   message: string
 * }
 */

import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })

interface RegisterUploadRequest {
  document_entity_id: string
  storage_path: string
  purpose: 'source' | 'witness'
  metadata: {
    original_name: string
    original_mime: string
    original_size: number
  }
}

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  console.log('[register-custody-upload] Request received')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, 401)
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    // 2. Parse body (small payload - no file data)
    const body: RegisterUploadRequest = await req.json()
    const { document_entity_id, storage_path, purpose = 'source', metadata } = body

    if (!document_entity_id || !storage_path || !metadata) {
      return jsonResponse({
        error: 'Invalid request: document_entity_id, storage_path, and metadata required'
      }, 400)
    }

    console.log('[register-custody-upload] Request:', {
      document_entity_id,
      storage_path,
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
      return jsonResponse({ error: 'Document entity not found' }, 404)
    }

    if (documentEntity.owner_id !== user.id) {
      return jsonResponse({ error: 'Unauthorized: you do not own this document' }, 403)
    }

    // 4. Validate storage_path belongs to this user and document
    const expectedPathPrefix = `${user.id}/${document_entity_id}/`
    if (!storage_path.startsWith(expectedPathPrefix)) {
      return jsonResponse({
        error: 'Invalid storage_path: path does not match document'
      }, 400)
    }

    // 5. Verify file exists in Storage
    const { data: fileInfo, error: fileError } = await supabase.storage
      .from('custody')
      .list(storage_path.split('/').slice(0, -1).join('/'), {
        limit: 1,
        search: storage_path.split('/').pop()
      })

    // Note: If file doesn't exist, that's OK - maybe upload is still in progress
    // We'll still register it to avoid race conditions
    if (fileError) {
      console.warn('[register-custody-upload] Could not verify file exists:', fileError)
    }

    // 6. Update document_entities.source_storage_path and custody_mode (only for source)
    if (purpose === 'source') {
      const { error: updateError } = await supabase
        .from('document_entities')
        .update({
          source_storage_path: storage_path,
          custody_mode: 'encrypted_custody'
        })
        .eq('id', document_entity_id)

      if (updateError) {
        console.error('[register-custody-upload] Error updating source_storage_path and custody_mode:', updateError)
        return jsonResponse({
          error: 'Failed to update document entity with custody metadata'
        }, 500)
      }
    }

    console.log('[register-custody-upload] ✅ Upload registered', {
      document_entity_id,
      storage_path,
      purpose
    })

    return jsonResponse({
      success: true,
      storage_path,
      purpose,
      message: `Encrypted custody registered for "${metadata.original_name}" (${metadata.original_size} bytes)`
    })

  } catch (error) {
    console.error('[register-custody-upload] Error:', error)
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, 500)
  }
})
