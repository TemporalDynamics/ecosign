/**
 * Draft Operations Service (Server-Side)
 *
 * Contrato: DRAFT_OPERATION_RULES.md
 *
 * Maneja drafts de operaciones con persistencia server-side
 * Fallback a IndexedDB local si server falla (backwards compatibility)
 */

import { getSupabase } from './supabaseClient'
import { addDraft as addDraftLocal, getDraftFile as getDraftFileLocal, removeDraft as removeDraftLocal, listDrafts as listDraftsLocal, type DraftMeta } from '../utils/draftStorage'

export interface DraftOperation {
  operation_id: string
  name: string
  description?: string
  created_at: string
  updated_at?: string
  documents: DraftDocument[]
}

export interface DraftDocument {
  id?: string
  filename: string
  size: number
  draft_file_ref: string
  metadata?: {
    positions?: unknown
    order?: number
    notes?: string
    custody_mode?: 'hash_only' | 'encrypted_custody'
    type?: string
    lastModified?: number
    overlay_spec?: unknown[] // Sprint 5: Coordenadas normalizadas para stamping
    signature_preview?: string // Sprint 5: Base64 de la firma (si aplica)
    nda_applied?: boolean
  }
  added_at?: string
}

/**
 * Guardar draft de operación (server-side)
 *
 * @param operation - Metadata de operación
 * @param files - Archivos a guardar
 * @param custody_mode - Modo de custodia
 * @param overlay_spec - Sprint 5: Coordenadas normalizadas para stamping (opcional)
 * @param signature_preview - Sprint 5: Base64 de la firma (opcional)
 * @param nda_applied - Si se aplicó NDA (opcional)
 * @returns operation_id y documentos guardados
 */
export async function saveDraftOperation(
  operation: { name: string; description?: string },
  files: File[],
  custody_mode: 'hash_only' | 'encrypted_custody' = 'hash_only',
  overlay_spec?: unknown[],
  signature_preview?: string,
  nda_applied?: boolean,
  draft_state?: unknown
): Promise<{ operation_id: string; documents: { filename: string }[] }> {
  try {
    const supabase = getSupabase()

    // 1. Obtener token de autorización
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No authenticated session')
    }

    // 2. Convertir archivos a base64
    const documents = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer()
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        )

        return {
          filename: file.name,
          size: file.size,
          file_data: base64,
          metadata: {
            type: file.type,
            lastModified: file.lastModified,
            // Sprint 5: Incluir overlay_spec, signature_preview, nda_applied
            ...(overlay_spec && overlay_spec.length > 0 ? { overlay_spec } : {}),
            ...(signature_preview ? { signature_preview } : {}),
            ...(nda_applied !== undefined ? { nda_applied } : {}),
            ...(draft_state !== undefined ? { draft_state } : {}),
          }
        }
      })
    )

    // 3. Llamar Edge Function
    const { data, error } = await supabase.functions.invoke('save-draft', {
      body: {
        operation,
        documents,
        custody_mode
      }
    })

    if (error) {
      console.error('Error calling save-draft function:', error)
      throw error
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to save draft')
    }

    // 4. TAMBIÉN guardar en IndexedDB local (dual-write para recovery)
    for (const file of files) {
      try {
        await addDraftLocal(file)
      } catch (err) {
        console.warn('Failed to save local backup:', err)
        // No fallar si local backup falla
      }
    }

    return {
      operation_id: data.operation_id,
      documents: data.documents
    }
  } catch (error) {
    console.error('Error saving draft operation (server):', error)

    // Fallback: guardar solo local (legacy mode)
    console.warn('Falling back to local-only draft storage')
    const localDrafts = []
    for (const file of files) {
      const draft = await addDraftLocal(file)
      localDrafts.push({ filename: draft.name })
    }

    return {
      operation_id: 'local-' + crypto.randomUUID(),
      documents: localDrafts
    }
  }
}

/**
 * Cargar drafts de operaciones (server-side)
 *
 * @returns Lista de drafts del usuario
 */
export async function loadDraftOperations(): Promise<DraftOperation[]> {
  try {
    const supabase = getSupabase()

    // 1. Obtener token de autorización
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No authenticated session')
    }

    // 2. Llamar Edge Function
    const { data, error } = await supabase.functions.invoke('load-draft', {
      method: 'GET'
    })

    if (error) {
      console.error('Error calling load-draft function:', error)
      throw error
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to load drafts')
    }

    return data.drafts || []
  } catch (error) {
    console.error('Error loading draft operations (server):', error)

    // Fallback: cargar desde local (legacy mode)
    console.warn('Falling back to local-only draft storage')
    const localDrafts = listDraftsLocal()

    // Convertir formato local a DraftOperation
    return localDrafts.map((draft) => ({
      operation_id: 'local-' + draft.id,
      name: draft.name,
      created_at: draft.createdAt,
      documents: [{
        id: draft.id,
        filename: draft.name,
        size: draft.size,
        draft_file_ref: `local:${draft.id}`,
        metadata: {
          type: draft.type
        }
      }]
    }))
  }
}

/**
 * Cargar archivo de draft (desde local o server)
 *
 * @param draft_file_ref - Referencia al archivo draft
 * @returns File object
 */
