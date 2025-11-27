// ============================================
// Document Storage Utilities
// ============================================
// Upload, download, and manage PDFs in Supabase Storage
// ============================================

import { supabase } from '@/lib/supabaseClient'
import { calculateDocumentHash } from './hashDocument'

export interface UploadResult {
  success: boolean
  path?: string
  hash?: string
  error?: string
}

export interface DownloadResult {
  success: boolean
  data?: Blob
  error?: string
}

/**
 * Upload a PDF document to Supabase Storage
 * Path format: {user_id}/{workflow_id}/{filename}.pdf
 *
 * @param file - PDF file to upload
 * @param workflowId - Workflow ID
 * @returns Upload result with path and hash
 */
export async function uploadDocument(
  file: File,
  workflowId: string
): Promise<UploadResult> {
  try {
    // Validate file type
    if (file.type !== 'application/pdf') {
      return {
        success: false,
        error: 'Solo se permiten archivos PDF'
      }
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'El archivo excede el tamaño máximo de 50MB'
      }
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado'
      }
    }

    // Calculate document hash
    const hash = await calculateDocumentHash(file)

    // Generate storage path: user_id/workflow_id/filename.pdf
    const filename = `${workflowId}/${file.name}`
    const path = `${user.id}/${filename}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false // Don't overwrite existing files
      })

    if (error) {
      console.error('Upload error:', error)
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: true,
      path: data.path,
      hash
    }
  } catch (error) {
    console.error('Upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al subir el archivo'
    }
  }
}

/**
 * Download a document from Supabase Storage
 *
 * @param path - Storage path of the document
 * @returns Blob of the document
 */
export async function downloadDocument(path: string): Promise<DownloadResult> {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .download(path)

    if (error) {
      console.error('Download error:', error)
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: true,
      data
    }
  } catch (error) {
    console.error('Download error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al descargar el archivo'
    }
  }
}

/**
 * Get a public URL for a document (for viewing in browser)
 * Note: This requires the storage bucket to be public
 *
 * @param path - Storage path of the document
 * @returns Public URL
 */
export function getDocumentUrl(path: string): string {
  const { data } = supabase.storage
    .from('documents')
    .getPublicUrl(path)

  return data.publicUrl
}

/**
 * Get a signed URL for temporary access to a private document
 *
 * @param path - Storage path of the document
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL
 */
export async function getSignedDocumentUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, expiresIn)

    if (error) {
      console.error('Error creating signed URL:', error)
      return null
    }

    return data.signedUrl
  } catch (error) {
    console.error('Error creating signed URL:', error)
    return null
  }
}

/**
 * Delete a document from storage
 *
 * @param path - Storage path of the document
 * @returns Success status
 */
export async function deleteDocument(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from('documents')
      .remove([path])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete error:', error)
    return false
  }
}

/**
 * Trigger download in browser
 *
 * @param blob - File blob
 * @param filename - Filename for download
 */
export function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
