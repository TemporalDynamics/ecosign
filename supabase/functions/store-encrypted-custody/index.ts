/**
 * store-encrypted-custody Edge Function
 *
 * Almacena archivos CIFRADOS en el bucket 'custody'
 * Contrato: DOCUMENT_ENTITY_CONTRACT.md (custody_mode)
 *
 * POST /store-encrypted-custody
 * Body: {
 *   document_entity_id: string,
 *   encrypted_data: string (base64),
 *   metadata: {
 *     original_name: string,
 *     original_mime: string,
 *     original_size: number
 *   }
 * }
 *
 * Returns: {
 *   success: boolean,
 *   storage_path: string,  // Para guardar en document_entities.source_storage_path
 *   message: string
 * }
 *
 * ⚠️ CRITICAL SECURITY NOTES:
 * - Archivo DEBE venir YA CIFRADO desde cliente (AES-256-GCM)
 * - Server NUNCA tiene acceso a la clave de descifrado
 * - Server solo almacena ciphertext
 * - Solo el owner puede subir/descargar (RLS enforced)
 * - Path format: {user_id}/{document_entity_id}/encrypted_source
 *
 * ⚠️ PHASE 1 IMPLEMENTATION:
 * Esta función almacena archivos cifrados SIN validación adicional.
 * En Phase 2, agregar:
 * - Verificación de firma del cifrado
 * - Audit log de accesos
 * - Rate limiting
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

interface StoreEncryptedRequest {
  document_entity_id: string
  encrypted_data: string // base64
  purpose?: 'source' | 'witness'
  metadata: {
    original_name: string
    original_mime: string
    original_size: number
  }
}

serve(async (req) => {
  console.log('[store-encrypted-custody] ⚡ REQUEST RECEIVED', {
    method: req.method,
    contentLength: req.headers.get('content-length'),
    timestamp: new Date().toISOString()
  })

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

    // 1. Autenticar usuario
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, 401)
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    // 2. Parsear body
    console.log('[store-encrypted-custody] Parsing body...')
    const body: StoreEncryptedRequest = await req.json()
    console.log('[store-encrypted-custody] Body parsed', {
      document_entity_id: body.document_entity_id,
      encrypted_data_length: body.encrypted_data?.length,
      purpose: body.purpose,
      metadata: body.metadata
    })
    const { document_entity_id, encrypted_data, metadata, purpose = 'source' } = body

    if (!document_entity_id || !encrypted_data || !metadata) {
      return jsonResponse({
        error: 'Invalid request: document_entity_id, encrypted_data, and metadata required'
      }, 400)
    }

    if (!metadata.original_name || !metadata.original_mime || !metadata.original_size) {
      return jsonResponse({
        error: 'Invalid metadata: original_name, original_mime, original_size required'
      }, 400)
    }

    // 3. Validar que el document_entity existe y pertenece al usuario
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

    // 4. Decodificar base64 a bytes
    const encryptedBytes = Uint8Array.from(atob(encrypted_data), c => c.charCodeAt(0))

    // 5. Construir path: {user_id}/{document_entity_id}/encrypted_source|encrypted_witness/{timestamp}
    const storagePath = purpose === 'witness'
      ? `${user.id}/${document_entity_id}/encrypted_witness/${Date.now()}`
      : `${user.id}/${document_entity_id}/encrypted_source`

    // 6. Subir al bucket 'custody'
    const { error: uploadError } = await supabase.storage
      .from('custody')
      .upload(storagePath, encryptedBytes, {
        contentType: 'application/octet-stream', // Siempre binary (está cifrado)
        upsert: false, // NO permitir sobrescribir (inmutabilidad)
        cacheControl: '31536000', // 1 año (archivo inmutable)
      })

    if (uploadError) {
      console.error('Error uploading encrypted custody:', uploadError)
      return jsonResponse({
        error: `Failed to upload encrypted file: ${uploadError.message}`
      }, 500)
    }

    // 7. Actualizar document_entities.source_storage_path (solo si es source)
    if (purpose === 'source') {
      const { error: updateError } = await supabase
        .from('document_entities')
        .update({
          source_storage_path: storagePath
        })
        .eq('id', document_entity_id)

      if (updateError) {
        console.error('Error updating source_storage_path:', updateError)
        // Intentar limpiar el archivo subido
        await supabase.storage.from('custody').remove([storagePath])
        return jsonResponse({
          error: 'Failed to update document entity with storage path'
        }, 500)
      }
    }

    // 8. Log de auditoría (opcional, para Phase 2)
    // await supabase.from('custody_audit_log').insert({
    //   document_entity_id,
    //   action: 'store',
    //   user_id: user.id,
    //   metadata
    // })

    // 9. Retornar éxito
    return jsonResponse({
      success: true,
      storage_path: storagePath,
      purpose,
      message: `Encrypted custody stored for "${metadata.original_name}" (${metadata.original_size} bytes)`
    })

  } catch (error) {
    console.error('Error in store-encrypted-custody:', error)
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, 500)
  }
})
