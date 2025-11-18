import React, { useState } from 'react';
import {
  X,
  FileText,
  Upload,
  Shield,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Loader2,
  Link as LinkIcon,
  Users
} from 'lucide-react';
import { basicCertificationWeb } from '../lib/basicCertificationWeb';
import { saveUserDocument } from '../utils/documentStorage';
import { useSignatureCanvas } from '../hooks/useSignatureCanvas';

/**
 * Modal de Certificación - Diseño según Design System VerifySign
 *
 * Características:
 * - Sin tecnicismos visibles
 * - Paneles colapsables para opciones avanzadas
 * - Blindaje forense por defecto (transparente)
 * - Flujo simple: Elegí → Firmá → Listo
 */
const CertificationModal = ({ isOpen, onClose }) => {
  // Estados del flujo
  const [step, setStep] = useState(1); // 1: Elegir, 2: Firmar, 3: Listo
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [certificateData, setCertificateData] = useState(null);

  // Estados de paneles colapsables
  const [forensicPanelOpen, setForensicPanelOpen] = useState(false);
  const [sharePanelOpen, setSharePanelOpen] = useState(false);

  // Configuración de blindaje forense (por defecto activado)
  const [forensicConfig, setForensicConfig] = useState({
    useLegalTimestamp: true,    // RFC 3161 - gratis
    usePolygonAnchor: true,      // Polygon - $0.001
    useBitcoinAnchor: false      // Bitcoin - opcional (24h)
  });

  // Firma legal (opcional)
  const [signatureMode, setSignatureMode] = useState('none'); // 'none', 'canvas', 'signnow'
  const { canvasRef, hasSignature, clearCanvas, getSignatureData, handlers } = useSignatureCanvas();

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      console.log('Archivo seleccionado:', selectedFile.name);
    }
  };

  const handleCertify = async () => {
    if (!file) return;

    setLoading(true);
    try {
      // Obtener datos de firma si está en modo canvas
      const signatureData = signatureMode === 'canvas' ? getSignatureData() : null;

      // 1. Certificar con blindaje forense
      const certResult = await basicCertificationWeb(file, {
        useLegalTimestamp: forensicConfig.useLegalTimestamp,
        usePolygonAnchor: forensicConfig.usePolygonAnchor,
        useBitcoinAnchor: forensicConfig.useBitcoinAnchor,
        signatureData: signatureData
      });

      // 2. Guardar en Supabase
      await saveUserDocument(file, certResult.ecoData, {
        hasLegalTimestamp: forensicConfig.useLegalTimestamp,
        hasBitcoinAnchor: forensicConfig.useBitcoinAnchor
      });

      setCertificateData(certResult);
      setStep(3); // Ir a "Listo"
    } catch (error) {
      console.error('Error al certificar:', error);
      alert('Hubo un problema al certificar tu documento. Por favor intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setFile(null);
    setCertificateData(null);
    setSignatureMode('none');
    clearCanvas();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Certificar documento
          </h2>
          <button
            onClick={resetAndClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {/* Paso 1 */}
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1
                  ? 'bg-cyan-600 text-white'
                  : 'border-2 border-gray-300 text-gray-400'
              }`}>
                {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
              </div>
              <span className={`ml-2 text-sm ${
                step >= 1 ? 'text-gray-900 font-medium' : 'text-gray-400'
              }`}>
                Elegí
              </span>
            </div>

            {/* Línea conectora */}
            <div className={`flex-1 h-px mx-4 ${
              step > 1 ? 'bg-cyan-600' : 'bg-gray-200'
            }`}></div>

            {/* Paso 2 */}
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2
                  ? 'bg-cyan-600 text-white'
                  : 'border-2 border-gray-300 text-gray-400'
              }`}>
                {step > 2 ? <CheckCircle2 className="w-5 h-5" /> : '2'}
              </div>
              <span className={`ml-2 text-sm ${
                step >= 2 ? 'text-gray-900 font-medium' : 'text-gray-400'
              }`}>
                Firmá
              </span>
            </div>

            {/* Línea conectora */}
            <div className={`flex-1 h-px mx-4 ${
              step > 2 ? 'bg-cyan-600' : 'bg-gray-200'
            }`}></div>

            {/* Paso 3 */}
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 3
                  ? 'bg-cyan-600 text-white'
                  : 'border-2 border-gray-300 text-gray-400'
              }`}>
                3
              </div>
              <span className={`ml-2 text-sm ${
                step >= 3 ? 'text-gray-900 font-medium' : 'text-gray-400'
              }`}>
                Listo
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* PASO 1: ELEGIR ARCHIVO */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Elegí tu archivo
                </h3>

                {/* Zona de drop */}
                <label className="block border-2 border-dashed border-gray-300 rounded-xl py-12 text-center hover:border-cyan-500 transition-colors cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />

                  {file ? (
                    <>
                      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <p className="text-sm text-gray-900 font-medium">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <p className="text-xs text-cyan-600 mt-4">
                        Hacé clic para cambiar el archivo
                      </p>
                    </>
                  ) : (
                    <>
                      <FileText className="w-12 h-12 text-cyan-600 mx-auto mb-4" />
                      <p className="text-sm text-gray-900 font-medium">
                        Arrastrá tu documento o hacé clic para elegirlo
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        PDF, Word, Excel, imágenes (máx 50MB)
                      </p>
                    </>
                  )}
                </label>
              </div>

              {/* Panel Colapsable: Blindaje Forense */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setForensicPanelOpen(!forensicPanelOpen)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-cyan-600" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">
                        Blindaje forense
                      </p>
                      <p className="text-xs text-gray-500">
                        {forensicConfig.useLegalTimestamp && forensicConfig.usePolygonAnchor
                          ? 'Activado (recomendado)'
                          : 'Configurar'}
                      </p>
                    </div>
                  </div>
                  {forensicPanelOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {forensicPanelOpen && (
                  <div className="p-4 space-y-3 bg-white">
                    <p className="text-sm text-gray-600 mb-4">
                      Tu documento se certifica con múltiples capas de protección forense
                    </p>

                    {/* Timestamp Legal */}
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={forensicConfig.useLegalTimestamp}
                        onChange={(e) => setForensicConfig({
                          ...forensicConfig,
                          useLegalTimestamp: e.target.checked
                        })}
                        className="mt-1 w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Timestamp legal (recomendado)
                        </p>
                        <p className="text-xs text-gray-500">
                          Certifica la fecha y hora exacta (estándar internacional RFC 3161)
                        </p>
                      </div>
                    </label>

                    {/* Blockchain */}
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={forensicConfig.usePolygonAnchor}
                        onChange={(e) => setForensicConfig({
                          ...forensicConfig,
                          usePolygonAnchor: e.target.checked
                        })}
                        className="mt-1 w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Registro blockchain (recomendado)
                        </p>
                        <p className="text-xs text-gray-500">
                          Registra tu certificado en blockchain público (~$0.001)
                        </p>
                      </div>
                    </label>

                    {/* Bitcoin (opcional) */}
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={forensicConfig.useBitcoinAnchor}
                        onChange={(e) => setForensicConfig({
                          ...forensicConfig,
                          useBitcoinAnchor: e.target.checked
                        })}
                        className="mt-1 w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Registro en Bitcoin (opcional)
                        </p>
                        <p className="text-xs text-gray-500">
                          Máxima inmutabilidad (proceso lento: 4-24 horas)
                        </p>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* Botón Siguiente */}
              <button
                onClick={() => setStep(2)}
                disabled={!file}
                className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg px-5 py-3 font-medium transition-colors"
              >
                Siguiente
              </button>
            </div>
          )}

          {/* PASO 2: FIRMAR */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Firma legal (opcional)
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Podés agregar tu firma para darle validez legal al documento
                </p>

                {/* Opciones de firma */}
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-cyan-500 transition-colors">
                    <input
                      type="radio"
                      name="signature-mode"
                      checked={signatureMode === 'none'}
                      onChange={() => setSignatureMode('none')}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Solo certificación (sin firma)
                      </p>
                      <p className="text-xs text-gray-500">
                        Certifica que el documento existe en esta fecha sin firmarlo
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-cyan-500 transition-colors">
                    <input
                      type="radio"
                      name="signature-mode"
                      checked={signatureMode === 'signnow'}
                      onChange={() => setSignatureMode('signnow')}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Firma legal con SignNow (recomendado)
                      </p>
                      <p className="text-xs text-gray-500">
                        Firma con validez legal internacional (eIDAS, ESIGN, UETA)
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-cyan-500 transition-colors">
                    <input
                      type="radio"
                      name="signature-mode"
                      checked={signatureMode === 'canvas'}
                      onChange={() => setSignatureMode('canvas')}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Firma manual simple
                      </p>
                      <p className="text-xs text-gray-500">
                        Dibujá tu firma (solo para uso interno)
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Canvas de firma manual */}
              {signatureMode === 'canvas' && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-2">
                    Firmá aquí con tu dedo o mouse
                  </p>
                  <canvas
                    ref={canvasRef}
                    className="w-full h-32 border border-gray-300 rounded bg-white cursor-crosshair"
                    {...handlers}
                  ></canvas>
                  <button
                    onClick={clearCanvas}
                    className="mt-2 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Limpiar
                  </button>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-5 py-3 font-medium transition-colors"
                >
                  Atrás
                </button>
                <button
                  onClick={handleCertify}
                  disabled={loading}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-300 text-white rounded-lg px-5 py-3 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Certificando...
                    </>
                  ) : (
                    'Certificar'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: LISTO */}
          {step === 3 && certificateData && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />

              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Tu certificado está listo
              </h3>

              <p className="text-sm text-gray-600 mb-8 max-w-md mx-auto">
                Guardamos tu documento original y tu certificado .ECO en tu cuenta. Podés descargarlos cuando quieras
              </p>

              {/* Botones de acción */}
              <div className="flex flex-col gap-3 max-w-sm mx-auto">
                <a
                  href={certificateData.downloadUrl}
                  download
                  className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg px-5 py-3 font-medium transition-colors inline-block"
                >
                  Descargar .ECO
                </a>
                <button
                  onClick={resetAndClose}
                  className="border border-cyan-600 text-cyan-600 hover:bg-cyan-50 rounded-lg px-5 py-3 font-medium transition-colors"
                >
                  Ver en mi panel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificationModal;
