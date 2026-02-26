import React from 'react';
import { NdaPanel } from '@/centro-legal/modules/nda';
import { PdfEditViewer } from '@/components/pdf/PdfEditViewer';

interface NdaSceneProps {
  file: File | null;
  filePreviewUrl: string | null;
  ndaEnabled: boolean;
  ndaContent: string;
  onNdaContentChange: (content: string) => void;
  isMobile: boolean;
}

/**
 * SCENE 2: NDA Configuration
 * Responsabilidad: Mostrar documento + panel de NDA cuando está activo
 */
export function NdaScene({
  file,
  filePreviewUrl,
  ndaEnabled,
  ndaContent,
  onNdaContentChange,
  isMobile
}: NdaSceneProps) {
  if (!ndaEnabled || !file) {
    return null;
  }

  return (
    <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-6'}`}>
      {/* Panel Izquierdo: NDA */}
      <div className="space-y-3">
        <NdaPanel
          isOpen={ndaEnabled}
          content={ndaContent}
          onContentChange={onNdaContentChange}
        />
      </div>

      {/* Panel Derecho: Document Preview */}
      <div className="space-y-3">
        <div className="border-2 border-gray-200 rounded-xl overflow-hidden min-h-[480px] bg-gray-50">
          {filePreviewUrl ? (
            <PdfEditViewer
              src={filePreviewUrl}
              locked
              className="w-full h-[600px]"
            />
          ) : (
            <div className="flex items-center justify-center h-[600px]">
              <p className="text-gray-500">Cargando preview...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
