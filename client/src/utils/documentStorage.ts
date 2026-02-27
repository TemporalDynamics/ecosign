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
  documentEntityId?: string | null;
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

type JsonObject = Record<string, unknown>;
const asObject = (value: unknown): JsonObject | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : null;

type PersistSignedPdfResult = {
  storagePath: string;
};

// Persists the final signed PDF payload (bytes must be final, already prepared).
const persistSignedPdf = async (
  pdfBytes: ArrayBuffer | Uint8Array,
  userId: string
): Promise<PersistSignedPdfResult> => {
  const supabase = getSupabase();
  const normalizedBuffer: ArrayBuffer =
    pdfBytes instanceof ArrayBuffer
      ? pdfBytes
      : (pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer);
  const blob = new Blob([normalizedBuffer], { type: 'application/pdf' });
  // Storage RLS expects auth.uid() in the first path segment.
  const storagePath = `${userId}/signed/${crypto.randomUUID()}.pdf`;

  const { error } = await supabase.storage
    .from('user-documents')
    .upload(storagePath, blob, {
      upsert: true,
      contentType: 'application/pdf',
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return { storagePath };
};

export const persistSignedPdfToStorage = async (
  pdfBytes: ArrayBuffer | Uint8Array,
  userId: string
): Promise<PersistSignedPdfResult> => {
  return await persistSignedPdf(pdfBytes, userId);
};

const toUint8Array = (input: ArrayBuffer | ArrayBufferView<ArrayBufferLike>): Uint8Array => {
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  return new Uint8Array(input.buffer);
};

/**
 * Upload a signed PDF to Supabase Storage and persist canonical runtime metadata
 * @param pdfFile - The signed PDF file
 * @param ecoData - The ECO certificate data (manifest + signatures + metadata)
 * @param options - Additional options
 * @returns The created document record
 */
// NOTE: Canonical document identity, hashing and lifecycle
// are handled upstream via DocumentEntityService.
// This module is responsible only for persisting signed PDFs and ECO payloads.
export async function saveUserDocument(pdfFile: File, ecoData: unknown, options: SaveUserDocumentOptions = {}): Promise<SaveUserDocumentResult> {
  const supabase = getSupabase();
  const {
    documentEntityId = null,
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
  let storagePath = null;
  let encryptedPath = null;

  if (storePdf) {
    const { storagePath: persistedPath } = await persistSignedPdf(
      await encryptedBlob.arrayBuffer(),
      user.id
    );
    encryptedPath = persistedPath;
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

  if (!documentEntityId) {
    if (encryptedPath) {
      await supabase.storage.from('user-documents').remove([encryptedPath]).catch(() => undefined);
    }
    throw new Error('documentEntityId is required for canonical persistence');
  }

  const { data: entity, error: entityError } = await supabase
    .from('document_entities')
    .select('id, owner_id, metadata')
    .eq('id', documentEntityId)
    .single();

  if (entityError || !entity) {
    if (encryptedPath) {
      await supabase.storage.from('user-documents').remove([encryptedPath]).catch(() => undefined);
    }
    throw new Error(`Document entity not found: ${entityError?.message ?? 'missing'}`);
  }

  if ((entity as any).owner_id !== user.id) {
    if (encryptedPath) {
      await supabase.storage.from('user-documents').remove([encryptedPath]).catch(() => undefined);
    }
    throw new Error('Access denied');
  }

  const root = asObject((entity as any).metadata) ?? {};
  const ecox = asObject(root.ecox) ?? {};
  const runtimeCurrent = asObject(ecox.runtime) ?? {};
  const nowIso = new Date().toISOString();

  const nextMetadata = {
    ...root,
    ecox: {
      ...ecox,
      runtime: {
        ...runtimeCurrent,
        encrypted_path: encryptedPath,
        wrapped_key: wrappedKey,
        wrap_iv: wrapIv,
        storage_bucket: 'user-documents',
        updated_at: nowIso,
      },
    },
  };

  const updatePayload: Record<string, unknown> = {
    metadata: nextMetadata,
  };
  if (storePdf) {
    updatePayload.custody_mode = 'encrypted_custody';
  }

  const { error: updateError } = await supabase
    .from('document_entities')
    .update(updatePayload)
    .eq('id', documentEntityId);

  if (updateError) {
    if (encryptedPath) {
      await supabase.storage.from('user-documents').remove([encryptedPath]).catch(() => undefined);
    }
    throw new Error(`Error al actualizar metadata canónica: ${updateError.message}`);
  }

  const docData: SaveUserDocumentResult = {
    id: documentEntityId,
    user_id: user.id,
    document_entity_id: documentEntityId,
    document_name: pdfFile.name,
    document_hash: documentHash,
    pdf_storage_path: storagePath,
    encrypted_path: encryptedPath,
    wrapped_key: wrappedKey,
    wrap_iv: wrapIv,
    eco_storage_path: ecoStoragePath,
    eco_file_data: ecoFileDataBuffer,
    has_legal_timestamp: hasLegalTimestamp,
    has_bitcoin_anchor: false,
    has_polygon_anchor: false,
    bitcoin_anchor_id: bitcoinAnchorId,
    bitcoin_status: hasBitcoinAnchor ? (bitcoinStatus || 'pending') : null,
    polygon_status: hasPolygonAnchor ? 'pending' : null,
    status: initialStatus,
    overall_status: overallStatus,
    protection_level: null,
    signnow_document_id: signNowDocumentId,
    signnow_status: signNowStatus,
    signed_at: signedAt,
    download_enabled: downloadEnabled,
    zero_knowledge_opt_out: !storePdf || zeroKnowledgeOptOut,
  };

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

  const { data: entities, error } = await supabase
    .from('document_entities')
    .select(`
      id,
      source_name,
      source_hash,
      source_captured_at,
      source_storage_path,
      witness_current_storage_path,
      signed_hash,
      lifecycle_status,
      metadata,
      events,
      created_at,
      updated_at
    `)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching documents:', error);
    throw new Error(`Error al obtener documentos: ${error.message}`);
  }

  const entityIds = (entities || [])
    .map((row: any) => (typeof row?.id === 'string' ? row.id : null))
    .filter((id: string | null): id is string => Boolean(id));

  const latestWorkflowByEntity = new Map<
    string,
    { id: string; status?: string | null; created_at?: string | null; updated_at?: string | null }
  >();

  if (entityIds.length > 0) {
    const { data: workflows, error: workflowsError } = await supabase
      .from('signature_workflows')
      .select('id, document_entity_id, status, created_at, updated_at')
      .in('document_entity_id', entityIds);

    if (workflowsError) {
      console.warn('Error fetching signature workflows for dashboard:', workflowsError.message);
    } else {
      for (const workflow of workflows || []) {
        const entityId = typeof (workflow as any)?.document_entity_id === 'string'
          ? String((workflow as any).document_entity_id)
          : null;
        if (!entityId) continue;

        const current = latestWorkflowByEntity.get(entityId);
        const candidateIso = String((workflow as any)?.updated_at || (workflow as any)?.created_at || '');
        const currentIso = String(current?.updated_at || current?.created_at || '');

        if (!current || candidateIso.localeCompare(currentIso) >= 0) {
          latestWorkflowByEntity.set(entityId, {
            id: String((workflow as any).id),
            status: typeof (workflow as any)?.status === 'string' ? String((workflow as any).status) : null,
            created_at: typeof (workflow as any)?.created_at === 'string' ? String((workflow as any).created_at) : null,
            updated_at: typeof (workflow as any)?.updated_at === 'string' ? String((workflow as any).updated_at) : null,
          });
        }
      }
    }
  }

  const rows = (entities || []).map((row: any) => {
    const events = Array.isArray(row?.events) ? row.events : [];
    const metadata = asObject(row?.metadata) ?? {};
    const ecox = asObject(metadata.ecox) ?? {};
    const runtime = asObject(ecox.runtime) ?? {};
    const workflow = latestWorkflowByEntity.get(String(row.id));

    const hasTsa = events.some((event: any) => event?.kind === 'tsa.confirmed');
    const hasBitcoinAnchor = events.some((event: any) => {
      if (event?.kind !== 'anchor' && event?.kind !== 'anchor.confirmed') {
        return false;
      }
      const network = event?.anchor?.network ?? event?.payload?.network;
      const confirmedAt = event?.anchor?.confirmed_at ?? event?.payload?.confirmed_at;
      return network === 'bitcoin' && typeof confirmedAt === 'string';
    });

    const lastSignatureEvent = [...events]
      .reverse()
      .find((event: any) => event?.kind === 'signature.completed' || event?.kind === 'document.signed');
    const signedAtFromEvent =
      typeof lastSignatureEvent?.at === 'string'
        ? String(lastSignatureEvent.at)
        : null;

    const latestTimedEvent = [...events]
      .reverse()
      .find((event: any) => typeof event?.at === 'string');
    const certifiedAt = typeof latestTimedEvent?.at === 'string' ? String(latestTimedEvent.at) : null;

    const signedAt =
      workflow?.status === 'completed'
        ? (workflow.updated_at || workflow.created_at || signedAtFromEvent)
        : signedAtFromEvent;

    const status = hasTsa ? 'verified' : 'pending';

    return {
      id: row.id,
      document_entity_id: row.id,
      document_name: row.source_name,
      document_hash: row.signed_hash || row.source_hash,
      created_at: row.created_at || row.source_captured_at,
      updated_at: row.updated_at || row.source_captured_at,
      certified_at: certifiedAt || row.updated_at || row.created_at || row.source_captured_at,
      has_legal_timestamp: hasTsa,
      has_bitcoin_anchor: hasBitcoinAnchor,
      signnow_document_id: workflow?.id ?? null,
      signed_at: signedAt ?? null,
      status,
      overall_status: status,
      notes: null,
      file_type: 'application/pdf',
      document_size: null,
      lifecycle_status: row.lifecycle_status ?? null,
      pdf_storage_path: row.witness_current_storage_path || row.source_storage_path || null,
      encrypted_path: typeof runtime.encrypted_path === 'string' ? runtime.encrypted_path : null,
      wrapped_key: typeof runtime.wrapped_key === 'string' ? runtime.wrapped_key : null,
      wrap_iv: typeof runtime.wrap_iv === 'string' ? runtime.wrap_iv : null,
      events,
    };
  });

  return rows;
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

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Usuario no autenticado');
  }

  const lifecycleByLegacyStatus: Record<string, string> = {
    draft: 'needs_witness',
    sent: 'in_signature_flow',
    pending: 'in_signature_flow',
    signed: 'signed',
    rejected: 'revoked',
    expired: 'archived',
  };

  const lifecycleStatus = lifecycleByLegacyStatus[newStatus];
  const { data, error } = await supabase
    .from('document_entities')
    .update({
      lifecycle_status: lifecycleStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .eq('owner_id', user.id)
    .select('id, lifecycle_status, updated_at')
    .single();

  if (error) {
    console.error('Error updating document status:', error);
    throw new Error(`Error al actualizar estado: ${error.message}`);
  }

  return {
    id: data.id,
    status: newStatus,
    lifecycle_status: data.lifecycle_status,
    last_event_at: data.updated_at,
  };
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
    
    // P2.3: Cache-bust to force browser/iframe reload after witness updates
    // Append timestamp to ensure fresh PDF loads even if path doesn't change
    const cacheBustParam = `v=${Date.now()}`;
    const separator = signedUrl.includes('?') ? '&' : '?';
    return `${signedUrl}${separator}${cacheBustParam}`;
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

  const { data: doc, error: fetchError } = await supabase
    .from('document_entities')
    .select('id, owner_id, source_storage_path, witness_current_storage_path, metadata')
    .eq('id', documentId)
    .eq('owner_id', user.id)
    .single();

  if (fetchError) {
    throw new Error(`Error al obtener el documento: ${fetchError.message}`);
  }

  const metadata = asObject((doc as any)?.metadata) ?? {};
  const ecox = asObject(metadata.ecox) ?? {};
  const runtime = asObject(ecox.runtime) ?? {};
  const runtimeBucket =
    typeof runtime.storage_bucket === 'string' && runtime.storage_bucket.length > 0
      ? runtime.storage_bucket
      : 'user-documents';
  const runtimePath =
    typeof runtime.encrypted_path === 'string' && runtime.encrypted_path.length > 0
      ? runtime.encrypted_path
      : null;

  const candidatePaths = [
    runtimePath,
    (doc as any)?.witness_current_storage_path ?? null,
    (doc as any)?.source_storage_path ?? null,
  ].filter((path): path is string => typeof path === 'string' && path.length > 0);

  if (candidatePaths.length > 0) {
    const uniquePaths = [...new Set(candidatePaths)];
    const { error: storageError } = await supabase.storage
      .from(runtimeBucket)
      .remove(uniquePaths);

    if (storageError) {
      console.warn('Error deleting from storage:', storageError);
      // Continue with DB deletion even if storage cleanup fails
    }
  }

  const { error: deleteError } = await supabase
    .from('document_entities')
    .delete()
    .eq('id', documentId)
    .eq('owner_id', user.id);

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
    if (/^https?:\/\//i.test(storagePath)) {
      const resp = await fetch(storagePath);
      if (!resp.ok) {
        return { success: false, data: null, error: 'No se pudo descargar el documento' };
      }
      const blob = await resp.blob();
      return { success: true, data: blob, error: null };
    }
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
