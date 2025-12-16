import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Modal de bienvenida para el Centro Legal (primer uso)
 * Permite al usuario activar/desactivar la guía
 */
const LegalCenterWelcomeModal = ({ isOpen, onAccept, onReject, onNeverShow }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-fadeScaleIn">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gray-900 rounded-lg">
              <EyeOff className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Bienvenido al Centro Legal
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            Para iniciar el proceso, subí el documento que querés firmar o certificar.
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700 mb-3 font-medium">
              ¿Querés que te acompañemos durante el proceso?
            </p>
            <p className="text-xs text-gray-500 italic">
              Pensá en EcoSign como alguien que acompaña, pero que es ciego.
            </p>
          </div>

          <div className="space-y-2 text-xs text-gray-600">
            <p>
              Si activás la guía, te mostraremos mensajes breves en momentos clave
              para que entiendas qué está pasando.
            </p>
            <p>
              Podés desactivarla en cualquier momento.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-2xl space-y-2">
          <button
            onClick={onAccept}
            className="w-full py-2.5 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
          >
            Sí, acompañame
          </button>
          <button
            onClick={onReject}
            className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium border border-gray-300 transition-colors"
          >
            No, gracias
          </button>
          <button
            onClick={onNeverShow}
            className="w-full py-2 px-4 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            No volver a mostrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalCenterWelcomeModal;
