/**
 * Encrypted Document Storage
 * 
 * Upload and download documents with E2E encryption.
 * Documents are encrypted client-side before upload.
 */

import { getSupabase } from '../supabaseClient';
import {
  sha256File,
  generateDocumentKey,
  encryptFile,
  decryptFile,
  wrapDocumentKey,
  unwrapDocumentKey,
  getSessionUnwrapKey,
  isSessionInitialized,
} from '../e2e';

export interface UploadEncryptedDocumentOptions {
  file: File;
  userId: string;
  encrypt?: boolean; // Default: false for backward compatibility
  metadata?: {
    description?: string;
    tags?: string[];
  };
}

export interface UploadEncryptedDocumentResult {
  documentId: string;
  hash: string;
  encrypted: boolean;
  storagePath: string;
  wrappedKey?: string;
  wrapIv?: string;
}

/**
 * Upload a document with optional E2E encryption
 * 
 * @param options - Upload options
 * @returns Upload result with document ID and metadata
 */
export async function uploadEncryptedDocument(
  options: UploadEncryptedDocumentOptions
): Promise<UploadEncryptedDocumentResult> {
  const { file, userId, encrypt = false, metadata = {} } = options;
  const supabase = getSupabase();

  try {
    // 1. Calculate hash of original file (before encryption)
    console.log('📊 Calculating document hash...');
    const originalHash = await sha256File(file);
    console.log('✅ Hash calculated:', originalHash.substring(0, 16) + '...');

    let storagePath: string;
    let wrappedKey: string | undefined;
    let wrapIv: string | undefined;
    let uploadBlob: Blob = file;

    // 2. If encryption requested, encrypt the file
    if (encrypt) {
      if (!isSessionInitialized()) {
        throw new Error(
          'Session crypto not initialized. Please log in again.'
        );
      }

      console.log('🔒 Encrypting document...');
      
      // Generate unique document key
      const documentKey = await generateDocumentKey();
      
      // Encrypt file
      const encryptedBlob = await encryptFile(file, documentKey);
      
      // Wrap document key with session unwrap key
      const sessionUnwrapKey = getSessionUnwrapKey();
      const wrapped = await wrapDocumentKey(documentKey, sessionUnwrapKey);
      
      wrappedKey = wrapped.wrappedKey;
      wrapIv = wrapped.wrapIv;
      uploadBlob = encryptedBlob;
      
      storagePath = `encrypted/${userId}/${originalHash}.enc`;
      console.log('✅ Document encrypted');
    } else {
      // Standard upload (not encrypted)
      storagePath = `documents/${userId}/${originalHash}_${file.name}`;
      console.log('📤 Uploading unencrypted document...');
    }

    // 3. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('user-documents')
      .upload(storagePath, uploadBlob, {
        upsert: true,
        contentType: encrypt ? 'application/octet-stream' : file.type,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    console.log('✅ File uploaded to storage');

    // 4. Create database record
    const documentId = crypto.randomUUID();
    const { error: dbError } = await supabase.from('documents').insert({
      id: documentId,
      owner_id: userId,
      filename: file.name,
      file_type: file.type,
      file_size: file.size,
      hash: originalHash,
      encrypted: encrypt,
      encrypted_path: encrypt ? storagePath : null,
      pdf_storage_path: encrypt ? null : storagePath,
      wrapped_key: wrappedKey,
      wrap_iv: wrapIv,
      status: 'uploaded',
      created_at: new Date().toISOString(),
      ...metadata,
    });

    if (dbError) {
      // Rollback: delete uploaded file
      await supabase.storage.from('user-documents').remove([storagePath]);
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('✅ Document record created');

    return {
      documentId,
      hash: originalHash,
      encrypted: encrypt,
      storagePath,
      wrappedKey,
      wrapIv,
    };
  } catch (error) {
    console.error('❌ Upload error:', error);
    throw error instanceof Error ? error : new Error('Unknown upload error');
  }
}

export interface DownloadEncryptedDocumentOptions {
  documentId: string;
  userId: string;
}

/**
 * Download and decrypt a document
 * 
 * Handles both encrypted and unencrypted documents.
 * 
 * @param options - Download options
 * @returns Decrypted blob
 */
export async function downloadEncryptedDocument(
  options: DownloadEncryptedDocumentOptions
): Promise<{ blob: Blob; filename: string; encrypted: boolean }> {
  const { documentId, userId } = options;
  const supabase = getSupabase();

  try {
    // 1. Get document metadata
    console.log('📥 Fetching document metadata...');
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('owner_id', userId)
      .single();

    if (docError || !doc) {
      throw new Error('Document not found or access denied');
    }

    const storagePath = doc.encrypted ? doc.encrypted_path : doc.pdf_storage_path;
    
    if (!storagePath) {
      throw new Error('Storage path not found');
    }

    console.log('✅ Document found:', doc.filename);

    // 2. Download from storage
    console.log('📥 Downloading from storage...');
    const { data: blob, error: downloadError } = await supabase.storage
      .from('user-documents')
      .download(storagePath);

    if (downloadError || !blob) {
      throw new Error(`Download failed: ${downloadError?.message}`);
    }

    console.log('✅ File downloaded');

    // 3. If encrypted, decrypt it
    if (doc.encrypted) {
      if (!isSessionInitialized()) {
        throw new Error(
          'Session crypto not initialized. Please log in to decrypt.'
        );
      }

      console.log('🔓 Decrypting document...');
      
      // Unwrap document key
      const sessionUnwrapKey = getSessionUnwrapKey();
      const documentKey = await unwrapDocumentKey(
        doc.wrapped_key,
        doc.wrap_iv,
        sessionUnwrapKey
      );
      
      // Decrypt file
      const decryptedBlob = await decryptFile(blob, documentKey);
      
      console.log('✅ Document decrypted');
      
      return {
        blob: decryptedBlob,
        filename: doc.filename,
        encrypted: true,
      };
    }

    // Return unencrypted blob as-is
    return {
      blob,
      filename: doc.filename,
      encrypted: false,
    };
  } catch (error) {
    console.error('❌ Download error:', error);
    throw error instanceof Error ? error : new Error('Unknown download error');
  }
}

/**
 * Delete an encrypted document
 * 
 * Removes from both storage and database.
 * 
 * @param documentId - Document ID
 * @param userId - User ID (for authorization)
 */
export async function deleteEncryptedDocument(
  documentId: string,
  userId: string
): Promise<void> {
  const supabase = getSupabase();

  try {
    // 1. Get document metadata
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('encrypted, encrypted_path, pdf_storage_path')
      .eq('id', documentId)
      .eq('owner_id', userId)
      .single();

    if (docError || !doc) {
      throw new Error('Document not found or access denied');
    }

    const storagePath = doc.encrypted ? doc.encrypted_path : doc.pdf_storage_path;

    // 2. Delete from storage
    if (storagePath) {
      await supabase.storage.from('user-documents').remove([storagePath]);
    }

    // 3. Delete from database (cascade will delete shares)
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('owner_id', userId);

    if (deleteError) {
      throw new Error(`Delete failed: ${deleteError.message}`);
    }

    console.log('✅ Document deleted');
  } catch (error) {
    console.error('❌ Delete error:', error);
    throw error instanceof Error ? error : new Error('Unknown delete error');
  }
}

/**
 * List user's documents (both encrypted and unencrypted)
 * 
 * @param userId - User ID
 * @returns List of documents with metadata
 */
export async function listUserDocuments(userId: string) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('documents')
    .select('id, filename, file_type, file_size, hash, encrypted, created_at, status')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list documents: ${error.message}`);
  }

  return data || [];
}
