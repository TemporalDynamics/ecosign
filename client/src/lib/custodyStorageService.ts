/**
 * Custody Storage Service (Client-Side)
 *
 * Servicio para almacenar archivos cifrados en el bucket 'custody'
 * Contrato: DOCUMENT_ENTITY_CONTRACT.md (custody_mode)
 *
 * Uso:
 * 1. Cifrar archivo client-side (encryptionService.ts)
 * 2. Subir archivo cifrado usando storeEncryptedCustody()
 * 3. Guardar storage_path retornado en document_entities.source_storage_path
 *
 * ⚠️ SECURITY NOTE:
 * - Archivo DEBE venir YA CIFRADO desde encryptionService
 * - NUNCA enviar archivo original sin cifrar
 * - storage_path retornado es inmutable (no se puede sobrescribir)
 *
 * ⚠️ ARCHITECTURE (v2 - Direct Upload):
 * - NO se envía el archivo a Edge Functions (límite de payload)
 * - Se usa signed URL para upload directo a Storage
 * - Flow: create-custody-upload-url → PUT to Storage → register-custody-upload
 */

import { getSupabase } from './supabaseClient';
import { encryptFile, type EncryptedFile } from './encryptionService';

// Timeout for the entire upload process (60 seconds)
const UPLOAD_TIMEOUT_MS = 60000;

/**
 * Sube un archivo cifrado al bucket 'custody' y retorna el storage_path
 *
 * Arquitectura v2: Upload directo a Storage (no pasa por Edge Function)
 *
 * @param file - Archivo ORIGINAL a cifrar y almacenar
 * @param documentEntityId - ID del document_entity (debe existir previamente)
 * @returns storage_path para guardar en document_entities.source_storage_path
 */
