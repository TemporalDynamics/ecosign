/**
 * save-draft Edge Function
 *
 * Guarda un draft de operación con documentos sin proteger
 * Contrato: DRAFT_OPERATION_RULES.md
 *
 * POST /save-draft
 * Body: {
 *   operation: { name, description? },
 *   documents: [{
 *     filename: string,
 *     size: number,
 *     file_data: string (base64),
 *     metadata?: { positions?, order?, notes? }
 *   }],
 *   custody_mode?: 'hash_only' | 'encrypted_custody'
 * }
 *
 * Returns: {
 *   success: boolean,
 *   operation_id: string,
 *   documents: [{ filename: string }]
 * }
 *
 * ⚠️ SECURITY NOTE (Phase 1):
 * Draft files are NOT encrypted in this phase.
 * - draft_file_ref is UUID-based (not guessable)
 * - RLS policies enforce owner_id checks
 * - NO public endpoints expose draft_file_ref
 * - Encryption added in Sprint 4 (Custody Mode)
 *
 * DO NOT expose draft_file_ref in:
 * - Public APIs
 * - Logs
 * - Analytics events
 */

import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { getCorsHeaders } from '../_shared/cors.ts'

const jsonResponse = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    }
  })

interface DraftDocument {
  filename: string
  size: number
  file_data: string // base64
  metadata?: {
    positions?: unknown
    order?: number
    notes?: string
    type?: string
    lastModified?: number
    overlay_spec?: unknown[]
    signature_preview?: string
    nda_applied?: boolean
  }
}

interface SaveDraftRequest {
  operation: {
    name: string
    description?: string
  }
  documents: DraftDocument[]
  custody_mode?: 'hash_only' | 'encrypted_custody'
}

serve(async (req) => {
  const { headers: corsHeaders } = getCorsHeaders(req.headers.get('Origin') ?? undefined)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (Deno.env.get('FASE') !== '1') {
    return jsonResponse({ error: 'disabled', message: 'Function disabled (FASE != 1)' }, 503, corsHeaders)
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Autenticar usuario
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, 401, corsHeaders)
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders)
    }

    // 2. Parsear body
    const body: SaveDraftRequest = await req.json()
    const { operation, documents, custody_mode = 'hash_only' } = body

    if (!operation?.name || !Array.isArray(documents) || documents.length === 0) {
      return jsonResponse({ error: 'Invalid request: operation.name and documents[] required' }, 400, corsHeaders)
    }

    // 3. Validar documentos
    for (const doc of documents) {
      if (!doc.filename || !doc.file_data || !doc.size) {
        return jsonResponse({ error: 'Invalid document: filename, file_data, size required' }, 400, corsHeaders)
      }
    }

    // 4. Resolve system drafts container (single per user)
    // Drafts are not operations from the user's perspective; this is a backend container.
    const DRAFTS_CONTAINER_NAME = '__DRAFTS__'
    let operationId: string | null = null
    {
      const { data: existing, error: existingError } = await supabase
        .from('operations')
        .select('id')
        .eq('owner_id', user.id)
        .eq('status', 'draft')
        .eq('name', DRAFTS_CONTAINER_NAME)
        .maybeSingle()

      if (existingError) {
        console.error('Error resolving drafts container:', existingError)
        return jsonResponse({ error: 'Failed to resolve drafts container' }, 500, corsHeaders)
      }

      if (existing?.id) {
        operationId = existing.id
      } else {
        const { data: created, error: createError } = await supabase
          .from('operations')
          .insert({
            owner_id: user.id,
            name: DRAFTS_CONTAINER_NAME,
            description: 'system: drafts container',
            status: 'draft'
          })
          .select('id')
          .single()

        if (createError || !created?.id) {
          console.error('Error creating drafts container:', createError)
          return jsonResponse({ error: 'Failed to create drafts container' }, 500, corsHeaders)
        }

        operationId = created.id
      }
    }

    if (!operationId) {
      return jsonResponse({ error: 'Failed to resolve drafts container' }, 500, corsHeaders)
    }

    // 5. Guardar documentos draft
    const savedDocuments: { filename: string }[] = []

    for (const doc of documents) {
      // TODO (Sprint 4 - Custody Mode): Implement encryption service
      // if (custody_mode === 'encrypted_custody') {
      //   draft_file_ref = await encryptAndStore(doc.file_data, user.id, operationId)
      // } else {
      //   draft_file_ref = storeTemporary(doc.file_data, user.id)
      // }

      // PHASE 1: Store draft file in Storage (private, owner-scoped path)
      const draftId = crypto.randomUUID()
      const safeName = doc.filename.replace(/[^a-zA-Z0-9._-]+/g, '_')
      const storagePath = `${user.id}/drafts/${operationId}/${draftId}/${safeName}`

      // Decode base64 to bytes
      const raw = atob(doc.file_data)
      const bytes = new Uint8Array(raw.length)
      for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i)

      const contentType = doc.metadata?.type || 'application/pdf'
      const { error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(storagePath, bytes, { contentType, upsert: false })

      if (uploadError) {
        console.error('Error uploading draft file:', uploadError)
        continue
      }

      const draft_file_ref = `server:${storagePath}`

      const draft_metadata = {
        filename: doc.filename,
        size: doc.size,
        saved_at: new Date().toISOString(),
        custody_mode,
        type: doc.metadata?.type || null,
        lastModified: doc.metadata?.lastModified || null,
        ...doc.metadata
      }

      const { error: documentError } = await supabase
        .from('operation_documents')
        .insert({
          operation_id: operationId,
          document_entity_id: null, // Draft no tiene document_entity_id aún
          draft_file_ref,
          draft_metadata,
          added_by: user.id
        })
        .select()
        .single()

      if (documentError) {
        console.error('Error saving draft document:', documentError)
        // No fallar completamente, continuar con otros documentos
        continue
      }

      savedDocuments.push({
        filename: doc.filename
      })
    }

    if (savedDocuments.length === 0) {
      return jsonResponse({ error: 'Failed to save any documents' }, 500, corsHeaders)
    }

    // 6. Retornar resultado
    return jsonResponse({
      success: true,
      operation_id: operationId,
      documents: savedDocuments,
      message: `Draft saved (${savedDocuments.length} document(s))`
    }, 200, corsHeaders)

  } catch (error) {
    console.error('Error in save-draft:', error)
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, 500, corsHeaders)
  }
})
