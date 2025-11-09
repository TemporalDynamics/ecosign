import { getSupabaseClient } from './supabase';

/**
 * Utilidades para Supabase Storage
 * Manejo de uploads, signed URLs y gestión de archivos
 */

export type BucketName = 'eco-files' | 'ecox-files' | 'nda-signatures' | 'proofs' | 'temp-uploads';

/**
 * Subir archivo a Supabase Storage
 * Path format: {user_id}/{document_id}/{filename}
 */
export const uploadFile = async (
  bucket: BucketName,
  path: string,
  fileBuffer: Buffer,
  contentType: string = 'application/octet-stream'
): Promise<{ path: string; fullPath: string }> => {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, fileBuffer, {
      contentType,
      upsert: false,
      cacheControl: '3600'
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return {
    path: data.path,
    fullPath: `${bucket}/${data.path}`
  };
};

/**
 * Generar URL firmada (temporal) para acceso seguro
 * @param expiresIn - Segundos hasta expiración (default: 5 minutos)
 */
export const getSignedUrl = async (
  bucket: BucketName,
  path: string,
  expiresIn: number = 300
): Promise<string> => {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  if (!data.signedUrl) {
    throw new Error('Signed URL is empty');
  }

  return data.signedUrl;
};

/**
 * Eliminar archivo de Storage
 */
export const deleteFile = async (
  bucket: BucketName,
  path: string
): Promise<void> => {
  const supabase = getSupabaseClient();

  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
};

/**
 * Listar archivos en un directorio
 */
export const listFiles = async (
  bucket: BucketName,
  prefix: string = ''
): Promise<Array<{ name: string; size: number; createdAt: string }>> => {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(prefix);

  if (error) {
    throw new Error(`List failed: ${error.message}`);
  }

  return data.map(file => ({
    name: file.name,
    size: file.metadata?.size || 0,
    createdAt: file.created_at
  }));
};

/**
 * Construir path estructurado para archivos
 */
export const buildFilePath = (
  userId: string,
  documentId: string,
  filename: string
): string => {
  return `${userId}/${documentId}/${filename}`;
};
