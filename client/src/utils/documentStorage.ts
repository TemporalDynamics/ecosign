// client/src/utils/documentStorage.ts
/**
 * Utilities for storing certified documents in Supabase
 */

import { getSupabase } from '../lib/supabaseClient';
import {
  generateDocumentKey,
  encryptFile,
  wrapDocumentKey,
  getSessionUnwrapKey,
  isSessionInitialized,
  initializeSessionCrypto,
  bytesToBase64,
  bytesToHex
} from '../lib/e2e';
import { hashSigned } from '../lib/canonicalHashing';

/**
 * Sanitiza un nombre de archivo para usarlo como key en Supabase Storage
 * Remueve espacios, caracteres especiales y asegura compatibilidad
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/\s+/g, '_')           // Espacios → guiones bajos
    .replace(/[^a-zA-Z0-9._-]/g, '') // Solo alfanuméricos, punto, guión bajo, guión
    .replace(/_{2,}/g, '_')          // Múltiples guiones bajos → uno solo
    .toLowerCase();                  // Minúsculas para consistencia
}

type SaveUserDocumentOptions = {
  signNowDocumentId?: string | null;
  signNowStatus?: string | null;
  signedAt?: string | null;
  hasLegalTimestamp?: boolean;
  hasPolygonAnchor?: boolean;
  hasBitcoinAnchor?: boolean;
  bitcoinAnchorId?: string | null;
  bitcoinStatus?: string | null;
  overallStatus?: string;
  downloadEnabled?: boolean;
  ecoFileData?: ArrayBufferView | ArrayBuffer | null;
  tags?: string[];
  notes?: string | null;
  initialStatus?: string;
  storePdf?: boolean;
  zeroKnowledgeOptOut?: boolean;
  ecoBuffer?: ArrayBufferView | ArrayBuffer | null;
  ecoFileName?: string | null;
  ecoStoragePath?: string | null;
  storeEco?: boolean;
};

type SaveUserDocumentResult = Record<string, unknown> & {
  id: string;
  pdf_storage_path?: string | null;
  eco_storage_path?: string | null;
  document_hash?: string;
};

type DownloadResult = {
  success: boolean;
  data: Blob | null;
  error: string | null;
};

const toUint8Array = (input: ArrayBuffer | ArrayBufferView<ArrayBufferLike>): Uint8Array => {
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  return new Uint8Array(input.buffer);
};

/**
 * Upload a signed PDF to Supabase Storage and create a user_documents record
 * @param pdfFile - The signed PDF file
 * @param ecoData - The ECO certificate data (manifest + signatures + metadata)
 * @param options - Additional options
 * @returns The created document record
 */
