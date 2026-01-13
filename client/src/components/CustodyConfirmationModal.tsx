/**
 * Custody Confirmation Modal
 *
 * Modal minimalista que aparece ANTES de proteger un documento.
 * Objetivo: Tranquilizar primero, ofrecer opción después.
 *
 * Principio UX:
 * "Nunca explicar criptografía en un momento de alivio emocional."
 *
 * Contrato: DOCUMENT_ENTITY_CONTRACT.md (custody_mode)
 */

import React, { useState } from 'react';
import { Lock } from 'lucide-react';

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
  const [saveCustody, setSaveCustody] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(saveCustody ? 'encrypted_custody' : 'hash_only');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header: Tranquilizador, no técnico */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Documento protegido
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Tu documento ya fue protegido de forma segura.
          </p>
        </div>

        {/* Toggle único: Decisión opcional */}
        <div className="mb-6">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="flex items-center h-6">
              <input
                type="checkbox"
                checked={saveCustody}
                onChange={(e) => setSaveCustody(e.target.checked)}
                className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-900">
                  Guardar archivo original cifrado
                </span>
                <span className="text-sm text-gray-500">(opcional)</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {saveCustody
                  ? 'Solo vos podrás recuperarlo más adelante.'
                  : 'Si no lo guardás, nadie (ni nosotros) conserva una copia del archivo.'
                }
              </p>
            </div>
          </label>
        </div>

        {/* Footer: Confianza simple */}
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            🔒 EcoSign nunca puede ver ni leer tus documentos.
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
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
