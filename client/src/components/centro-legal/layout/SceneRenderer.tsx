import React from 'react';
import {
  DocumentScene,
  NdaScene,
  SignatureScene,
  FlowScene,
  ReviewScene
} from '../scenes';
import type { SceneType } from '../orchestration/resolveActiveScene';
import type { SignatureField } from '@/types/signature-fields';

interface SceneRendererProps {
  scene: SceneType;
  
  // Document
  file: File | null;
  filePreviewUrl: string | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isProcessing: boolean;
  
  // NDA
  ndaEnabled: boolean;
  ndaContent: string;
  onNdaContentChange: (content: string) => void;
  
  // Signature
  signatureFields: SignatureField[];
  onFieldsChange: (fields: SignatureField[]) => void;
  
  // Flow
  signerEmails: string[];
  onSignerEmailsChange: (emails: string[]) => void;
  
  // Review
  forensicEnabled: boolean;
  mySignatureEnabled: boolean;
  workflowEnabled: boolean;
  signerCount: number;
  
  // Global
  isMobile: boolean;
}

/**
 * SceneRenderer — Orquestador de escenas
 * 
 * Responsabilidad:
 * - Renderizar la escena correcta según el estado
 * - Pasar props específicos a cada escena
 * 
 * NO maneja:
 * - Lógica de negocio
 * - Certificación
 * - Eventos probatorios
 */
export function SceneRenderer({
  scene,
  file,
  filePreviewUrl,
  onFileSelect,
  isProcessing,
  ndaEnabled,
  ndaContent,
  onNdaContentChange,
  signatureFields,
  onFieldsChange,
  signerEmails,
  onSignerEmailsChange,
  forensicEnabled,
  mySignatureEnabled,
  workflowEnabled,
  signerCount,
  isMobile
}: SceneRendererProps) {
  
  switch (scene) {
    case 'document':
      return (
        <DocumentScene
          file={file}
          filePreviewUrl={filePreviewUrl}
          onFileSelect={onFileSelect}
          isProcessing={isProcessing}
          isMobile={isMobile}
        />
      );

    case 'nda':
      return (
        <NdaScene
          file={file}
          filePreviewUrl={filePreviewUrl}
          ndaEnabled={ndaEnabled}
          ndaContent={ndaContent}
          onNdaContentChange={onNdaContentChange}
          isMobile={isMobile}
        />
      );

    case 'signature':
      return (
        <SignatureScene
          file={file}
          filePreviewUrl={filePreviewUrl}
          signatureFields={signatureFields}
          onFieldsChange={onFieldsChange}
          isMobile={isMobile}
        />
      );

    case 'flow':
      return (
        <FlowScene
          file={file}
          filePreviewUrl={filePreviewUrl}
          signerEmails={signerEmails}
          onSignerEmailsChange={onSignerEmailsChange}
          isMobile={isMobile}
        />
      );

    case 'review':
      return (
        <ReviewScene
          file={file}
          filePreviewUrl={filePreviewUrl}
          forensicEnabled={forensicEnabled}
          ndaEnabled={ndaEnabled}
          mySignatureEnabled={mySignatureEnabled}
          workflowEnabled={workflowEnabled}
          signerCount={signerCount}
          isMobile={isMobile}
        />
      );

    default:
      // Fallback: Document scene
      return (
        <DocumentScene
          file={file}
          filePreviewUrl={filePreviewUrl}
          onFileSelect={onFileSelect}
          isProcessing={isProcessing}
          isMobile={isMobile}
        />
      );
  }
}
