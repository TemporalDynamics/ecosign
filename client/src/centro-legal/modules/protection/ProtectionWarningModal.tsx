/**
 * MÓDULO PROTECCIÓN — WARNING MODAL
 * 
 * Aparece cuando:
 * - forensicEnabled = false
 * - Usuario intenta cerrar/salir
 * 
 * NO aparece al apagar el toggle
 */

import React from 'react';
import { X, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { PROTECTION_COPY } from './protection.copy';

interface ProtectionWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivateProtection: () => void;
  onExitWithoutProtection: () => void;
}

export const ProtectionWarningModal: React.FC<ProtectionWarningModalProps> = ({
  isOpen,
  onClose,
  onActivateProtection,
  onExitWithoutProtection,
}) => {
  if (!isOpen) return null;

  const handleActivate = () => {
    onActivateProtection();
    onClose();
    toast(PROTECTION_COPY.toastActivated, {
      duration: 2000,
      position: 'top-right',
    });
  };

  return (
    <div className="fixed inset-0 bg-white md:bg-black md:bg-opacity-60 flex items-center justify-center z-[60] animate-fadeIn p-0 md:p-6">
      <div className="bg-white rounded-none md:rounded-2xl w-full h-full md:h-auto max-w-md p-6 shadow-2xl animate-fadeScaleIn overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {PROTECTION_COPY.warningTitle}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          {PROTECTION_COPY.warningDescription}
        </p>

        <div className="space-y-3">
          <button
            onClick={handleActivate}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            <Shield className="w-4 h-4" />
            {PROTECTION_COPY.warningActivateButton}
          </button>

          <button
            onClick={onExitWithoutProtection}
            className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            {PROTECTION_COPY.warningExitButton}
          </button>
        </div>
      </div>
    </div>
  );
};
