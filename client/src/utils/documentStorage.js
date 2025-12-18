// client/src/utils/documentStorage.js
/**
 * Utilities for storing certified documents in Supabase
 */

import { getSupabase } from '../lib/supabaseClient';

/**
 * Upload a signed PDF to Supabase Storage and create a user_documents record
 * @param {File} pdfFile - The signed PDF file
 * @param {Object} ecoData - The ECO certificate data (manifest + signatures + metadata)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} The created document record
 */
export async function saveUserDocument(pdfFile, ecoData, options = {}) {
  const supabase = getSupabase();
  const {
    signNowDocumentId = null,
    signNowStatus = null,
    signedAt = null,
    hasLegalTimestamp = false,
    hasPolygonAnchor = false,
    hasBitcoinAnchor = false,
    bitcoinAnchorId = null,
    bitcoinStatus = null,
    overallStatus = 'draft',
    downloadEnabled = true,
    ecoFileData = null,
    tags = [],
    notes = null,
    initialStatus = 'draft',
    storePdf = true,
    zeroKnowledgeOptOut = false
  } = options;

  // Normalize optional eco_file_data payload (bytea expects binary)
  let ecoFileDataBuffer = null;
  if (ecoFileData) {
    try {
      ecoFileDataBuffer = ecoFileData instanceof Uint8Array
        ? ecoFileData
        : new Uint8Array(ecoFileData.buffer || ecoFileData);
    } catch (e) {
      console.warn('Unable to normalize ecoFileData, skipping storage', e);
    }
  }

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

  // Upload PDF to Supabase Storage (optional for zero-knowledge)
  let uploadData = null;
  let uploadError = null;
  let storagePath = null;

  if (storePdf) {
    const fileName = `${user.id}/${Date.now()}-${pdfFile.name}`;
    const uploadResult = await supabase.storage
      .from('user-documents')
      .upload(fileName, pdfFile, {
        contentType: pdfFile.type || 'application/pdf',
        upsert: false
      });
    uploadData = uploadResult.data;
    uploadError = uploadResult.error;

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError);
      throw new Error(`Error al subir el documento: ${uploadError.message}`);
    }
    storagePath = uploadData.path;
  }

  // Determine file type from MIME type
  const getFileType = (mimeType) => {
    if (!mimeType) return 'pdf';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'docx';
    if (mimeType.includes('image')) return 'img';
    return 'pdf';
  };

  // Create record in 'user_documents' table
  const { data: docData, error: docError} = await supabase
    .from('user_documents')
    .insert({
      user_id: user.id,
      document_name: pdfFile.name,
      document_hash: documentHash,
      document_size: pdfFile.size,
      mime_type: pdfFile.type || 'application/pdf',
      pdf_storage_path: storagePath,
      eco_data: ecoData, // Store the complete ECO manifest
      status: initialStatus, // Use the provided initial status
      overall_status: overallStatus, // Combined status (signatures + anchoring)
      bitcoin_status: bitcoinStatus, // Bitcoin anchoring status (pending/confirmed)
      bitcoin_anchor_id: bitcoinAnchorId,
      download_enabled: downloadEnabled, // Controls if .eco can be downloaded
      eco_file_data: ecoFileDataBuffer, // Store .eco buffer for deferred download
      file_type: getFileType(pdfFile.type),
      last_event_at: new Date().toISOString(),
      has_legal_timestamp: hasLegalTimestamp,
      has_bitcoin_anchor: hasBitcoinAnchor,
      signnow_document_id: signNowDocumentId,
      signnow_status: signNowStatus,
      signed_at: signedAt,
      eco_hash: documentHash,
      zero_knowledge_opt_out: !storePdf || zeroKnowledgeOptOut,
      has_polygon_anchor: hasPolygonAnchor
    })
    .select()
    .single();

  if (docError) {
    // If DB insert fails, try to clean up the uploaded file
    if (storagePath) {
      await supabase.storage.from('user-documents').remove([storagePath]);
    }
    console.error('Error creating document record:', docError);
    throw new Error(`Error al guardar el registro: ${docError.message}`);
  }

  // Update the anchor with the user_document_id (for bidirectional linking)
  if (bitcoinAnchorId && docData.id) {
    const { error: anchorUpdateError } = await supabase
      .from('anchors')
      .update({ user_document_id: docData.id })
      .eq('id', bitcoinAnchorId);

    if (anchorUpdateError) {
      console.warn('Failed to link anchor to user_document:', anchorUpdateError);
      // Don't throw - the document was saved successfully
    } else {
      console.log(`✅ Linked anchor ${bitcoinAnchorId} to user_document ${docData.id}`);
    }
  }

  return docData;
}

