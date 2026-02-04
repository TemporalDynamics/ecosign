import React from 'react';
import { FieldPlacer } from '@/components/signature/FieldPlacer';
import type { SignatureField } from '@/types/signature-fields';

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
      <FieldPlacer
        pdfUrl={filePreviewUrl}
        fields={signatureFields}
        onFieldsChange={onFieldsChange}
      />
    </div>
  );
}