export async function saveUserDocument(pdfFile: File, ecoData: unknown, options: SaveUserDocumentOptions = {}): Promise<SaveUserDocumentResult> {
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
    zeroKnowledgeOptOut = false,
    ecoBuffer = null,
    ecoFileName = pdfFile?.name ? pdfFile.name.replace(/\.[^/.]+$/, '.eco') : `certificate-${Date.now()}.eco`,
    ecoStoragePath: forcedEcoStoragePath = null,
    storeEco = true
  } = options;

  // Normalize optional eco_file_data payload (bytea expects binary)
  let ecoFileDataBuffer = null;
  if (ecoFileData) {
    try {
      const normalized = ecoFileData instanceof Uint8Array ? ecoFileData : toUint8Array(ecoFileData);
      ecoFileDataBuffer = normalized;
    } catch (e) {
      console.warn('Unable to normalize ecoFileData, skipping storage', e);
    }
  }

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Usuario no autenticado');
  }

  // Generate document hash (of original file, before encryption)
  const arrayBuffer = await pdfFile.arrayBuffer();
  const documentHash = await hashSigned(arrayBuffer);

  // ======================================
  // E2E ENCRYPTION
  // ======================================
  // Initialize session crypto if not already done
  if (!isSessionInitialized()) {
    await initializeSessionCrypto(user.id);
  }

  // Generate document key and encrypt the file
  const documentKey = await generateDocumentKey();
  const encryptedBlob = await encryptFile(pdfFile, documentKey);

  // Wrap document key with session unwrap key
  const sessionUnwrapKey = getSessionUnwrapKey();
  const { wrappedKey, wrapIv } = await wrapDocumentKey(documentKey, sessionUnwrapKey);

  // Upload ENCRYPTED PDF to Supabase Storage
  let uploadData: { path: string } | null = null;
  let uploadError = null;
  let storagePath = null;
  let encryptedPath = null;

  if (storePdf) {
    // Upload encrypted file con nombre sanitizado
    const sanitizedName = sanitizeFileName(pdfFile.name);
    const encryptedFileName = `${user.id}/${Date.now()}-${sanitizedName}.encrypted`;
    const uploadResult = await supabase.storage
      .from('user-documents')
      .upload(encryptedFileName, encryptedBlob, {
        contentType: 'application/octet-stream',
        upsert: false
      });
    uploadData = uploadResult.data;
    uploadError = uploadResult.error;

    if (uploadError) {
      console.error('Error uploading encrypted PDF:', uploadError);
      throw new Error(`Error al subir el documento cifrado: ${uploadError.message}`);
    }
    encryptedPath = uploadData?.path || null;
    // Keep pdf_storage_path null (we don't store plaintext PDF)
    storagePath = null;
  }

  // Upload ECO to Supabase Storage (always, regardless of PDF storage)
  let ecoStoragePath = null;
  let ecoUploadFailed = false;
  if (storeEco) {
    // Prefer the provided buffer, otherwise serialize ecoData
    let ecoBytes: Uint8Array | null = null;
    if (ecoBuffer) {
      try {
        ecoBytes = ecoBuffer instanceof Uint8Array ? ecoBuffer : toUint8Array(ecoBuffer);
      } catch (err) {
        console.warn('Unable to normalize ecoBuffer, will fallback to ecoData', err);
      }
    }
    if (!ecoBytes && ecoData) {
      ecoBytes = new TextEncoder().encode(JSON.stringify(ecoData, null, 2));
    }

    if (!ecoBytes) {
      console.error('❌ No se pudo generar el archivo ECO');
      ecoUploadFailed = true;
      // ✅ HOTFIX: Don't throw - allow certificate to be saved anyway
      // The .eco already exists in memory and in ecoData JSONB column
    } else {
      // Sanitizar nombre del archivo ECO
      const sanitizedFileName = sanitizeFileName(ecoFileName || 'certificate.eco');
      const bytesForBlob = new Uint8Array(ecoBytes);
      const ecoBlob = new Blob([bytesForBlob], { type: 'application/octet-stream' });
      const ecoPath = forcedEcoStoragePath || `${user.id}/${Date.now()}-${sanitizedFileName}`;

      const { data: ecoUploadData, error: ecoUploadError } = await supabase.storage
        .from('user-documents')
        .upload(ecoPath, ecoBlob, {
          contentType: 'application/octet-stream',
          upsert: true
        });

      if (ecoUploadError) {
        console.error('⚠️ Error uploading ECO to Storage (non-fatal):', ecoUploadError);
        ecoUploadFailed = true;
        // ✅ HOTFIX: Don't throw - certificate delivery must never fail
        // The .eco data is preserved in the eco_data JSONB column
        // We can retry upload async or regenerate from eco_data
      } else {
        ecoStoragePath = ecoUploadData?.path || ecoPath;
        console.log('✅ ECO uploaded to Storage:', ecoStoragePath);
      }
    }
  }

  // Determine file type from MIME type
  const getFileType = (mimeType?: string | null) => {
    if (!mimeType) return 'pdf';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'docx';
    if (mimeType.includes('image')) return 'img';
    return 'pdf';
  };

  // ✅ Protection level ALWAYS starts at ACTIVE (TSA confirmed)
  // Level only increases based on CONFIRMED anchors, never on intent
  // - ACTIVE: Certificate created + TSA confirmed
  // - REINFORCED: Polygon anchor CONFIRMED (upgraded by worker)
  // - TOTAL: Bitcoin anchor CONFIRMED (upgraded by worker)
  const protectionLevel = 'ACTIVE';

  // ✅ Set anchor statuses to PENDING when requested
  // Workers will resolve these and upgrade protection_level accordingly
  const polygonStatus = hasPolygonAnchor ? 'pending' : null;
  const bitcoinStatusFinal = hasBitcoinAnchor ? (bitcoinStatus || 'pending') : null;

  // =====================================================
  // FIELD SEPARATION (DO NOT MIX RESPONSIBILITIES)
  // =====================================================
  // overall_status: Document lifecycle state
  //   - Values: draft, sent, pending, signed, rejected, expired, certified
  //   - Purpose: Functional workflow status (signatures, completion)
  //   - Never derive from protection_level
  //
  // protection_level: Probatory hierarchy (NEVER decreases)
  //   - Values: ACTIVE, REINFORCED, TOTAL
  //   - Purpose: Legal/cryptographic strength of evidence
  //   - Only increases based on CONFIRMED blockchain anchors
  //   - Never derive from overall_status
  // =====================================================

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
      // E2E Encryption fields
      encrypted: true,
      encrypted_path: encryptedPath,
      wrapped_key: wrappedKey, // Already base64 from wrapDocumentKey
      wrap_iv: wrapIv, // Already hex from wrapDocumentKey
      eco_data: ecoData, // Store the complete ECO manifest
      status: initialStatus, // Signature workflow status
      overall_status: overallStatus, // Document lifecycle state
      protection_level: protectionLevel, // Probatory hierarchy (ACTIVE/REINFORCED/TOTAL)
      polygon_status: polygonStatus, // Polygon anchor state (null/pending/confirmed/failed)
      bitcoin_status: bitcoinStatusFinal, // Bitcoin anchor state (null/pending/confirmed/failed)
      bitcoin_anchor_id: bitcoinAnchorId,
      download_enabled: downloadEnabled, // Controls if .eco can be downloaded
      eco_file_data: ecoFileDataBuffer, // Store .eco buffer for deferred download
      eco_storage_path: ecoStoragePath, // Path to ECO in storage (null if upload failed)
      file_type: getFileType(pdfFile.type),
      last_event_at: new Date().toISOString(),
      has_legal_timestamp: hasLegalTimestamp,
      // ✅ VERDAD CONSERVADORA: Never set anchor flags optimistically
      // Workers will set these to true ONLY when blockchain confirms
      has_bitcoin_anchor: false,  // Will be set by process-bitcoin-anchors worker
      has_polygon_anchor: false,  // Will be set by process-polygon-anchors worker
      signnow_document_id: signNowDocumentId,
      signnow_status: signNowStatus,
      signed_at: signedAt,
      eco_hash: documentHash,
      zero_knowledge_opt_out: !storePdf || zeroKnowledgeOptOut
    })
    .select()
    .single();

  if (docError) {
    // If DB insert fails, try to clean up the uploaded encrypted file
    if (encryptedPath) {
      await supabase.storage.from('user-documents').remove([encryptedPath]);
    }
    console.error('Error creating document record:', docError);
    throw new Error(`Error al guardar el registro: ${docError.message}`);
  }

  // ✅ BLOCKCHAIN ANCHORING: Server-Side Driven (Database Trigger)
  // 
  // Los anchors de Polygon y Bitcoin NO se invocan desde el cliente.
  // El cliente solo guarda el documento con polygon_status='pending' y bitcoin_status='pending'.
  // Un database trigger detecta el INSERT y dispara las edge functions automáticamente.
  // 
  // Esto evita:
  // - Errores HTTP 500 en consola del usuario
  // - Dependencia de que el cliente permanezca conectado
  // - Race conditions y timeouts que afectan UX
  // - Logs rojos confusos durante la certificación
  // 
  // El documento YA tiene validez probatoria con TSA.
  // Polygon y Bitcoin son blindajes progresivos server-side.
  // 
  // Ver: supabase/migrations/YYYYMMDD_blockchain_anchoring_trigger.sql

  return docData;
}

