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

type JsonObject = Record<string, unknown>;

const asObject = (value: unknown): JsonObject | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : null;

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

    // 1. Resolve canonical document runtime from document_entities metadata.
    const preferredPath = await resolvePreferredSharePath(supabase, documentId, pdfStoragePath, user.id);
    const doc = await resolveShareableDocumentRuntime(supabase, documentId, preferredPath, user.id);
    if (!doc) {
      throw new Error('share_source_unavailable');
    }

    if (!doc.document_entity_id) {
      throw new Error('missing_document_entity_id');
    }

    if (!doc.encrypted) {
      throw new Error('Can only share encrypted documents with OTP');
    }

    // Verify user owns the document (legacy-compatible):
    // if user_id is present it must match; if null (historical rows), rely on RLS + entity binding.
    if (doc.user_id && doc.user_id !== user.id) {
      throw new Error('Access denied');
    }

    // Canonical runtime metadata for share/OTP download path (best-effort).
    if (doc.document_entity_id && doc.encrypted_path) {
      await upsertEntityEcoxRuntime(
        supabase,
        doc.document_entity_id,
        {
          encrypted_path: doc.encrypted_path,
          wrapped_key: doc.wrapped_key ?? null,
          wrap_iv: doc.wrap_iv ?? null,
          storage_bucket: 'user-documents',
        },
        user.id,
      );
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
    const { error: shareError } = await supabase.from('document_shares').insert({
      id: shareId,
      document_id: null,
      document_entity_id: doc.document_entity_id,
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
      // Unique pending share per (document_entity_id, recipient_email).
      if (String((shareError as any)?.code ?? '') === '23505') {
        throw new Error('share_pending_exists');
      }
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
  const resolvedDoc = await resolveShareableDocumentRuntime(
    supabase,
    documentId,
    preferredPath,
    user?.id
  );
  const resolvedDocumentEntityId = resolvedDoc?.document_entity_id ?? documentId;

  const { data, error } = await supabase
    .from('document_shares')
    .select('id, recipient_email, status, expires_at, accessed_at, created_at, nda_enabled, nda_text')
    .eq('document_entity_id', resolvedDocumentEntityId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list shares: ${error.message}`);
  }

  return data || [];
}

async function resolveShareableDocumentRuntime(
  supabase: ReturnType<typeof getSupabase>,
  documentId: string,
  pdfStoragePath?: string | null,
  ownerUserId?: string
): Promise<{
  id: string;
  document_entity_id?: string | null;
  document_name?: string | null;
  encrypted?: boolean | null;
  encrypted_path?: string | null;
  wrapped_key?: string | null;
  wrap_iv?: string | null;
  user_id?: string | null;
} | null> {
  const fetchEntity = async (entityId: string) => {
    let query = supabase
      .from('document_entities')
      .select('id, owner_id, source_name, metadata, witness_current_storage_path, source_storage_path')
      .eq('id', entityId)
      .limit(1);

    if (ownerUserId) {
      query = query.eq('owner_id', ownerUserId);
    }

    const { data, error } = await query;
    return {
      entity: data && data.length > 0 ? data[0] : null,
      error,
    };
  };

  const byId = await fetchEntity(documentId);
  let entity = byId.entity as any | null;

  if (!entity) {
    try {
      const { data: docProjection } = await supabase
        .from('documents')
        .select('document_entity_id')
        .eq('id', documentId)
        .limit(1)
        .maybeSingle();
      const projectedEntityId =
        typeof (docProjection as any)?.document_entity_id === 'string'
          ? String((docProjection as any).document_entity_id)
          : null;
      if (projectedEntityId) {
        const projected = await fetchEntity(projectedEntityId);
        entity = projected.entity as any | null;
      }
    } catch (projectionErr) {
      console.warn('Share: documents projection lookup failed', projectionErr);
    }
  }

  if (!entity && pdfStoragePath) {
    try {
      let pathQuery = supabase
        .from('document_entities')
        .select('id, owner_id, source_name, metadata, witness_current_storage_path, source_storage_path')
        .or(`witness_current_storage_path.eq.${pdfStoragePath},source_storage_path.eq.${pdfStoragePath}`)
        .limit(1);

      if (ownerUserId) {
        pathQuery = pathQuery.eq('owner_id', ownerUserId);
      }

      const { data: byPath } = await pathQuery;
      entity = byPath && byPath.length > 0 ? (byPath[0] as any) : null;
    } catch (pathErr) {
      console.warn('Share: document_entities path lookup failed', pathErr);
    }
  }

  if (!entity) {
    console.error('Share: document entity runtime not found', {
      documentId,
      ownerUserId: ownerUserId ?? null,
      pdfStoragePath: pdfStoragePath ?? null,
      byIdError: byId.error ?? null,
    });
    return null;
  }

  const metadata = asObject(entity.metadata) ?? {};
  const ecox = asObject(metadata.ecox) ?? {};
  const runtime = asObject(ecox.runtime) ?? {};

  const encryptedPath =
    (typeof runtime.encrypted_path === 'string' && runtime.encrypted_path) ||
    (typeof pdfStoragePath === 'string' && pdfStoragePath) ||
    null;
  const wrappedKey =
    typeof runtime.wrapped_key === 'string' ? runtime.wrapped_key : null;
  const wrapIv =
    typeof runtime.wrap_iv === 'string' ? runtime.wrap_iv : null;

  return {
    id: String(entity.id),
    document_entity_id: String(entity.id),
    document_name:
      typeof entity.source_name === 'string' ? entity.source_name : null,
    encrypted: Boolean(encryptedPath),
    encrypted_path: encryptedPath,
    wrapped_key: wrappedKey,
    wrap_iv: wrapIv,
    user_id: typeof entity.owner_id === 'string' ? entity.owner_id : null,
  };
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

async function upsertEntityEcoxRuntime(
  supabase: ReturnType<typeof getSupabase>,
  documentEntityId: string,
  runtime: {
    encrypted_path: string;
    wrapped_key: string | null;
    wrap_iv: string | null;
    storage_bucket: string;
  },
  ownerUserId: string,
): Promise<void> {
  try {
    const { data: entity, error } = await supabase
      .from('document_entities')
      .select('id, owner_id, metadata')
      .eq('id', documentEntityId)
      .single();

    if (error || !entity) {
      return;
    }

    if ((entity as any).owner_id !== ownerUserId) {
      return;
    }

    const root = asObject((entity as any).metadata) ?? {};
    const ecox = asObject(root.ecox) ?? {};
    const runtimeCurrent = asObject(ecox.runtime) ?? {};

    const nextMetadata = {
      ...root,
      ecox: {
        ...ecox,
        runtime: {
          ...runtimeCurrent,
          encrypted_path: runtime.encrypted_path,
          wrapped_key: runtime.wrapped_key,
          wrap_iv: runtime.wrap_iv,
          storage_bucket: runtime.storage_bucket,
          updated_at: new Date().toISOString(),
        },
      },
    };

    await supabase
      .from('document_entities')
      .update({ metadata: nextMetadata })
      .eq('id', documentEntityId);
  } catch (error) {
    console.warn('Share: failed to upsert canonical ECOX runtime metadata', error);
  }
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
