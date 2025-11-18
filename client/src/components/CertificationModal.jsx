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
  Users,
  Maximize2,
  Minimize2,
  Eye,
  Pen,
  Highlighter,
  Type
} from 'lucide-react';
import { certifyFile, downloadEcox } from '../lib/basicCertificationWeb';
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

  // Configuración de blindaje forense (por defecto desactivado - usuario debe elegir conscientemente)
  const [forensicEnabled, setForensicEnabled] = useState(false);
  const [forensicConfig, setForensicConfig] = useState({
    useLegalTimestamp: true,    // RFC 3161
    usePolygonAnchor: true,      // Polygon
    useBitcoinAnchor: false      // Bitcoin
  });

  // Firmas múltiples (workflow)
  const [multipleSignatures, setMultipleSignatures] = useState(false);
  const [signers, setSigners] = useState([]);
  const [emailInputs, setEmailInputs] = useState([
    { email: '', requireLogin: true, requireNda: true },
    { email: '', requireLogin: true, requireNda: true },
    { email: '', requireLogin: true, requireNda: true }
  ]); // 3 campos por defecto con configuración

  // Firma legal (opcional)
  const [signatureMode, setSignatureMode] = useState('none'); // 'none', 'canvas', 'signnow'
  const { canvasRef, hasSignature, clearCanvas, getSignatureData, handlers } = useSignatureCanvas();

  // Preview del documento
  const [documentPreview, setDocumentPreview] = useState(null);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [showSignatureOnPreview, setShowSignatureOnPreview] = useState(false);
  const [annotationMode, setAnnotationMode] = useState(null); // 'signature', 'highlight', 'text'
  const [annotations, setAnnotations] = useState([]); // Lista de anotaciones (highlights y textos)

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      console.log('Archivo seleccionado:', selectedFile.name);

      // Generar preview según el tipo de archivo
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setDocumentPreview(event.target.result);
        };
        reader.readAsDataURL(selectedFile);
      } else if (selectedFile.type === 'application/pdf') {
        // Para PDFs, usar el URL directo
        const url = URL.createObjectURL(selectedFile);
        setDocumentPreview(url);
      } else {
        // Para otros tipos, mostrar icono genérico
        setDocumentPreview(null);
      }
    }
  };

  const handleAddEmailField = () => {
    setEmailInputs([...emailInputs, { email: '', requireLogin: true, requireNda: true }]);
  };

  const handleRemoveEmailField = (index) => {
    if (emailInputs.length <= 1) return; // Mantener al menos 1 campo
    const newInputs = emailInputs.filter((_, idx) => idx !== index);
    setEmailInputs(newInputs);
  };

  const handleEmailChange = (index, value) => {
    const newInputs = [...emailInputs];
    newInputs[index] = { ...newInputs[index], email: value };
    setEmailInputs(newInputs);
  };

  const handleToggleLogin = (index) => {
    const newInputs = [...emailInputs];
    newInputs[index] = { ...newInputs[index], requireLogin: !newInputs[index].requireLogin };
    setEmailInputs(newInputs);
  };

  const handleToggleNda = (index) => {
    const newInputs = [...emailInputs];
    newInputs[index] = { ...newInputs[index], requireNda: !newInputs[index].requireNda };
    setEmailInputs(newInputs);
  };

  const buildSignersList = () => {
    // Construir lista de firmantes desde los campos con email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validSigners = emailInputs
      .filter(input => input.email.trim() && emailRegex.test(input.email.trim()))
      .map((input, idx) => ({
        email: input.email.trim(),
        order: idx + 1,
        requireLogin: input.requireLogin,
        requireNda: input.requireNda,
        quickAccess: false
      }));

    // Eliminar duplicados por email
    const seen = new Set();
    return validSigners.filter(signer => {
      if (seen.has(signer.email)) return false;
      seen.add(signer.email);
      return true;
    });
  };

  const handleCertify = async () => {
    if (!file) return;

    setLoading(true);
    try {
      // Obtener datos de firma si está en modo canvas
      const signatureData = signatureMode === 'canvas' ? getSignatureData() : null;

      // 1. Certificar (con blindaje forense solo si está activado)
      const certResult = await certifyFile(file, {
        useLegalTimestamp: forensicEnabled && forensicConfig.useLegalTimestamp,
        usePolygonAnchor: forensicEnabled && forensicConfig.usePolygonAnchor,
        useBitcoinAnchor: forensicEnabled && forensicConfig.useBitcoinAnchor,
        signatureData: signatureData
      });

      // 2. Guardar en Supabase
      await saveUserDocument(file, certResult.ecoData, {
        hasLegalTimestamp: forensicEnabled && forensicConfig.useLegalTimestamp,
        hasBitcoinAnchor: forensicEnabled && forensicConfig.useBitcoinAnchor
      });

      // 3. Preparar datos para download
      setCertificateData({
        ...certResult,
        downloadUrl: URL.createObjectURL(new Blob([certResult.ecoxBuffer], { type: 'application/zip' })),
        fileName: certResult.fileName
      });

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
    setMultipleSignatures(false);
    setSigners([]);
    setEmailInputs([
      { email: '', requireLogin: true, requireNda: true },
      { email: '', requireLogin: true, requireNda: true },
      { email: '', requireLogin: true, requireNda: true }
    ]); // Reset a 3 campos vacíos
    setForensicEnabled(false);
    setDocumentPreview(null);
    setPreviewFullscreen(false);
    setShowSignatureOnPreview(false);
    setAnnotationMode(null);
    setAnnotations([]);
    clearCanvas();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl transition-all duration-300 ${
        multipleSignatures ? 'max-w-5xl' : 'max-w-2xl'
      }`}>
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
                Paso 1
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
                Paso 2
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
                Paso 3
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`${multipleSignatures ? 'grid grid-cols-[1fr,400px]' : ''}`}>
          {/* Columna principal */}
          <div className="px-6 py-6">
            {/* PASO 1: ELEGIR ARCHIVO */}
            {step === 1 && (
              <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Elegí tu archivo
                </h3>

                {/* Zona de drop / Preview del documento */}
                {!file ? (
                  <label className="block border-2 border-dashed border-gray-300 rounded-xl py-12 text-center hover:border-cyan-500 transition-colors cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    />
                    <FileText className="w-12 h-12 text-cyan-600 mx-auto mb-4" />
                    <p className="text-sm text-gray-900 font-medium">
                      Arrastrá tu documento o hacé clic para elegirlo
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      PDF, Word, Excel, imágenes (máx 50MB)
                    </p>
                  </label>
                ) : (
                  <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                    {/* Header del preview */}
                    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {documentPreview && (
                          <>
                            <button
                              onClick={() => {
                                setAnnotationMode(annotationMode === 'signature' ? null : 'signature');
                                setShowSignatureOnPreview(annotationMode !== 'signature');
                              }}
                              className={`p-2 rounded-lg transition-colors ${
                                annotationMode === 'signature'
                                  ? 'bg-cyan-100 text-cyan-700'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                              title="Firmar documento"
                            >
                              <Pen className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setAnnotationMode(annotationMode === 'highlight' ? null : 'highlight')}
                              className={`p-2 rounded-lg transition-colors ${
                                annotationMode === 'highlight'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                              title="Resaltar texto (marcar desacuerdos)"
                            >
                              <Highlighter className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setAnnotationMode(annotationMode === 'text' ? null : 'text')}
                              className={`p-2 rounded-lg transition-colors ${
                                annotationMode === 'text'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                              title="Agregar texto (modificaciones)"
                            >
                              <Type className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setPreviewFullscreen(!previewFullscreen)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Pantalla completa"
                            >
                              {previewFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            </button>
                          </>
                        )}
                        <label className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer" title="Cambiar archivo">
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleFileSelect}
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                          />
                          <Upload className="w-4 h-4" />
                        </label>
                      </div>
                    </div>

                    {/* Preview del contenido */}
                    <div className={`relative ${previewFullscreen ? 'h-[60vh]' : 'h-96'} bg-gray-100 flex items-center justify-center`}>
                      {documentPreview ? (
                        <>
                          {file.type.startsWith('image/') ? (
                            <img
                              src={documentPreview}
                              alt="Preview"
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : file.type === 'application/pdf' ? (
                            <iframe
                              src={documentPreview}
                              className="w-full h-full"
                              title="PDF Preview"
                            />
                          ) : null}

                          {/* Canvas de firma sobre el preview */}
                          {showSignatureOnPreview && (
                            <div className="absolute inset-0 bg-black bg-opacity-5 flex items-center justify-center">
                              <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4">
                                <div className="flex justify-between items-center mb-4">
                                  <h4 className="font-semibold text-gray-900">Firmá tu documento</h4>
                                  <button
                                    onClick={() => setShowSignatureOnPreview(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                </div>
                                <canvas
                                  ref={canvasRef}
                                  className="w-full h-32 border-2 border-gray-300 rounded-lg cursor-crosshair bg-white"
                                  {...handlers}
                                />
                                <div className="flex gap-2 mt-4">
                                  <button
                                    onClick={clearCanvas}
                                    className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    Limpiar
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowSignatureOnPreview(false);
                                      setSignatureMode('canvas');
                                    }}
                                    className="flex-1 py-2 px-4 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                                    disabled={!hasSignature}
                                  >
                                    Aplicar firma
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center text-gray-500">
                          <FileText className="w-16 h-16 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Vista previa no disponible</p>
                          <p className="text-xs">El archivo se procesará al certificar</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Switch: Firmas múltiples */}
              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-cyan-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Firmas múltiples
                    </p>
                    <p className="text-xs text-gray-500">
                      Crear workflow de firma secuencial
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={multipleSignatures}
                    onChange={(e) => setMultipleSignatures(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                </label>
              </div>

              {/* Switch: Blindaje Forense */}
              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-cyan-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Blindaje forense
                    </p>
                    <p className="text-xs text-gray-500">
                      Protección adicional con timestamps y blockchain
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forensicEnabled}
                    onChange={(e) => {
                      setForensicEnabled(e.target.checked);
                      if (e.target.checked) {
                        setForensicPanelOpen(true);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                </label>
              </div>

              {/* Panel de opciones de Blindaje Forense (solo cuando está ON) */}
              {forensicEnabled && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setForensicPanelOpen(!forensicPanelOpen)}
                    className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-700">
                      Configurar opciones de blindaje
                    </p>
                    {forensicPanelOpen ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {forensicPanelOpen && (
                    <div className="p-4 space-y-3 bg-white border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-3">
                        Elegí las capas de protección forense para tu certificado
                      </p>

                      {/* RFC 3161 Timestamp */}
                      <label className="flex items-start gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
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
                            RFC 3161 Timestamp
                          </p>
                          <p className="text-xs text-gray-500">
                            Sello de tiempo certificado por autoridad de confianza
                          </p>
                        </div>
                      </label>

                      {/* Polygon Blockchain */}
                      <label className="flex items-start gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
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
                            Polygon Blockchain
                          </p>
                          <p className="text-xs text-gray-500">
                            Registro inmutable en blockchain pública (confirmación en 30 segundos)
                          </p>
                        </div>
                      </label>

                      {/* Bitcoin Blockchain */}
                      <label className="flex items-start gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
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
                            Bitcoin Blockchain
                          </p>
                          <p className="text-xs text-gray-500">
                            Anclaje permanente en Bitcoin (confirmación en 4-24 horas)
                          </p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              )}

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
                  download={certificateData.fileName}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg px-5 py-3 font-medium transition-colors inline-block text-center"
                >
                  Descargar .ECOX
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

          {/* Panel lateral de firmantes (solo visible si multipleSignatures está ON) */}
          {multipleSignatures && (
            <div className="bg-gray-50 border-l border-gray-200 px-6 py-6 overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Firmantes
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Agregá los emails de las personas que deben firmar (en orden secuencial)
              </p>

              {/* Campos de email con switches individuales */}
              <div className="space-y-4 mb-4">
                {emailInputs.map((input, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                    {/* Header con número y campo email */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {index + 1}
                      </div>
                      <input
                        type="email"
                        value={input.email}
                        onChange={(e) => handleEmailChange(index, e.target.value)}
                        placeholder="email@ejemplo.com"
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                      {emailInputs.length > 1 && (
                        <button
                          onClick={() => handleRemoveEmailField(index)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                          title="Eliminar firmante"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Switches de seguridad */}
                    <div className="flex gap-3 ml-8">
                      {/* Switch Login */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={input.requireLogin}
                          onChange={() => handleToggleLogin(index)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600 relative"></div>
                        <span className={`text-xs font-medium ${input.requireLogin ? 'text-cyan-700' : 'text-gray-500'}`}>
                          Login
                        </span>
                      </label>

                      {/* Switch NDA */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={input.requireNda}
                          onChange={() => handleToggleNda(index)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 relative"></div>
                        <span className={`text-xs font-medium ${input.requireNda ? 'text-emerald-700' : 'text-gray-500'}`}>
                          NDA
                        </span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botón para agregar más firmantes */}
              <button
                onClick={handleAddEmailField}
                className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-cyan-500 hover:text-cyan-600 transition-colors flex items-center justify-center gap-2 mb-4"
              >
                <Users className="w-4 h-4" />
                Agregar otro firmante
              </button>

              {/* Info de seguridad */}
              <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                <div className="flex gap-2">
                  <Shield className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-cyan-900">
                      Configuración por firmante
                    </p>
                    <p className="text-xs text-cyan-700 mt-1">
                      Cada firmante puede tener diferentes requisitos de seguridad según tus necesidades
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificationModal;
