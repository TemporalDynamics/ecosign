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
 */

import { getSupabase } from './supabaseClient';
import { encryptFile, type EncryptedFile } from './encryptionService';

/**
 * Sube un archivo cifrado al bucket 'custody' y retorna el storage_path
 *
 * @param file - Archivo ORIGINAL a cifrar y almacenar
 * @param documentEntityId - ID del document_entity (debe existir previamente)
 * @returns storage_path para guardar en document_entities.source_storage_path
 */
export async function storeEncryptedCustody(
  file: File,
  documentEntityId: string
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

  // 4. Llamar a Edge Function
  const { data, error } = await supabase.functions.invoke('store-encrypted-custody', {
    body: {
      document_entity_id: documentEntityId,
      encrypted_data: base64Encrypted,
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
