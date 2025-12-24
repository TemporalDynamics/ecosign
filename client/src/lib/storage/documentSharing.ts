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
  } = options;

  const supabase = getSupabase();

  try {
    if (!isSessionInitialized()) {
      throw new Error('Session crypto not initialized. Please log in again.');
    }

    // 1. Get document metadata
    const { data: doc, error: docError } = await supabase
      .from('user_documents')
      .select('id, document_name, encrypted, wrapped_key, wrap_iv, user_id')
      .eq('id', documentId)
      .single();

    if (docError || !doc) {
      throw new Error('Document not found');
    }

    if (!doc.encrypted) {
      throw new Error('Can only share encrypted documents with OTP');
    }

    // Verify user owns the document
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || doc.user_id !== user.id) {
      throw new Error('Access denied');
    }

    // 2. Unwrap document key with owner's session key
    const sessionUnwrapKey = getSessionUnwrapKey();
    const documentKey = await unwrapDocumentKey(
      doc.wrapped_key,
      doc.wrap_iv,
      sessionUnwrapKey
    );

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
      document_id: documentId,
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

    // 9. Send OTP via email (call edge function)
    try {
      await supabase.functions.invoke('send-share-otp', {
        body: {
          recipientEmail,
          otp,
          shareUrl,
          documentName: doc.document_name,
          senderName: user.email,
          message,
        },
      });
    } catch (emailError) {
      console.warn('⚠️ Failed to send email, but share created:', emailError);
      // Don't fail the whole operation if email fails
    }

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
    // 1. Verify OTP and get share
    const otpHash = await hashOTP(otp);

    // Build query - email validation is optional
    let query = supabase
      .from('document_shares')
      .select('*, user_documents!inner(document_name, encrypted_path)')
      .eq('id', shareId)
      .eq('otp_hash', otpHash)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());
    
    // Only validate email if it's not a placeholder
    if (recipientEmail && !recipientEmail.includes('@ecosign.local')) {
      query = query.eq('recipient_email', recipientEmail);
    }
    
    const { data: share, error: shareError } = await query.single();

    if (shareError || !share) {
      console.error('Share query error:', shareError);
      throw new Error('Invalid or expired OTP');
    }

    // 2. Derive recipient key from OTP
    const recipientSalt = hexToBytes(share.recipient_salt);
    const recipientKey = await deriveKeyFromOTP(otp, recipientSalt);

    // 3. Unwrap document key
    const documentKey = await unwrapDocumentKey(
      share.wrapped_key,
      share.wrap_iv,
      recipientKey
    );

    // 4. Download encrypted file
    const { data: encryptedBlob, error: downloadError } = await supabase.storage
      .from('user-documents')
      .download(share.user_documents.encrypted_path);

    if (downloadError || !encryptedBlob) {
      throw new Error('Failed to download file');
    }

    // 5. Decrypt file
    const decryptedBlob = await decryptFile(encryptedBlob, documentKey);

    // 6. Mark as accessed (one-time access)
    await supabase
      .from('document_shares')
      .update({
        status: 'accessed',
        accessed_at: new Date().toISOString(),
      })
      .eq('id', shareId);

    return {
      blob: decryptedBlob,
      filename: share.user_documents.document_name,
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
export async function listDocumentShares(documentId: string) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('document_shares')
    .select('id, recipient_email, status, expires_at, accessed_at, created_at, nda_enabled, nda_text')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list shares: ${error.message}`);
  }

  return data || [];
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
