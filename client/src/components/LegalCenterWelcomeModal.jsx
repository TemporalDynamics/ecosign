import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

/**
 * Modal de bienvenida rediseñado para el Centro Legal.
 * Permite al usuario elegir si desea la guía y comenzar el proceso.
 */
const LegalCenterWelcomeModal = ({ isOpen, onAccept, onReject, onNeverShow }) => {
  if (!isOpen) return null;

  // Estado para la selección de la guía, null hasta que el usuario elija.
  const [guideSelection, setGuideSelection] = useState(null);
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);

  // Al hacer clic en "Comenzar proceso", se aplican las preferencias.
  const handleStart = () => {
    if (doNotShowAgain) {
      onNeverShow();
    }

    if (guideSelection === 'yes') {
      onAccept();
    } else {
      onReject();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg max-w-sm w-full shadow-xl animate-fadeScaleIn p-5">

        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex justify-center mb-2">
            <ShieldCheck className="h-8 w-8 text-blue-600" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Centro Legal
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            <strong>Subí un documento para iniciar.</strong>
            <br />
            EcoSign te acompaña, pero no accede a tu contenido: como si fuera ciego.
          </p>
        </div>

        {/* Opciones de guía */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">¿Querés guía?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setGuideSelection('yes')}
              className={`flex-1 py-2 px-3 text-sm rounded border transition-all ${
                guideSelection === 'yes'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              Sí, acompañame
            </button>
            <button
              onClick={() => setGuideSelection('no')}
              className={`flex-1 py-2 px-3 text-sm rounded border transition-all ${
                guideSelection === 'no'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              Sin guía
            </button>
          </div>
        </div>

        {/* Botón principal */}
        <button
          onClick={handleStart}
          disabled={!guideSelection}
          className={`w-full py-2.5 px-4 text-white text-sm rounded font-medium transition-colors mb-3 ${
            guideSelection
              ? 'bg-gray-900 hover:bg-gray-800 cursor-pointer'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          Comenzar proceso
        </button>

        {/* Checkbox discreto */}
        <div className="flex items-center justify-center gap-1">
          <input
            type="checkbox"
            id="dont-show-again"
            checked={doNotShowAgain}
            onChange={(e) => setDoNotShowAgain(e.target.checked)}
            className="scale-50 rounded border-gray-300 text-gray-600 focus:ring-0"
          />
          <label htmlFor="dont-show-again" className="text-xs text-gray-500 cursor-pointer select-none">
            No volver a mostrar
          </label>
        </div>

      </div>
    </div>
  );
};

export default LegalCenterWelcomeModal;
