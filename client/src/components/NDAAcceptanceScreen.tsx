/**
 * NDAAcceptanceScreen Component
 * 
 * Pantalla 1 del flujo de acceso con NDA
 * Muestra el acuerdo de confidencialidad y solicita aceptación
 * 
 * BLOQUE 2 — FASE 2.1: Ahora genera eventos probatorios
 * R4: NDA acceptance con hash + timestamp + IP
 */

import { useState } from 'react';
import { Shield, FileText, X, Loader2 } from 'lucide-react';
import { acceptNda, type NdaContext } from '../lib/ndaEvents';

interface NDAAcceptanceScreenProps {
  ndaText: string;
  documentName: string;
  token?: string;              // Para share-link legacy
  signerId?: string;            // Para signature-flow
  context: NdaContext;
  signerName?: string;
  signerEmail: string;
  linkId?: string;              // Para asociar a link específico
  onAccept: () => void;
  onReject: () => void;
}

export function NDAAcceptanceScreen({
  ndaText,
  documentName,
  token,
  signerId,
  context,
  signerName = '',
  signerEmail,
  linkId,
  onAccept,
  onReject,
}: NDAAcceptanceScreenProps) {
  const [accepted, setAccepted] = useState(false);
  const [showFullNDA, setShowFullNDA] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!accepted) return;

    setIsAccepting(true);
    setError(null);

    try {
      // FASE 2.1: Generar evento probatorio de aceptación
      const result = await acceptNda({
        token,
        signerId,
        context,
        ndaText,
        signerName,
        signerEmail,
        linkId,
      });

      if (!result.success) {
        throw new Error(result.error || 'Error al aceptar NDA');
      }

      // Si ya estaba aceptado, continuar igual
      if (result.alreadyAccepted) {
        console.log('NDA ya estaba aceptado previamente');
      } else {
        console.log('NDA aceptado con hash:', result.ndaHash);
      }

      // Continuar con el flujo
      onAccept();
    } catch (err) {
      console.error('Error aceptando NDA:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-gray-700" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Acuerdo de Confidencialidad
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {documentName}
              </p>
            </div>
          </div>
          <button
            onClick={onReject}
            className="text-gray-400 hover:text-gray-600 transition"
            title="Cancelar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Warning box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Importante:</strong> Este documento está protegido por un acuerdo de confidencialidad. 
              Debes aceptarlo antes de acceder al contenido.
            </p>
          </div>

          {/* NDA Preview */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">
                Resumen del Acuerdo
              </h3>
            </div>
            
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap line-clamp-8">
              {ndaText}
            </div>

            {ndaText.length > 500 && (
              <button
                onClick={() => setShowFullNDA(!showFullNDA)}
                className="mt-4 text-sm text-gray-700 hover:text-gray-900 font-medium underline"
              >
                {showFullNDA ? 'Ver menos' : 'Leer acuerdo completo'}
              </button>
            )}
          </div>

          {/* Full NDA (expandable) */}
          {showFullNDA && (
            <div className="bg-white rounded-lg p-6 mb-6 border border-gray-300 max-h-96 overflow-y-auto">
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                {ndaText}
              </div>
            </div>
          )}

          {/* Acceptance checkbox */}
          <label className="flex items-start gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="eco-checkbox mt-1 text-gray-900 border-gray-300 rounded focus:ring-2 focus:ring-gray-900"
            />
            <span className="text-sm text-gray-700">
              <strong>Acepto el acuerdo de confidencialidad</strong> y me comprometo a mantener 
              el contenido de este documento en confidencialidad, no divulgarlo a terceros 
              sin autorización, y cumplir con los términos establecidos.
            </span>
          </label>

          {/* Legal notice */}
          <p className="text-xs text-gray-500 mt-4">
            ℹ️ Tu aceptación quedará registrada con fines de auditoría y validez legal.
            El timestamp y hash de este acuerdo formarán parte del registro criptográfico del acceso.
          </p>

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                ❌ <strong>Error:</strong> {error}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <button
            onClick={onReject}
            disabled={isAccepting}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Rechazar
          </button>
          <button
            onClick={handleAccept}
            disabled={!accepted || isAccepting}
            className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAccepting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registrando...
              </>
            ) : (
              'Aceptar y Continuar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