/**
 * Get all documents for the current user with complete information
 * @returns {Promise<Array>} Array of user documents with all fields
 */
export async function getUserDocuments() {
  const supabase = getSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Usuario no autenticado');
  }

  // Query user_documents table with only essential related data to reduce payload
  const { data, error } = await supabase
    .from('user_documents')
    .select(`
      id,
      document_name,
      document_hash,
      created_at,
      updated_at,
      certified_at,
      has_legal_timestamp,
      has_bitcoin_anchor,
      signnow_document_id,
      signed_at,
      status,
      overall_status,
      notes,
      file_type,
      document_size
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching documents:', error);
    throw new Error(`Error al obtener documentos: ${error.message}`);
  }

  // Return all fields (no transformation needed - DocumentsPage expects full data)
  return data || [];
}

/**
 * Update document status
 * @param {string} documentId - The document ID
 * @param {string} newStatus - The new status ('draft', 'sent', 'pending', 'signed', 'rejected', 'expired')
 * @returns {Promise<Object>} Updated document
 */
export async function updateDocumentStatus(documentId, newStatus) {
  const supabase = getSupabase();
  const validStatuses = ['draft', 'sent', 'pending', 'signed', 'rejected', 'expired'];
  
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  const { data, error } = await supabase
    .from('user_documents')
    .update({
      status: newStatus,
      last_event_at: new Date().toISOString()
    })
    .eq('id', documentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating document status:', error);
    throw new Error(`Error al actualizar estado: ${error.message}`);
  }

  return data;
}

/**
 * Get a signed URL for downloading a document
 * @param {string} storagePath - The storage path of the document
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} The signed URL
 */
export async function getDocumentDownloadUrl(storagePath, expiresIn = 3600) {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from('user-documents')
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    console.error('Error creating signed URL:', error);
    throw new Error(`Error al generar URL de descarga: ${error.message}`);
  }

  return data.signedUrl;
}

// Signed URL helper (frontend-only fallback)
// Matches the TS version so bundlers find the export.
export async function getSignedDocumentUrl(path, expiresIn = 3600) {
  const supabase = getSupabase();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('No session available');
      return null;
    }

    // Use edge function to bypass RLS if needed
    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/get-signed-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ path, bucket: 'user-documents', expiresIn })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error creating signed URL:', error);
      return null;
    }

    const { signedUrl } = await response.json();
    return signedUrl;
  } catch (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }
}

/**
 * Delete a user document (both storage and DB record)
 * @param {string} documentId - The document ID
 * @returns {Promise<void>}
 */
export async function deleteUserDocument(documentId) {
  const supabase = getSupabase();
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

/**
 * Download a document from Supabase Storage
 * @param {string} storagePath - The storage path of the document
 * @returns {Promise<{ success: boolean, data: Blob | null, error: string | null }>}
 */
export async function downloadDocument(storagePath) {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase.storage
      .from('user-documents')
      .download(storagePath);

    if (error) {
      console.error('Error downloading file:', error);
      return { success: false, data: null, error: error.message };
    }

    return { success: true, data: data, error: null };
  } catch (err) {
    console.error('Unexpected error during download:', err);
    return { success: false, data: null, error: err.message };
  }
}