export async function loadDraftFile(draft_file_ref: string): Promise<File | null> {
  // Si es referencia local, usar IndexedDB
  if (draft_file_ref.startsWith('local:')) {
    const localId = draft_file_ref.replace('local:', '')
    return await getDraftFileLocal(localId)
  }

  // Server-side draft reference (stored in Supabase Storage)
  // Format: server:<storage_path>
  if (draft_file_ref.startsWith('server:')) {
    const storagePath = draft_file_ref.replace('server:', '')
    if (!storagePath) return null

    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.storage
        .from('user-documents')
        .download(storagePath)

      if (error || !data) {
        console.error('Failed to download server draft', error)
        return null
      }

      // Best-effort filename inference from path
      const fallbackName = storagePath.split('/').pop() || 'draft.pdf'
      const fileName = fallbackName
      const mime = (data as any).type || 'application/pdf'

      return new File([data], fileName, { type: mime })
    } catch (err) {
      console.error('Server-side draft download failed', err)
      return null
    }
  }

  // Legacy placeholder refs were never backed by storage.
  if (draft_file_ref.startsWith('draft:')) {
    console.warn('Legacy draft reference has no backing file', draft_file_ref)
    return null
  }

  console.warn('Unknown draft_file_ref format', draft_file_ref)
  return null
}

/**
 * Eliminar draft de operación (server y local)
 *
 * @param operation_id - ID de la operación
 */
export async function deleteDraftOperation(operation_id: string): Promise<void> {
  try {
    const supabase = getSupabase()

    // Si es local-only, solo eliminar de IndexedDB
    if (operation_id.startsWith('local-')) {
      const localId = operation_id.replace('local-', '')
      await removeDraftLocal(localId)
      return
    }

    // Eliminar del servidor
    const { error } = await supabase
      .from('operations')
      .delete()
      .eq('id', operation_id)
      .eq('status', 'draft')

    if (error) {
      console.error('Error deleting draft operation:', error)
      throw error
    }

    // operation_documents se eliminan automáticamente por CASCADE
  } catch (error) {
    console.error('Error deleting draft operation:', error)
    throw error
  }
}

/**
 * Eliminar un documento borrador puntual (sin borrar el contenedor)
 */
export async function deleteDraftDocument(operation_id: string, draft_file_ref: string): Promise<void> {
  const supabase = getSupabase()

  // Local
  if (draft_file_ref.startsWith('local:')) {
    const localId = draft_file_ref.replace('local:', '')
    await removeDraftLocal(localId)
    return
  }

  // Server: remove file + row
  if (draft_file_ref.startsWith('server:')) {
    const storagePath = draft_file_ref.replace('server:', '')
    const { error: rowError } = await supabase
      .from('operation_documents')
      .delete()
      .eq('operation_id', operation_id)
      .eq('draft_file_ref', draft_file_ref)

    if (rowError) {
      console.warn('Failed to delete operation_documents draft row', rowError)
    }

    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from('user-documents')
        .remove([storagePath])
      if (storageError) {
        console.warn('Failed to delete draft storage object', storageError)
      }
    }
    return
  }

  // Legacy refs: only delete row
  const { error: legacyError } = await supabase
    .from('operation_documents')
    .delete()
    .eq('operation_id', operation_id)
    .eq('draft_file_ref', draft_file_ref)

  if (legacyError) {
    throw legacyError
  }
}

/**
 * Mover un borrador a una operación activa (delete+insert)
 */
export async function moveDraftToOperation(params: {
  from_operation_id: string
  to_operation_id: string
  draft_file_ref: string
  draft_metadata?: any
}): Promise<void> {
  const supabase = getSupabase()
  const { from_operation_id, to_operation_id, draft_file_ref, draft_metadata } = params

  // Insert into target
  const { error: insertError } = await supabase
    .from('operation_documents')
    .insert({
      operation_id: to_operation_id,
      document_entity_id: null,
      draft_file_ref,
      draft_metadata: draft_metadata ?? {},
    })

  if (insertError) throw insertError

  // Remove from source
  const { error: deleteError } = await supabase
    .from('operation_documents')
    .delete()
    .eq('operation_id', from_operation_id)
    .eq('draft_file_ref', draft_file_ref)

  if (deleteError) throw deleteError
}

/**
 * Convertir draft a operación activa (proteger documentos)
 *
 * @param operation_id - ID de la operación draft
 * @returns operation_id actualizado
 */
export async function activateDraftOperation(operation_id: string): Promise<string> {
  try {
    const supabase = getSupabase()

    // Cambiar status de draft a active
    const { error } = await supabase
      .from('operations')
      .update({ status: 'active' })
      .eq('id', operation_id)
      .eq('status', 'draft')

    if (error) {
      console.error('Error activating draft operation:', error)
      throw error
    }

    return operation_id
  } catch (error) {
    console.error('Error activating draft operation:', error)
    throw error
  }
}

/**
 * Contar drafts pendientes del usuario
 *
 * @returns Número de drafts
 */
export async function countUserDrafts(): Promise<number> {
  try {
    const supabase = getSupabase()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const { data, error } = await supabase
      .rpc('count_user_drafts', { user_id_param: user.id })

    if (error) {
      console.error('Error counting user drafts:', error)
      return 0
    }

    return data || 0
  } catch (error) {
    console.error('Error counting user drafts:', error)
    return 0
  }
}
