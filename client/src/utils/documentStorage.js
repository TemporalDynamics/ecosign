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

  // Create user_documents record
  const { data: docData, error: docError } = await supabase
    .from('user_documents')
    .insert({
      user_id: user.id,
      document_name: pdfFile.name,
      document_hash: documentHash,
      document_size: pdfFile.size,
      mime_type: pdfFile.type || 'application/pdf',
      pdf_storage_path: uploadData.path,
      eco_data: ecoData,
      signnow_document_id: signNowDocumentId,
      signnow_status: signNowStatus,
      signed_at: signedAt,
      has_legal_timestamp: hasLegalTimestamp,
      has_bitcoin_anchor: hasBitcoinAnchor,
      bitcoin_anchor_id: bitcoinAnchorId,
      tags,
      notes
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

  const { data, error } = await supabase
    .from('user_documents')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching documents:', error);
    throw new Error(`Error al obtener documentos: ${error.message}`);
  }

  return data || [];
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

  // First get the document to find its storage path
  const { data: doc, error: fetchError } = await supabase
    .from('user_documents')
    .select('pdf_storage_path')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .single();

  if (fetchError) {
    throw new Error(`Error al obtener el documento: ${fetchError.message}`);
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('user-documents')
    .remove([doc.pdf_storage_path]);

  if (storageError) {
    console.warn('Error deleting from storage:', storageError);
    // Continue anyway - DB cleanup is more important
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
