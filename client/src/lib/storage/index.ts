/**
 * Storage Layer - Public API
 * 
 * Unified interface for encrypted document storage and sharing.
 */

// Encrypted document storage
export {
  uploadEncryptedDocument,
  downloadEncryptedDocument,
  deleteEncryptedDocument,
  listUserDocuments,
} from './encryptedDocumentStorage';

export type {
  UploadEncryptedDocumentOptions,
  UploadEncryptedDocumentResult,
  DownloadEncryptedDocumentOptions,
} from './encryptedDocumentStorage';

// Document sharing with OTP
export {
  shareDocument,
  accessSharedDocument,
  listDocumentShares,
  revokeShare,
} from './documentSharing';

export type {
  ShareDocumentOptions,
  ShareDocumentResult,
  AccessSharedDocumentOptions,
} from './documentSharing';
