import React from 'react';
import { Upload } from 'lucide-react';

interface DocumentSceneProps {
  file: File | null;
  filePreviewUrl: string | null;
  isProcessing: boolean;
  isMobile: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * SCENE 1: Document Upload / Preview
 * Responsabilidad: Mostrar dropzone o preview del documento
 */
export function DocumentScene({
  file,
  filePreviewUrl,
  isProcessing,
  isMobile,
  onFileSelect
}: DocumentSceneProps) {
  if (!file) {
    return (
      <div className={`space-y-3 ${isMobile ? 'pb-24' : ''}`}>
        <label className="block border-2 border-dashed border-gray-300 rounded-xl py-10 md:py-20 min-h-[240px] md:min-h-[480px] text-center hover:border-gray-900 transition-colors cursor-pointer">
          <input
            type="file"
            className="hidden"
            onChange={onFileSelect}
            accept=".pdf"
          />
          <p className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
            Arrastrá tu documento o hacé clic para elegirlo
          </p>
          <div className="flex justify-center mb-4">
            <Upload className="w-12 h-12 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 max-w-md mx-auto px-4">
            Cargá documentos PDF para certificar, firmar o enviar a firmar.
          </p>
        </label>
      </div>
    );
  }

  // Preview del documento
  return (
    <div className={`space-y-3 ${isMobile ? 'pb-24' : ''}`}>
      <div className="border-2 border-gray-200 rounded-xl overflow-hidden min-h-[480px] bg-gray-50">
        {filePreviewUrl ? (
          <iframe
            src={filePreviewUrl}
            className="w-full h-[600px]"
            title="Document Preview"
          />
        ) : (
          <div className="flex items-center justify-center h-[600px]">
            <p className="text-gray-500">Cargando preview...</p>
          </div>
        )}
      </div>
    </div>
  );
}