/**
 * Get all documents for the current user with complete information
 * @returns Array of user documents with all fields
 */
export async function getUserDocuments(): Promise<any[]> {
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
 * @param documentId - The document ID
 * @param newStatus - The new status ('draft', 'sent', 'pending', 'signed', 'rejected', 'expired')
 * @returns Updated document
 */
export async function updateDocumentStatus(documentId: string, newStatus: string) {
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
 * @param storagePath - The storage path of the document
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns The signed URL
 */
export async function getDocumentDownloadUrl(storagePath: string, expiresIn = 3600): Promise<string> {
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
export async function getSignedDocumentUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const supabase = getSupabase();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('No session available');
      return null;
    }

    // Use edge function to bypass RLS if needed
    const supabaseUrl = (supabase as any).supabaseUrl as string | undefined;
    if (!supabaseUrl) {
      throw new Error('Supabase URL no disponible');
    }
    const response = await fetch(`${supabaseUrl}/functions/v1/get-signed-url`, {
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
 * @param documentId - The document ID
 * @returns void
 */
export async function deleteUserDocument(documentId: string): Promise<void> {
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
 * @param storagePath - The storage path of the document
 * @returns result with blob or error
 */
export async function downloadDocument(storagePath: string): Promise<DownloadResult> {
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
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('Unexpected error during download:', err);
    return { success: false, data: null, error: message };
  }
}
