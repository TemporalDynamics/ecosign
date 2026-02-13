/**
 * Document Sharing with OTP
 * 
 * Share encrypted documents securely using one-time passwords.
 */

import { getSupabase } from '../supabaseClient';
import {
  generateOTP,
  deriveKeyFromOTP,
  hashOTP,
  randomBytes,
  bytesToHex,
  hexToBytes,
  unwrapDocumentKey,
  wrapDocumentKey,
  getSessionUnwrapKey,
  decryptFile,
  isSessionInitialized,
} from '../e2e';
import { SHARE_CONFIG } from '../e2e/constants';

export interface ShareDocumentOptions {
  documentId: string;
  recipientEmail: string;
  expiresInDays?: number;
  message?: string;
  ndaEnabled?: boolean;
  ndaText?: string;
  pdfStoragePath?: string | null;
}

export interface ShareDocumentResult {
  shareId: string;
  otp: string;
  shareUrl: string;
  expiresAt: string;
}

/**
 * Share an encrypted document with OTP
 * 
 * @param options - Share options
 * @returns Share result with OTP and URL
 */
export async function shareDocument(
  options: ShareDocumentOptions
): Promise<ShareDocumentResult> {
  const {
    documentId,
    recipientEmail,
    expiresInDays = SHARE_CONFIG.DEFAULT_EXPIRATION_DAYS,
    message,
    ndaEnabled = false,
    ndaText,
    pdfStoragePath,
  } = options;

  const supabase = getSupabase();

  try {
    if (!isSessionInitialized()) {
      throw new Error('Session crypto not initialized. Please log in again.');
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Access denied');
    }

    // 1. Resolve shareable user_documents row.
    // NOTE: DocumentsPage can provide document_entities ids; sharing still needs legacy
    // user_documents for wrapped_key/encrypted_path.
    const preferredPath = await resolvePreferredSharePath(supabase, documentId, pdfStoragePath, user.id);
    const doc = await resolveShareableUserDocument(supabase, documentId, preferredPath, user.id);
    if (!doc) {
      throw new Error('share_source_unavailable');
    }

    if (!doc.encrypted) {
      throw new Error('Can only share encrypted documents with OTP');
    }

    // Verify user owns the document
    if (doc.user_id !== user.id) {
      throw new Error('Access denied');
    }

    // 2. Unwrap document key with owner's session key
    console.log('🔓 Attempting to unwrap document key...');
    console.log('  - Document ID:', documentId);
    console.log('  - Has wrapped_key:', !!doc.wrapped_key);
    console.log('  - Has wrap_iv:', !!doc.wrap_iv);

    if (!doc.wrapped_key || !doc.wrap_iv) {
      throw new Error('Este documento no tiene cifrado E2E. No se puede compartir con OTP.');
    }

    const sessionUnwrapKey = getSessionUnwrapKey();
    console.log('  - Session unwrap key obtained');

    const documentKey = await unwrapDocumentKey(
      doc.wrapped_key,
      doc.wrap_iv,
      sessionUnwrapKey
    );
    console.log('✅ Document key unwrapped successfully');

    // 3. Generate OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);

    // 4. Derive recipient key from OTP
    const recipientSalt = randomBytes(16);
    const recipientKey = await deriveKeyFromOTP(otp, recipientSalt);

    // 5. Re-wrap document key with recipient key
    const { wrappedKey, wrapIv } = await wrapDocumentKey(
      documentKey,
      recipientKey
    );

    // 6. Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // 7. Create share record
    const shareId = crypto.randomUUID();
    const resolvedDocumentId = doc.id as string;
    const { error: shareError } = await supabase.from('document_shares').insert({
      id: shareId,
      document_id: resolvedDocumentId,
      // NOTE: Share OTP es un capability; recipient_email no representa identidad.
      // Se mantiene por constraints legacy y trazabilidad interna.
      recipient_email: recipientEmail,
      wrapped_key: wrappedKey,
      wrap_iv: wrapIv,
      recipient_salt: bytesToHex(recipientSalt),
      otp_hash: otpHash,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
      created_by: user.id,
      nda_enabled: ndaEnabled,
      nda_text: ndaEnabled ? ndaText : null,
    });

    if (shareError) {
      throw new Error(`Failed to create share: ${shareError.message}`);
    }

    // 8. Generate share URL
    const appUrl = window.location.origin;
    const shareUrl = `${appUrl}/shared/${shareId}`;

    // Canon (P1): registrar share.created en events[] (best-effort)
    try {
      await supabase.functions.invoke('log-share-event', {
        body: {
          share_id: shareId,
          event_kind: 'share.created',
        },
      })
    } catch (logError) {
      console.warn('⚠️ Failed to log share.created (best-effort):', logError)
    }

    // NOTE: Share con OTP es manual (sin envío de mail) por diseño.

    return {
      shareId,
      otp,
      shareUrl,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    console.error('❌ Share error:', error);
    throw error instanceof Error ? error : new Error('Unknown share error');
  }
}

export interface AccessSharedDocumentOptions {
  shareId: string;
  otp: string;
  recipientEmail: string;
}

/**
 * Access a shared document with OTP
 * 
 * @param options - Access options
 * @returns Decrypted document blob
 */
export async function accessSharedDocument(
  options: AccessSharedDocumentOptions
): Promise<{ blob: Blob; filename: string }> {
  const { shareId, otp, recipientEmail } = options;
  const supabase = getSupabase();

  try {
    // 1. Verify OTP server-side (no direct table access from anon)
    const { data, error } = await supabase.functions.invoke('verify-share-otp', {
      body: {
        share_id: shareId,
        otp,
      }
    })

    if (error || !data?.success) {
      throw new Error(data?.error || error?.message || 'Invalid or expired OTP')
    }

    // 2. Derive recipient key from OTP
    const recipientSalt = hexToBytes(data.recipient_salt);
    const recipientKey = await deriveKeyFromOTP(otp, recipientSalt);

    // 3. Unwrap document key
    const documentKey = await unwrapDocumentKey(
      data.wrapped_key,
      data.wrap_iv,
      recipientKey
    );

    // 4. Download encrypted file via signed URL
    const response = await fetch(data.encrypted_signed_url)
    if (!response.ok) {
      throw new Error('Failed to download file')
    }
    const encryptedBlob = await response.blob()

    // 5. Decrypt file
    const decryptedBlob = await decryptFile(encryptedBlob, documentKey);

    return {
      blob: decryptedBlob,
      filename: data.document_name,
    };
  } catch (error) {
    console.error('❌ Access error:', error);
    throw error instanceof Error ? error : new Error('Unknown access error');
  }
}

/**
 * List shares for a document
 * 
 * @param documentId - Document ID
 * @returns List of shares
 */
export async function listDocumentShares(documentId: string, pdfStoragePath?: string | null) {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const preferredPath = await resolvePreferredSharePath(
    supabase,
    documentId,
    pdfStoragePath,
    user?.id
  );
  const resolvedDoc = await resolveShareableUserDocument(
    supabase,
    documentId,
    preferredPath,
    user?.id
  );
  const resolvedDocumentId = resolvedDoc?.id ?? documentId;

  const { data, error } = await supabase
    .from('document_shares')
    .select('id, recipient_email, status, expires_at, accessed_at, created_at, nda_enabled, nda_text')
    .eq('document_id', resolvedDocumentId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list shares: ${error.message}`);
  }

  return data || [];
}

async function resolveShareableUserDocument(
  supabase: ReturnType<typeof getSupabase>,
  documentId: string,
  pdfStoragePath?: string | null,
  ownerUserId?: string
): Promise<{
  id: string;
  document_entity_id?: string | null;
  document_name?: string | null;
  encrypted?: boolean | null;
  wrapped_key?: string | null;
  wrap_iv?: string | null;
  user_id?: string | null;
} | null> {
  const selectCols = 'id, document_entity_id, document_name, encrypted, wrapped_key, wrap_iv, user_id';
  const queryFirst = async (
    column: 'id' | 'document_entity_id' | 'pdf_storage_path' | 'encrypted_path',
    value: string
  ) => {
    let query = supabase
      .from('user_documents')
      .select(selectCols)
      .eq(column, value)
      .limit(1);

    if (ownerUserId) {
      query = query.eq('user_id', ownerUserId);
    }

    const { data, error } = await query;
    return {
      row: (data && data.length > 0 ? data[0] : null) as {
        id: string;
        document_entity_id?: string | null;
        document_name?: string | null;
        encrypted?: boolean | null;
        wrapped_key?: string | null;
        wrap_iv?: string | null;
        user_id?: string | null;
      } | null,
      error
    };
  };

  const lookups: Promise<{ row: any | null; error: any }>[] = [
    queryFirst('id', documentId),
    queryFirst('document_entity_id', documentId),
  ];

  if (pdfStoragePath) {
    lookups.push(queryFirst('pdf_storage_path', pdfStoragePath));
    lookups.push(queryFirst('encrypted_path', pdfStoragePath));
  }

  const [byId, byEntity, byPdfPath, byEncryptedPath] = await Promise.all(lookups);

  if (byId?.row) return byId.row;
  if (byEntity?.row) return byEntity.row;
  if (byPdfPath?.row) return byPdfPath.row;
  if (byEncryptedPath?.row) return byEncryptedPath.row;

  console.error('Share: user_document not found', {
    documentId,
    ownerUserId: ownerUserId ?? null,
    pdfStoragePath: pdfStoragePath ?? null,
    byIdError: byId?.error ?? null,
    byEntityError: byEntity?.error ?? null,
    byPdfPathError: byPdfPath?.error ?? null,
    byEncryptedPathError: byEncryptedPath?.error ?? null,
  });
  return null;
}

async function resolvePreferredSharePath(
  supabase: ReturnType<typeof getSupabase>,
  documentId: string,
  fallbackPath?: string | null,
  ownerUserId?: string
): Promise<string | null> {
  try {
    let query = supabase
      .from('document_entities')
      .select('id, owner_id, witness_current_storage_path, source_storage_path')
      .eq('id', documentId)
      .limit(1);

    if (ownerUserId) {
      query = query.eq('owner_id', ownerUserId);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      const entity = data[0] as {
        witness_current_storage_path?: string | null;
        source_storage_path?: string | null;
      };

      const canonicalPath =
        entity.witness_current_storage_path ||
        fallbackPath ||
        entity.source_storage_path ||
        null;

      return canonicalPath;
    }
  } catch (error) {
    console.warn('Share: failed to resolve preferred path from document_entities', error);
  }

  return fallbackPath ?? null;
}

/**
 * Revoke a share (mark as expired)
 * 
 * @param shareId - Share ID
 */
export async function revokeShare(shareId: string): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('document_shares')
    .update({ status: 'expired' })
    .eq('id', shareId);

  if (error) {
    throw new Error(`Failed to revoke share: ${error.message}`);
  }
}
