// client/src/utils/documentStorage.js
/**
 * Utilities for storing certified documents in Supabase
 */

import { supabase } from '../lib/supabaseClient';

/**
 * Upload a signed PDF to Supabase Storage and create a user_documents record
 * @param {File} pdfFile - The signed PDF file
 * @param {Object} ecoData - The ECO certificate data (manifest + signatures + metadata)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} The created document record
 */
export async function saveUserDocument(pdfFile, ecoData, options = {}) {
  const {
    signNowDocumentId = null,
    signNowStatus = null,
    signedAt = null,
    hasLegalTimestamp = false,
    hasBitcoinAnchor = false,
    bitcoinAnchorId = null,
    tags = [],
    notes = null
  } = options;

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Usuario no autenticado');
  }

  // Generate document hash
  const arrayBuffer = await pdfFile.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const documentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Upload PDF to Supabase Storage
  const fileName = `${user.id}/${Date.now()}-${pdfFile.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('user-documents')
    .upload(fileName, pdfFile, {
      contentType: pdfFile.type || 'application/pdf',
      upsert: false
    });

  if (uploadError) {
    console.error('Error uploading PDF:', uploadError);
    throw new Error(`Error al subir el documento: ${uploadError.message}`);
  }

  // Create record in 'user_documents' table
  const { data: docData, error: docError} = await supabase
    .from('user_documents')
    .insert({
      user_id: user.id,
      document_name: pdfFile.name,
      document_hash: documentHash,
      document_size: pdfFile.size,
      mime_type: pdfFile.type || 'application/pdf',
      pdf_storage_path: uploadData.path,
      eco_data: ecoData // Store the complete ECO manifest
    })
    .select()
    .single();

  if (docError) {
    // If DB insert fails, try to clean up the uploaded file
    await supabase.storage.from('user-documents').remove([uploadData.path]);
    console.error('Error creating document record:', docError);
    throw new Error(`Error al guardar el registro: ${docError.message}`);
  }

  return docData;
}

/**
 * Get all documents for the current user
 * @returns {Promise<Array>} Array of user documents
 */
export async function getUserDocuments() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Usuario no autenticado');
  }

  // Query user_documents table
  const { data, error } = await supabase
    .from('user_documents')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching documents:', error);
    throw new Error(`Error al obtener documentos: ${error.message}`);
  }

  // Transform to match expected format
  return (data || []).map(doc => ({
    id: doc.id,
    document_name: doc.title, // Usar title porque original_filename puede no existir
    document_hash: doc.eco_hash,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    verification_count: 0, // TODO: Get count when relationships exist
    status: doc.status
  }));
}

/**
 * Get a signed URL for downloading a document
 * @param {string} storagePath - The storage path of the document
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} The signed URL
 */
export async function getDocumentDownloadUrl(storagePath, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from('user-documents')
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    console.error('Error creating signed URL:', error);
    throw new Error(`Error al generar URL de descarga: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Delete a user document (both storage and DB record)
 * @param {string} documentId - The document ID
 * @returns {Promise<void>}
 */
export async function deleteUserDocument(documentId) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Usuario no autenticado');
  }

  // TEMP FIX: Use 'documents' table
  // Get document info including storage path
  const { data: doc, error: fetchError } = await supabase
    .from('user_documents')
    .select('id, pdf_storage_path')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .single();

  if (fetchError) {
    throw new Error(`Error al obtener el documento: ${fetchError.message}`);
  }

  // Delete from storage if path exists
  if (doc.pdf_storage_path) {
    const { error: storageError } = await supabase.storage
      .from('user-documents')
      .remove([doc.pdf_storage_path]);

    if (storageError) {
      console.warn('Error deleting from storage:', storageError);
      // Continue with DB deletion even if storage fails
    }
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from('user_documents')
    .delete()
    .eq('id', documentId)
    .eq('user_id', user.id);

  if (deleteError) {
    throw new Error(`Error al eliminar el documento: ${deleteError.message}`);
  }
}
