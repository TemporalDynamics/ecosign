/**
 * PDF Validation Utilities
 *
 * Purpose: Detect PDF issues EARLY (at upload), not late (at certify)
 * Anti-explosion: C (Tardío)
 *
 * P0.1: validatePDFStructure - corrupted PDFs
 * P0.2: checkPDFPermissions - restricted PDFs
 */

import { PDFDocument } from 'pdf-lib';

/**
 * P0.1: Validate PDF structure
 * Detects corrupted/invalid PDFs BEFORE user configures everything
 */
export async function validatePDFStructure(file: File): Promise<boolean> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Check PDF header (must start with %PDF-)
    const header = String.fromCharCode(...uint8Array.slice(0, 5));
    if (header !== '%PDF-') {
      console.warn('Invalid PDF header:', header);
      return false;
    }

    // Check for EOF marker (PDFs must end with %%EOF)
    const tail = String.fromCharCode(...uint8Array.slice(-10));
    if (!tail.includes('%%EOF')) {
      console.warn('PDF missing EOF marker');
      return false;
    }

    // Try to load with pdf-lib (validates internal structure)
    await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: true, // We check encryption separately
      updateMetadata: false
    });

    return true;
  } catch (error) {
    console.error('PDF structure validation failed:', error);
    return false;
  }
}

/**
 * P0.2: Check PDF permissions/restrictions
 * Warns user if PDF has editing restrictions BEFORE they continue
 */
export interface PDFPermissions {
  restricted: boolean;
  canModify: boolean;
  canCopy: boolean;
  canPrint: boolean;
}

export async function checkPDFPermissions(file: File): Promise<PDFPermissions> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    // Try to load PDF
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: false, // Don't ignore - we want to detect it
      updateMetadata: false
    });

    // Check if document is encrypted/restricted
    const isEncrypted = pdfDoc.isEncrypted;

    // Note: pdf-lib doesn't expose granular permissions
    // We can only detect if encryption exists
    // If encrypted, assume restrictions (conservative approach)

    return {
      restricted: isEncrypted,
      canModify: !isEncrypted,
      canCopy: !isEncrypted,
      canPrint: !isEncrypted
    };
  } catch (error) {
    // If load fails due to encryption, PDF is restricted
    const errorMsg = String(error);
    const isEncryptionError = errorMsg.includes('encrypt') || errorMsg.includes('password');

    if (isEncryptionError) {
      return {
        restricted: true,
        canModify: false,
        canCopy: false,
        canPrint: false
      };
    }

    // For other errors, assume no restrictions (fail open)
    console.error('PDF permissions check error:', error);
    return {
      restricted: false,
      canModify: true,
      canCopy: true,
      canPrint: true
    };
  }
}
