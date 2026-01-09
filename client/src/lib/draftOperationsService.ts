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
  id: string
  filename: string
  size: number
  draft_file_ref: string
  metadata?: {
    positions?: unknown
    order?: number
    notes?: string
    custody_mode?: 'hash_only' | 'encrypted_custody'
  }
  added_at?: string
}

/**
 * Guardar draft de operación (server-side)
 *
 * @param operation - Metadata de operación
 * @param files - Archivos a guardar
 * @param custody_mode - Modo de custodia
 * @returns operation_id y documentos guardados
 */
export async function saveDraftOperation(
  operation: { name: string; description?: string },
  files: File[],
  custody_mode: 'hash_only' | 'encrypted_custody' = 'hash_only'
): Promise<{ operation_id: string; documents: { id: string; filename: string }[] }> {
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
            lastModified: file.lastModified
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
      localDrafts.push({ id: draft.id, filename: draft.name })
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

  // TODO (Sprint 4): Implementar descarga desde server con decryption
  console.warn('Server-side draft file loading not implemented yet')
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