export async function storeEncryptedCustody(
  file: File,
  documentEntityId: string,
  purpose: 'source' | 'witness' = 'source'
): Promise<string> {
  const supabase = getSupabase();

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    // 1. Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Usuario no autenticado');
    }

    console.log('[custodyStorageService] Starting encrypted upload', {
      documentEntityId,
      purpose,
      fileName: file.name,
      fileSize: file.size
    });

    // 2. Cifrar archivo client-side
    const encryptedFile: EncryptedFile = await encryptFile(file, user.id);
    console.log('[custodyStorageService] File encrypted', {
      encryptedSize: encryptedFile.encrypted.byteLength
    });

    // 3. Obtener signed URL para upload directo
    const { data: urlData, error: urlError } = await supabase.functions.invoke('create-custody-upload-url', {
      body: {
        document_entity_id: documentEntityId,
        purpose,
        metadata: {
          original_name: encryptedFile.originalName,
          original_mime: encryptedFile.originalMime,
          original_size: encryptedFile.originalSize,
        },
      },
    });

    if (urlError || !urlData?.upload_url) {
      console.error('[custodyStorageService] Failed to get upload URL:', urlError);
      throw new Error(`Failed to get upload URL: ${urlError?.message || 'No URL returned'}`);
    }

    // Fix: Replace internal Docker hostname with accessible localhost
    // Supabase local returns kong:8000 which is internal to Docker
    let uploadUrl = urlData.upload_url;
    if (uploadUrl.includes('http://kong:8000')) {
      uploadUrl = uploadUrl.replace('http://kong:8000', 'http://127.0.0.1:54321');
    }

    console.log('[custodyStorageService] Got signed upload URL', {
      storagePath: urlData.storage_path,
      expiresAt: urlData.expires_at,
      originalUrl: urlData.upload_url,
      fixedUrl: uploadUrl
    });

    // 4. Upload directo a Storage usando signed URL
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: new Uint8Array(encryptedFile.encrypted),
      signal: controller.signal,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text().catch(() => 'Unknown error');
      console.error('[custodyStorageService] Direct upload failed:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: errorText
      });
      throw new Error(`Direct upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    console.log('[custodyStorageService] Direct upload successful');

    // 5. Registrar el upload completado
    const { data: registerData, error: registerError } = await supabase.functions.invoke('register-custody-upload', {
      body: {
        document_entity_id: documentEntityId,
        storage_path: urlData.storage_path,
        purpose,
        metadata: {
          original_name: encryptedFile.originalName,
          original_mime: encryptedFile.originalMime,
          original_size: encryptedFile.originalSize,
        },
      },
    });

    if (registerError) {
      console.error('[custodyStorageService] Failed to register upload:', registerError);
      throw new Error(`Failed to register upload: ${registerError.message}`);
    }

    if (!registerData?.success) {
      throw new Error('register-custody-upload did not confirm success');
    }

    console.log('[custodyStorageService] ✅ Upload complete', {
      storagePath: urlData.storage_path
    });

    return urlData.storage_path;

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Upload timed out after ${UPLOAD_TIMEOUT_MS / 1000} seconds`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fallback: Sube usando el método antiguo (base64 en JSON)
 * Solo para archivos pequeños (<100KB)
 *
 * @deprecated Use storeEncryptedCustody instead
 */
export async function storeEncryptedCustodyLegacy(
  file: File,
  documentEntityId: string,
  purpose: 'source' | 'witness' = 'source'
): Promise<string> {
  const supabase = getSupabase();

  // 1. Obtener usuario autenticado
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Usuario no autenticado');
  }

  // 2. Cifrar archivo client-side
  const encryptedFile: EncryptedFile = await encryptFile(file, user.id);

  // 3. Convertir a base64 para envío
  const base64Encrypted = btoa(
    String.fromCharCode(...new Uint8Array(encryptedFile.encrypted))
  );

  // 4. Llamar a Edge Function (método antiguo)
  const { data, error } = await supabase.functions.invoke('store-encrypted-custody', {
    body: {
      document_entity_id: documentEntityId,
      encrypted_data: base64Encrypted,
      purpose,
      metadata: {
        original_name: encryptedFile.originalName,
        original_mime: encryptedFile.originalMime,
        original_size: encryptedFile.originalSize,
      },
    },
  });

  if (error) {
    console.error('Error storing encrypted custody:', error);
    throw new Error(`Failed to store encrypted custody: ${error.message}`);
  }

  if (!data || !data.success || !data.storage_path) {
    throw new Error('store-encrypted-custody did not return storage_path');
  }

  return data.storage_path;
}

/**
 * Descarga y descifra un archivo desde custody storage
 *
 * TODO (Phase 2): Implementar descarga de archivos cifrados
 * Actualmente no es prioritario porque custody es solo para backup.
 * Los usuarios trabajan con witness PDFs, no con originales.
 *
 * @param storagePath - Path del archivo cifrado en bucket 'custody'
 * @param originalMime - MIME type original
 * @param originalName - Nombre original del archivo
 * @returns Archivo descifrado
 */
export async function retrieveEncryptedCustody(
  storagePath: string,
  originalMime: string,
  originalName: string
): Promise<File> {
  const supabase = getSupabase();

  // 1. Obtener usuario autenticado
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Usuario no autenticado');
  }

  // 2. Descargar archivo cifrado desde bucket 'custody'
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('custody')
    .download(storagePath);

  if (downloadError) {
    console.error('Error downloading encrypted custody:', downloadError);
    throw new Error(`Failed to download encrypted custody: ${downloadError.message}`);
  }

  if (!fileData) {
    throw new Error('No file data received from custody storage');
  }

  // 3. Descifrar archivo (TODO: implementar)
  // const decryptedFile = await decryptFile(
  //   await fileData.arrayBuffer(),
  //   user.id,
  //   originalMime,
  //   originalName
  // );

  throw new Error('retrieveEncryptedCustody not implemented yet (Phase 2)');
}

/**
 * Verifica si custody storage está disponible
 *
 * @returns true si el servicio está disponible
 */
export function isCustodyStorageAvailable(): boolean {
  // TODO (Phase 2): Agregar checks de feature flags
  return true;
}
