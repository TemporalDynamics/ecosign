/**
 * MÓDULO NDA — PANEL IZQUIERDO
 * 
 * Panel lateral que permite configurar el NDA del documento
 * 
 * Reglas (siguiendo R1-R6):
 * R1: Asociación fuerte (documento, no envío)
 * R2: NDA único por documento
 * R3: Múltiples formas de entrada (edit/paste/upload)
 * R4: Experiencia del receptor (pantalla NDA → OTP → Acceso)
 * R5: Flujo de firmas (cada firmante acepta NDA)
 * R6: Orden inmutable (NDA → OTP → Acceso → Firma)
 * 
 * Estados internos (UX, NO verdad):
 * - collapsed | expanded (visor)
 * - editing | viewing (modo)
 * - valid | invalid (validación)
 * - dirty | saved (persistencia UX)
 */

import React, { useEffect, useState } from 'react';
import { FileText, Maximize2, Upload } from 'lucide-react';
import { NDA_COPY } from './nda.copy';

type NdaSource = 'template' | 'pasted' | 'uploaded';

interface NdaPanelProps {
  isOpen?: boolean;
  documentId?: string;
  content?: string;
  onContentChange?: (content: string) => void;
  onClose?: () => void;
  onFocus?: () => void;
  onSave?: (ndaData: {
    content: string;
    source: NdaSource;
    fileName?: string;
  }) => void;
}

export const NdaPanel: React.FC<NdaPanelProps> = ({
  isOpen = true,
  documentId,
  content: controlledContent,
  onContentChange,
  onClose,
  onFocus,
  onSave,
}) => {
  const [content, setContent] = useState(controlledContent ?? NDA_COPY.DEFAULT_TEMPLATE);
  const [source, setSource] = useState<NdaSource>('template');
  const [fileName, setFileName] = useState<string | undefined>();
  const [isDirty, setIsDirty] = useState(false);

  if (!isOpen) return null;

  useEffect(() => {
    if (controlledContent !== undefined) {
      setContent(controlledContent);
    }
  }, [controlledContent]);

  const applyContentChange = (newContent: string) => {
    if (onContentChange) {
      onContentChange(newContent);
    } else {
      setContent(newContent);
    }
    setIsDirty(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // R3: Soportar PDF / DOC / TXT
    const validTypes = ['application/pdf', 'application/msword', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!validTypes.includes(file.type)) {
      alert('Solo se permiten archivos PDF, DOC o TXT');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      applyContentChange(text);
      setSource('uploaded');
      setFileName(file.name);
    };
    
    if (file.type === 'text/plain') {
      reader.readAsText(file);
    } else {
      // Para PDF/DOC, por ahora guardamos el nombre
      // En una implementación completa, usaríamos una librería de parsing
      setFileName(file.name);
      setSource('uploaded');
      setIsDirty(true);
    }
  };

  const handleSave = () => {
    if (!content.trim()) {
      alert('El NDA no puede estar vacío');
      return;
    }

    onSave?.({
      content,
      source,
      fileName,
    });
    setIsDirty(false);
  };

  return (
    <>
      {/* Panel izquierdo - width controlado por Stage CSS */}
      <div className="w-full bg-white border-r border-gray-200 flex flex-col h-full">
        {/* Header - COMPACTO */}
        <div className="px-2 py-1.5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-gray-700" />
            <h3 className="font-semibold text-sm text-gray-900">
              {NDA_COPY.PANEL_TITLE}
            </h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition text-sm"
            >
              ✕
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-2 flex flex-col gap-2">
          {/* Descripción */}
          <p className="text-xs text-gray-600">
            {NDA_COPY.PANEL_DESCRIPTION}
          </p>

          {/* Visor de contenido - MÁS COMPACTO */}
          <div className="border border-gray-200 rounded flex flex-col flex-1 min-h-0">
            <div className="px-2 py-1 bg-gray-50 border-b border-gray-200 text-xs text-gray-600 flex items-center justify-between">
              <span>Vista previa</span>
              <div className="flex items-center gap-1.5">
                {fileName && (
                  <span className="text-gray-500 text-xs">📎 {fileName}</span>
                )}
                <button
                  onClick={() => {
                    applyContentChange(NDA_COPY.DEFAULT_TEMPLATE);
                    setSource('template');
                  }}
                  className="h-7 w-7 inline-flex items-center justify-center text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
                  title="Usar template"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
                <label className="text-gray-500 hover:text-gray-700 cursor-pointer" title="Subir NDA">
                  <span className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-gray-100">
                    <Upload className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {onFocus && (
                  <button
                    type="button"
                    onClick={onFocus}
                    className="h-7 w-7 inline-flex items-center justify-center text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
                    title="Ver en grande"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={content}
              onChange={(e) => applyContentChange(e.target.value)}
              className="w-full flex-1 min-h-0 p-2 text-xs text-gray-700 resize-none focus:outline-none"
              placeholder="Escribe o pega el contenido del NDA aquí..."
            />
          </div>
        </div>
        {onSave && (
          <div className="px-2 py-2 border-t border-gray-200 mb-2">
            <button
              onClick={handleSave}
              disabled={!isDirty || !content.trim()}
              className={`w-full py-2 px-3 rounded text-xs font-medium transition ${
                !isDirty || !content.trim()
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {NDA_COPY.SAVE_BUTTON}
            </button>
          </div>
        )}
      </div>
    </>
  );
};
