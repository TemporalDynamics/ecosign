/**
 * load-draft Edge Function
 *
 * Recupera drafts de operaciones de un usuario
 * Contrato: DRAFT_OPERATION_RULES.md
 *
 * GET /load-draft?operation_id={id}    → Cargar draft específico
 * GET /load-draft                       → Listar todos los drafts del usuario
 *
 * Returns: {
 *   success: boolean,
 *   drafts: [{
 *     operation_id: string,
 *     name: string,
 *     description?: string,
 *     created_at: string,
 *     documents: [{
 *       filename: string,
 *       size: number,
 *       draft_file_ref: string,
 *       metadata?: {...}
 *     }]
 *   }]
 * }
 *
 * ⚠️ SECURITY NOTE (Phase 1):
 * - Only authenticated users can access their own drafts (RLS enforced)
 * - draft_file_ref returned but NOT decrypted (Phase 1 = no encryption yet)
 * - NO public listing endpoint exists
 * - Encryption/decryption added in Sprint 4 (Custody Mode)
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

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  const { headers: corsHeaders } = getCorsHeaders(req.headers.get('Origin') ?? undefined)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
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

    // 2. Parsear query params
    const url = new URL(req.url)
    const operationId = url.searchParams.get('operation_id')

    // 3. Query drafts
    let query = supabase
      .from('operations')
      .select(`
        id,
        name,
        description,
        created_at,
        updated_at
      `)
      .eq('owner_id', user.id)
      .eq('status', 'draft')
      .order('updated_at', { ascending: false })

    if (operationId) {
      query = query.eq('id', operationId)
    }

    const { data: operations, error: operationsError } = await query

    if (operationsError) {
      console.error('Error loading draft operations:', operationsError)
      return jsonResponse({ error: 'Failed to load drafts' }, 500, corsHeaders)
    }

    if (!operations || operations.length === 0) {
      return jsonResponse({ success: true, drafts: [] }, 200, corsHeaders)
    }

    // 4. Cargar documentos de cada draft
    const drafts = []

    for (const operation of operations) {
      const { data: documents, error: documentsError } = await supabase
        .from('operation_documents')
        .select(`
          draft_file_ref,
          draft_metadata,
          added_at
        `)
        .eq('operation_id', operation.id)
        .not('draft_file_ref', 'is', null) // Solo drafts

      if (documentsError) {
        console.error('Error loading draft documents:', documentsError)
        continue
      }

      drafts.push({
        operation_id: operation.id,
        name: operation.name,
        description: operation.description,
        created_at: operation.created_at,
        updated_at: operation.updated_at,
        documents: (documents || []).map((doc: any) => ({
          filename: doc.draft_metadata?.filename || 'unknown',
          size: doc.draft_metadata?.size || 0,
          draft_file_ref: doc.draft_file_ref,
          metadata: doc.draft_metadata,
          added_at: doc.added_at
        }))
      })
    }

    // 5. Retornar resultado
    return jsonResponse({
      success: true,
      drafts
    }, 200, corsHeaders)

  } catch (error) {
    console.error('Error in load-draft:', error)
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, 500, corsHeaders)
  }
})
