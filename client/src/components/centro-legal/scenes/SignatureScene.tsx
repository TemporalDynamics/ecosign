import React from 'react';
import { SignatureFieldsEditor } from '../../signature/SignatureFieldsEditor';
import type { SignatureField } from '../../signature/types';

interface SignatureSceneProps {
  file: File | null;
  filePreviewUrl: string | null;
  signatureFields: SignatureField[];
  onFieldsChange: (fields: SignatureField[]) => void;
  isMobile: boolean;
}

/**
 * SCENE 3: Visual Signature Configuration
 * Responsabilidad: Editor de campos visuales de firma
 */
export function SignatureScene({
  file,
  filePreviewUrl,
  signatureFields,
  onFieldsChange,
  isMobile
}: SignatureSceneProps) {
  if (!file || !filePreviewUrl) {
    return null;
  }

  return (
    <div className="space-y-4">
      <SignatureFieldsEditor
        pdfUrl={filePreviewUrl}
        fields={signatureFields}
        onFieldsChange={onFieldsChange}
      />
    </div>
  );
}
