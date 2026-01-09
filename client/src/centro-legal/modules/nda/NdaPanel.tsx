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

import React, { useState } from 'react';
import { FileText, Upload, Edit3, Maximize2 } from 'lucide-react';
import { NDA_COPY } from './nda.copy';

type NdaSource = 'template' | 'pasted' | 'uploaded';
type NdaPanelState = 'collapsed' | 'expanded';

interface NdaPanelProps {
  isOpen: boolean;
  documentId?: string;
  onClose: () => void;
  onSave: (ndaData: {
    content: string;
    source: NdaSource;
    fileName?: string;
  }) => void;
}

export const NdaPanel: React.FC<NdaPanelProps> = ({
  isOpen,
  documentId,
  onClose,
  onSave,
}) => {
  const [content, setContent] = useState(NDA_COPY.DEFAULT_TEMPLATE);
  const [source, setSource] = useState<NdaSource>('template');
  const [fileName, setFileName] = useState<string | undefined>();
  const [panelState, setPanelState] = useState<NdaPanelState>('collapsed');
  const [isDirty, setIsDirty] = useState(false);

  if (!isOpen) return null;

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
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
      setContent(text);
      setSource('uploaded');
      setFileName(file.name);
      setIsDirty(true);
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

  const handlePaste = () => {
    // Limpiar contenido para permitir paste
    setContent('');
    setSource('pasted');
    setIsDirty(true);
  };

  const handleSave = () => {
    if (!content.trim()) {
      alert('El NDA no puede estar vacío');
      return;
    }

    onSave({
      content,
      source,
      fileName,
    });
    setIsDirty(false);
  };

  const handleExpand = () => {
    setPanelState('expanded');
  };

  const handleCollapse = () => {
    setPanelState('collapsed');
  };

  return (
    <>
      {/* Panel izquierdo */}
      <div className="w-full md:w-96 bg-white border-r border-gray-200 flex flex-col h-full">
        {/* Header */}
        <div className="p-2 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-700" />
            <h3 className="font-semibold text-gray-900">
              {NDA_COPY.PANEL_TITLE}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {/* Descripción */}
          <p className="text-sm text-gray-600">
            {NDA_COPY.PANEL_DESCRIPTION}
          </p>

          {/* Botones de acción */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setContent(NDA_COPY.DEFAULT_TEMPLATE);
                setSource('template');
                setIsDirty(true);
              }}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <FileText className="w-4 h-4" />
              Template
            </button>

            <label className="flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer">
              <Upload className="w-4 h-4" />
              Subir
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={handlePaste}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <Edit3 className="w-4 h-4" />
              Pegar
            </button>

            <button
              onClick={handleExpand}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <Maximize2 className="w-4 h-4" />
              Ampliar
            </button>
          </div>

          {/* Visor de contenido */}
          <div className="border border-gray-200 rounded-lg">
            <div className="p-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600 flex justify-between items-center">
              <span>Vista previa</span>
              {fileName && (
                <span className="text-gray-500">📎 {fileName}</span>
              )}
            </div>
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full h-64 p-3 text-sm text-gray-700 resize-none focus:outline-none"
              placeholder="Escribe o pega el contenido del NDA aquí..."
            />
          </div>

          {/* Info sobre el orden */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            📌 {NDA_COPY.ORDER_INFO}
          </div>
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-gray-200 flex gap-2">
          <button
            onClick={handleSave}
            disabled={!isDirty || !content.trim()}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
              !isDirty || !content.trim()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            {NDA_COPY.SAVE_BUTTON}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Viewer expandido (overlay) */}
      {panelState === 'expanded' && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                NDA — Vista completa
              </h3>
              <button
                onClick={handleCollapse}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-gray-700">
                  {content}
                </pre>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleCollapse}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
