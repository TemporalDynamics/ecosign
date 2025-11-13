import React, { useState } from 'react';

/**
 * LegalDisclaimerModal - Show legal disclaimer before certification
 * 
 * Usage:
 *   <LegalDisclaimerModal 
 *     isOpen={showDisclaimer}
 *     onAccept={() => handleAccept()}
 *     onDecline={() => handleDecline()}
 *   />
 */
export default function LegalDisclaimerModal({ isOpen, onAccept, onDecline }) {
  const [hasReadToEnd, setHasReadToEnd] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleScroll = (e) => {
    const element = e.target;
    const scrolledToBottom = 
      element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    
    if (scrolledToBottom && !hasReadToEnd) {
      setHasReadToEnd(true);
    }
  };

  const handleAccept = () => {
    if (agreedToTerms && hasReadToEnd) {
      // Store acceptance in localStorage
      localStorage.setItem('verifysign_legal_accepted', JSON.stringify({
        accepted: true,
        date: new Date().toISOString(),
        version: '1.0.0'
      }));
      onAccept();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-3xl">⚖️</span>
            Aviso Legal Importante
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            Por favor lee cuidadosamente antes de continuar
          </p>
        </div>

        {/* Content - Scrollable */}
        <div 
          className="p-6 overflow-y-auto flex-1"
          onScroll={handleScroll}
        >
          <div className="space-y-4 text-gray-700">
            {/* Critical Warning */}
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <h3 className="font-bold text-red-800 mb-2">
                🚨 VerifySign NO es una firma legal
              </h3>
              <p className="text-sm text-red-700">
                Este servicio proporciona <strong>certificación técnica</strong> y{' '}
                <strong>timestamping</strong>, pero NO reemplaza firmas digitales 
                legalmente vinculantes como FIEL, e-firma, o firmas notariales.
              </p>
            </div>

            {/* What it does */}
            <div>
              <h3 className="font-semibold text-lg mb-2">✅ Lo que SÍ proporciona:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Certificación técnica de documentos</li>
                <li>Timestamping criptográfico (RFC 3161)</li>
                <li>Anclaje en blockchain (Bitcoin/Polygon)</li>
                <li>Verificación de integridad de archivos (SHA-256)</li>
                <li>Prueba de existencia en fecha específica</li>
              </ul>
            </div>

            {/* What it doesn't */}
            <div>
              <h3 className="font-semibold text-lg mb-2">❌ Lo que NO proporciona:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Firma digital con validez legal automática</li>
                <li>Identidad verificada de firmantes</li>
                <li>Cumplimiento de regulaciones específicas (eIDAS, ESIGN, etc.)</li>
                <li>Garantías de admisibilidad en procedimientos legales</li>
              </ul>
            </div>

            {/* Recommended uses */}
            <div className="bg-green-50 p-4 rounded">
              <h3 className="font-semibold text-green-800 mb-2">
                ✅ Casos de uso recomendados:
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-green-700">
                <li>Prueba de existencia de documentos internos</li>
                <li>Auditoría de versiones de archivos</li>
                <li>Timestamping de código fuente o diseños</li>
                <li>Evidencia complementaria junto a firmas legales</li>
                <li>Proyectos de código abierto (GPL compliance)</li>
              </ul>
            </div>

            {/* Not recommended uses */}
            <div className="bg-yellow-50 p-4 rounded">
              <h3 className="font-semibold text-yellow-800 mb-2">
                ⚠️ NO recomendado para:
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                <li>Contratos legalmente vinculantes (sin consulta legal)</li>
                <li>Testamentos o poderes notariales</li>
                <li>Trámites gubernamentales que requieren firma oficial</li>
                <li>Documentos médicos con requisitos regulatorios</li>
              </ul>
            </div>

            {/* Jurisdiction notice */}
            <div>
              <h3 className="font-semibold text-lg mb-2">🌍 Validez por Jurisdicción:</h3>
              <p className="text-sm">
                La validez legal de certificados .ECO varía según tu ubicación. 
                Es tu responsabilidad verificar si este tipo de certificación 
                es admisible en tu jurisdicción para el propósito específico.
              </p>
              <p className="text-sm mt-2 font-medium">
                💡 <strong>Recomendación:</strong> Consulta con un abogado especializado 
                en derecho digital antes de usar VerifySign para propósitos legales.
              </p>
            </div>

            {/* Limitations */}
            <div>
              <h3 className="font-semibold text-lg mb-2">🔒 Limitaciones Técnicas:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>No hay garantía de disponibilidad 99.9%</li>
                <li>Confirmación blockchain puede tardar 10-60 minutos</li>
                <li>Formato .ECO es propietario (no estándar ISO)</li>
                <li>Tamaño máximo: 100 MB</li>
              </ul>
            </div>

            {/* Privacy note */}
            <div className="bg-blue-50 p-4 rounded">
              <h3 className="font-semibold text-blue-800 mb-2">🛡️ Privacidad:</h3>
              <p className="text-sm text-blue-700">
                Solo almacenamos el <strong>hash SHA-256</strong> de tu documento, 
                NO el contenido original. Los datos se almacenan en Supabase (GDPR compliant) 
                y las referencias blockchain son públicas e inmutables.
              </p>
            </div>

            {/* Disclaimer */}
            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <p className="text-xs text-gray-600">
                <strong>DESCARGO DE RESPONSABILIDAD:</strong> Temporal Dynamics LLC no se hace 
                responsable por pérdidas económicas, documentos rechazados en procedimientos legales, 
                fallas técnicas, o cualquier daño derivado del uso de VerifySign. Este software 
                se proporciona "TAL CUAL" sin garantías de ningún tipo.
              </p>
            </div>

            {/* More info */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Para más información, consulta:{' '}
                <a 
                  href="/docs/legal" 
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  Disclaimer completo
                </a>
              </p>
            </div>

            {/* Scroll indicator */}
            {!hasReadToEnd && (
              <div className="text-center py-4 text-sm text-gray-500 animate-bounce">
                ↓ Continúa leyendo hasta el final ↓
              </div>
            )}
          </div>
        </div>

        {/* Footer - Actions */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          {/* Checkbox */}
          <label className="flex items-start gap-3 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              disabled={!hasReadToEnd}
              className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
            />
            <span className={`text-sm ${!hasReadToEnd ? 'text-gray-400' : 'text-gray-700'}`}>
              He leído y comprendo que <strong>VerifySign NO es una firma legal</strong>.
              Verificaré la validez en mi jurisdicción y consultaré con un abogado 
              antes de usar esto para propósitos legales.
            </span>
          </label>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onDecline}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              No Acepto
            </button>
            <button
              onClick={handleAccept}
              disabled={!agreedToTerms || !hasReadToEnd}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                agreedToTerms && hasReadToEnd
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Acepto y Continúo
            </button>
          </div>

          {/* Helper text */}
          {!hasReadToEnd && (
            <p className="text-xs text-center text-gray-500 mt-3">
              Desplázate hasta el final para habilitar el botón
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
