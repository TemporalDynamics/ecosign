/**
 * Custody Confirmation Modal
 *
 * Modal que aparece ANTES de proteger un documento para preguntar al usuario
 * si desea resguardar el archivo original cifrado (custody mode).
 *
 * Contrato: DOCUMENT_ENTITY_CONTRACT.md (custody_mode)
 *
 * Flujo UX:
 * 1. Usuario hace click en "Proteger"
 * 2. Este modal aparece explicando la opción
 * 3. Usuario elige:
 *    - "Solo hash" (hash_only): no se guarda el archivo
 *    - "Guardar original cifrado" (encrypted_custody): se cifra y guarda
 * 4. Modal cierra y continúa con la protección
 */

import React, { useState } from 'react';
import { Lock, Hash, HelpCircle } from 'lucide-react';

interface CustodyConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (custodyMode: 'hash_only' | 'encrypted_custody') => void;
  documentName: string;
}

export function CustodyConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  documentName,
}: CustodyConfirmationModalProps) {
  const [selectedMode, setSelectedMode] = useState<'hash_only' | 'encrypted_custody'>('hash_only');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selectedMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Protección sobre Copia Fiel
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {documentName}
            </p>
          </div>
        </div>

        {/* Explicación */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex gap-2">
            <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">¿Sobre qué se protege?</p>
              <p>
                La protección se realiza sobre la <strong>Copia Fiel</strong> (PDF testigo).
                Este es el formato canónico verificable que incluye firmas, sellos y metadata.
              </p>
            </div>
          </div>
        </div>

        {/* Opciones de custody */}
        <div className="space-y-3 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">
            ¿Querés resguardar el archivo original cifrado? (opcional)
          </p>

          {/* Opción 1: Hash only */}
          <label
            className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selectedMode === 'hash_only'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="custody_mode"
              value="hash_only"
              checked={selectedMode === 'hash_only'}
              onChange={() => setSelectedMode('hash_only')}
              className="sr-only"
            />
            <div className="flex items-start gap-3">
              <Hash className={`w-5 h-5 mt-0.5 ${selectedMode === 'hash_only' ? 'text-blue-600' : 'text-gray-400'}`} />
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  Solo hash (recomendado)
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  No se guarda el archivo. Solo se registra su huella digital (hash).
                  Máxima privacidad, menor almacenamiento.
                </div>
              </div>
            </div>
          </label>

          {/* Opción 2: Encrypted custody */}
          <label
            className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selectedMode === 'encrypted_custody'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="custody_mode"
              value="encrypted_custody"
              checked={selectedMode === 'encrypted_custody'}
              onChange={() => setSelectedMode('encrypted_custody')}
              className="sr-only"
            />
            <div className="flex items-start gap-3">
              <Lock className={`w-5 h-5 mt-0.5 ${selectedMode === 'encrypted_custody' ? 'text-blue-600' : 'text-gray-400'}`} />
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  Guardar original cifrado
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  El archivo original se cifra con tu clave y se guarda de forma segura.
                  Útil para recovery o auditorías futuras.
                </div>
                <div className="text-xs text-gray-500 mt-2 italic">
                  ⚠️ Phase 1: El cifrado usa tu user ID. En Phase 2 se agregará passphrase.
                </div>
              </div>
            </div>
          </label>
        </div>

        {/* Nota importante */}
        <div className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600">
            <strong>Nota:</strong> La verificación pública siempre usa la Copia Fiel (PDF testigo), no el original.
            Esta opción solo afecta el resguardo del archivo original para tu uso interno.
          </p>
        </div>

        {/* Botones */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Continuar con protección
          </button>
        </div>
      </div>
    </div>
  );
}
