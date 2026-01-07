/**
 * MÓDULO PROTECCIÓN — MODAL INFO
 * 
 * Modal simple y no técnico
 * Se abre al hacer click en el Shield icon
 * 
 * BLOQUE 1: Copy simplificado
 * NO menciona TSA, Polygon, Bitcoin
 */

import React from 'react';
import { X, Shield } from 'lucide-react';
import { PROTECTION_COPY } from './protection.copy';

interface ProtectionInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProtectionInfoModal: React.FC<ProtectionInfoModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white md:bg-black md:bg-opacity-60 flex items-center justify-center z-[60] animate-fadeIn p-0 md:p-6">
      <div className="bg-white rounded-none md:rounded-2xl w-full h-full md:h-auto max-w-md p-6 shadow-2xl animate-fadeScaleIn overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {PROTECTION_COPY.modalTitle}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BLOQUE 1: Copy simple y no técnico */}
        <p className="text-sm text-gray-600 mb-6">
          {PROTECTION_COPY.modalDescription}
        </p>
      </div>
    </div>
  );
};
