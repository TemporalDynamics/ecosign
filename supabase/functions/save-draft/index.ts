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

interface DraftDocument {
  filename: string
  size: number
  file_data: string // base64
  metadata?: {
    positions?: unknown
    order?: number
    notes?: string
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
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  const { headers: corsHeaders } = getCorsHeaders(req.headers.get('Origin') ?? undefined)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

    // 4. Crear operación con status='draft'
    const { data: operationData, error: operationError } = await supabase
      .from('operations')
      .insert({
        owner_id: user.id,
        name: operation.name,
        description: operation.description || null,
        status: 'draft'
      })
      .select()
      .single()

    if (operationError) {
      console.error('Error creating draft operation:', operationError)
      return jsonResponse({ error: 'Failed to create draft operation' }, 500, corsHeaders)
    }

    const operationId = operationData.id

    // 5. Guardar documentos draft
    const savedDocuments: { filename: string }[] = []

    for (const doc of documents) {
      // TODO (Sprint 4 - Custody Mode): Implement encryption service
      // if (custody_mode === 'encrypted_custody') {
      //   draft_file_ref = await encryptAndStore(doc.file_data, user.id, operationId)
      // } else {
      //   draft_file_ref = storeTemporary(doc.file_data, user.id)
      // }

      // PHASE 1: Guardar metadata sin cifrado real
      // Cliente guarda archivo en IndexedDB como antes, pero también registra en server
      const draft_file_ref = `draft:${user.id}:${operationId}:${crypto.randomUUID()}`

      const draft_metadata = {
        filename: doc.filename,
        size: doc.size,
        saved_at: new Date().toISOString(),
        custody_mode,
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
      message: `Draft operation "${operation.name}" created with ${savedDocuments.length} document(s)`
    }, 200, corsHeaders)

  } catch (error) {
    console.error('Error in save-draft:', error)
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, 500, corsHeaders)
  }
})
