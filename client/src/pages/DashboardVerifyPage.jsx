import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Search, Shield, CheckCircle, XCircle, Upload, FileText, Lock, Anchor, AlertTriangle, Download, ArrowLeft } from 'lucide-react';
import { verifyEcoxFile } from '../lib/verificationService';

// Browser fingerprinting (simple)
function getBrowserFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('fingerprint', 2, 2);

  return canvas.toDataURL().slice(-50); // Últimos 50 chars
}

// Configuración de validación
const ALLOWED_EXTENSIONS = ['.eco', '.ecox', '.pdf', '.zip'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = [
  'application/octet-stream', // .eco, .ecox
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  '' // Algunos navegadores no establecen MIME para archivos desconocidos
];

function DashboardVerifyPage() {
  const navigate = useNavigate();
  const { hash } = useParams();
  const [file, setFile] = useState(null);
  const [originalFile, setOriginalFile] = useState(null); // New: Store original file
  const [dragging, setDragging] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [showDownloadWarning, setShowDownloadWarning] = useState(false);
  const [downloadFileDetails, setDownloadFileDetails] = useState(null);

  const viewStartTime = useRef(Date.now());

  const verificationLayers = useMemo(() => ([
    {
      key: 'format',
      title: 'Formato .ECOX',
      description: 'Estructura del contenedor y manifiesto JSON'
    },
    {
      key: 'manifest',
      title: 'Manifiesto',
      description: 'Campos obligatorios y assets declarados'
    },
    {
      key: 'signature',
      title: 'Firma Ed25519',
      description: 'Integridad criptográfica (clave pública ↔ firma)'
    },
    {
      key: 'hash',
      title: 'Hash del Documento',
      description: 'Comparación SHA-256 declarada vs. calculada'
    },
    {
      key: 'timestamp',
      title: 'Timestamp Forense',
      description: 'Fecha y hora registradas en el certificado'
    },
    {
      key: 'legalTimestamp',
      title: 'Sello Legal (RFC 3161)',
      description: 'Token TSR emitido por la Time Stamp Authority',
      optional: true
    }
  ]), []);

  // Track scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const percentage = Math.round((scrollTop / docHeight) * 100);
      setScrollPercentage(Math.max(scrollPercentage, percentage));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollPercentage]);

  // Track verification access
  const trackAccess = async (documentHash, documentName, downloaded = false, ndaAccepted = false) => {
    const viewDuration = Math.floor((Date.now() - viewStartTime.current) / 1000);

    try {
      const response = await fetch('/api/track-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentHash: documentHash,
          documentName: documentName,
          userAgent: navigator.userAgent,
          browserFingerprint: getBrowserFingerprint(),
          viewedDuration: viewDuration,
          scrollPercentage: scrollPercentage,
          downloaded: downloaded,
          ndaAccepted: ndaAccepted
        })
      });

      if (!response.ok) {
        console.error('Error tracking verification:', await response.text());
      }
    } catch (error) {
      console.error('Error tracking verification:', error);
    }
  };

  // Function to handle the actual download
  const performDownload = async (ecoxFile, fileName, manifestHash) => {
    try {
      const url = URL.createObjectURL(ecoxFile);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Log the download event
      await trackAccess(manifestHash, fileName, true, ndaAccepted);
      console.log('✅ File downloaded and event logged.');
    } catch (error) {
      console.error('Error during download:', error);
    }
  };

  const handleDownloadClick = (ecoxFile, fileName, manifestHash) => {
    setDownloadFileDetails({ ecoxFile, fileName, manifestHash });
    setShowDownloadWarning(true);
  };

  const confirmDownload = () => {
    setShowDownloadWarning(false);
    if (downloadFileDetails) {
      performDownload(downloadFileDetails.ecoxFile, downloadFileDetails.fileName, downloadFileDetails.manifestHash);
      setDownloadFileDetails(null);
    }
  };

  const cancelDownload = () => {
    setShowDownloadWarning(false);
    setDownloadFileDetails(null);
    console.log('Download cancelled by user.');
  };

  // Validar archivo
  const validateFile = (file) => {
    if (!file) {
      return { valid: false, error: 'No se seleccionó ningún archivo' };
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `El archivo excede el límite de 50MB (tamaño: ${(file.size / 1024 / 1024).toFixed(2)}MB)`
      };
    }

    // Validar tamaño mínimo (evitar archivos vacíos)
    if (file.size === 0) {
      return { valid: false, error: 'El archivo está vacío' };
    }

    // Validar extensión
    const fileName = file.name.toLowerCase();
    const ext = fileName.substring(fileName.lastIndexOf('.'));

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return {
        valid: false,
        error: `Extensión no permitida. Solo se aceptan: ${ALLOWED_EXTENSIONS.join(', ')}`
      };
    }

    // Validar MIME type
    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Tipo de archivo no permitido (${file.type})`
      };
    }

    return { valid: true };
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];

    if (selectedFile) {
      const validation = validateFile(selectedFile);

      if (!validation.valid) {
        setValidationError(validation.error);
        setFile(null);
        setResult(null);
        setOriginalFile(null);
        return;
      }

      setFile(selectedFile);
      setValidationError(null);
      setResult(null);
      setOriginalFile(null); // Reset original file when new .ecox is selected
    }
  };

  // New: Handle original file change
  const handleOriginalFileChange = (e) => {
    const selectedFile = e.target.files[0];

    if (selectedFile) {
      setOriginalFile(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];

    if (droppedFile) {
      const validation = validateFile(droppedFile);

      if (!validation.valid) {
        setValidationError(validation.error);
        setFile(null);
        setResult(null);
        return;
      }

      setFile(droppedFile);
      setValidationError(null);
      setResult(null);
    }
  };

  const verifyFile = async () => {
    if (!file) return;

    setVerifying(true);

    try {
      console.log('🔍 Starting verification with VerificationService...');

      // Use the new comprehensive verification service
      // Pass the original file if provided for byte-to-byte hash comparison
      const verificationResult = await verifyEcoxFile(file, originalFile);

      console.log('✅ Verification complete:', verificationResult);

      setResult(verificationResult);

      // Track successful verification
      if (verificationResult.valid) {
        const data = verificationResult.data || {};
        const manifestHash = data.hash || data.assets?.[0]?.hash || null;

        await trackAccess(
          manifestHash,
          data.fileName || file.name
        );
      }
    } catch (error) {
      console.error('❌ Verification error:', error);
      setResult({
        valid: false,
        error: `Error al procesar el archivo: ${error.message}`,
        originalFileHash: null,
        manifestHash: null,
        checks: {
          format: { passed: false, message: error.message }
        }
      });
    }

    setVerifying(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-cyan-50">
      {/* Dashboard Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/dashboard" className="flex items-center space-x-3">
              <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">VerifySign</span>
            </Link>
            <div className="flex items-center space-x-6">
              <Link to="/dashboard" className="text-gray-600 hover:text-cyan-600 transition duration-200 font-medium flex items-center">
                <ArrowLeft className="w-4 h-4 mr-1" /> Volver al Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-100 to-blue-200 rounded-full mb-6">
            <Search className="w-10 h-10 text-cyan-600" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Verificador .ECO del Dashboard</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Verifica la autenticidad e integridad de tus documentos certificados con VerifySign desde el espacio seguro de tu dashboard.
          </p>
        </div>

        {/* Transparency Notice */}
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-6 mb-8">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Shield className="w-6 h-6 text-cyan-600" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-gray-900 font-semibold mb-2">Verificación Independiente y Transparente</h3>
              <p className="text-gray-700 text-sm">
                Esta herramienta valida la firma criptográfica, hash SHA-256 y timestamp del documento.
                La verificación se realiza localmente en tu navegador - el archivo nunca se sube a nuestros servidores.
                Para máxima confianza, puedes verificar el anclaje en blockchain de forma independiente.
              </p>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 mb-8">
          {/* .ECOX File Upload */}
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
              dragging
                ? 'border-cyan-500 bg-cyan-50'
                : 'border-gray-300 hover:border-cyan-400 bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-100 to-blue-200 rounded-full mb-4">
              <Upload className="w-8 h-8 text-cyan-600" strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Arrastra tu archivo .ECOX aquí
            </h3>
            <p className="text-gray-600 mb-6">o haz clic para seleccionar</p>

            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold px-8 py-3 rounded-lg inline-block transition duration-300">
                Seleccionar .ECOX
              </span>
              <input
                id="file-upload"
                type="file"
                accept=".eco,.ecox"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {validationError && (
              <div className="mt-6 p-4 bg-red-50 border border-red-300 rounded-lg">
                <p className="text-red-700 font-medium flex items-center justify-center">
                  <XCircle className="w-5 h-5 mr-2" />
                  {validationError}
                </p>
              </div>
            )}

            {file && !validationError && (
              <div className="mt-6 p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
                <p className="text-cyan-700 font-medium flex items-center justify-center">
                  <FileText className="w-4 h-4 mr-2" />
                  {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              </div>
            )}
          </div>

          {/* Original File Upload for Hash Verification */}
          {file && !result && (
            <div className="mt-6 p-6 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center space-x-3 mb-4">
                <Lock className="w-5 h-5 text-cyan-600" />
                <h4 className="text-lg font-semibold text-gray-900">Verificación Byte-a-Byte</h4>
              </div>

              <p className="text-gray-600 mb-4 text-sm">
                Sube el archivo original para verificar que coincide exactamente con el certificado.
                Esto confirma que no ha sido modificado desde la certificación.
              </p>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-3">Arrastra el archivo original aquí</p>

                <label htmlFor="original-file-upload" className="cursor-pointer">
                  <span className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 font-medium px-6 py-2 rounded-lg inline-block transition duration-300 text-sm">
                    Seleccionar Archivo Original
                  </span>
                  <input
                    id="original-file-upload"
                    type="file"
                    onChange={handleOriginalFileChange}
                    className="hidden"
                  />
                </label>

                {originalFile && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-700 font-medium flex items-center justify-center text-sm">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {originalFile.name} ({(originalFile.size / 1024).toFixed(2)} KB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {file && !verifying && !result && (
            <button
              onClick={verifyFile}
              className="w-full mt-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 rounded-lg transition duration-300 shadow-md hover:shadow-lg"
            >
              Verificar Documento
            </button>
          )}

          {verifying && (
            <div className="mt-6 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-600 mb-4"></div>
              <p className="text-gray-700">Verificando integridad criptográfica...</p>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
            {(() => {
              const checks = result.checks || {};
              const data = result.data || {};
              const manifestHash = data.hash || data.assets?.[0]?.hash || null;
              const legalInfo = data.legalTimestampInfo;
              const legalReport = data.legalTimestampReport;
              const errorList = result.errors || [];
              const firstFailed = verificationLayers.find(layer => {
                if (layer.optional) return false;
                const currentCheck = checks[layer.key];
                return currentCheck && !currentCheck.passed;
              });

              const headerMessage = result.valid
                ? 'La prueba pasó las 5 capas obligatorias de verificación'
                : (firstFailed?.key && checks[firstFailed.key]?.message) ||
                  'Se detectaron inconsistencias en el certificado';

              const documentTimestamp = data.createdAt ? new Date(data.createdAt) : null;

              const documentHashLabel = checks.hash?.passed && checks.hash?.message?.includes('skipped')
                ? 'Hash declarado en el manifiesto'
                : 'Hash SHA-256 verificado';

              const documentHashHelp = checks.hash?.message?.includes('skipped')
                ? 'Carga el archivo original para comparar byte a byte'
                : null;

              const legalPassed = checks.legalTimestamp?.passed;

              const documentHash = manifestHash || 'No disponible';

              // Check if NDA is required
              const ndaRequired = data?.manifest?.metadata?.nda?.required;
              const showNDA = ndaRequired && !ndaAccepted;

              // If NDA is required and not accepted, show NDA screen first
              if (showNDA) {
                return (
                  <div className="max-w-2xl mx-auto">
                    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6">
                      <h2 className="text-2xl font-bold text-yellow-900 mb-4">
                        ⚠️ Acuerdo de Confidencialidad Requerido
                      </h2>

                      <div className="bg-white p-4 rounded-lg border border-yellow-300 max-h-96 overflow-y-auto mb-4">
                        <pre className="whitespace-pre-wrap text-sm text-gray-800">
                          {data?.manifest?.metadata?.nda?.text}
                        </pre>
                      </div>

                      <div className="flex items-center mb-4">
                        <input
                          type="checkbox"
                          id="nda-accept"
                          checked={ndaAccepted}
                          onChange={(e) => setNdaAccepted(e.target.checked)}
                          className="w-4 h-4 text-yellow-600"
                        />
                        <label htmlFor="nda-accept" className="ml-2 text-sm text-gray-700">
                          He leído y acepto el Acuerdo de Confidencialidad
                        </label>
                      </div>

                      <button
                        disabled={!ndaAccepted}
                        onClick={async () => {
                          // Log NDA acceptance
                          if (manifestHash) {
                            try {
                              const response = await fetch('/api/track-verification', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  documentHash: manifestHash,
                                  documentName: data.fileName || file?.name || 'Documento',
                                  userAgent: navigator.userAgent,
                                  browserFingerprint: getBrowserFingerprint(),
                                  viewedDuration: Math.floor((Date.now() - viewStartTime.current) / 1000),
                                  scrollPercentage: scrollPercentage,
                                  downloaded: false,
                                  ndaAccepted: true
                                })
                              });

                              if (response.ok) {
                                console.log('✅ NDA acceptance logged');
                              }
                            } catch (error) {
                              console.error('Error logging NDA acceptance:', error);
                            }
                          }
                        }}
                        className={`w-full ${
                          ndaAccepted
                            ? 'bg-yellow-600 hover:bg-yellow-700'
                            : 'bg-gray-300 cursor-not-allowed'
                        } text-white py-2 px-4 rounded disabled:opacity-50`}
                      >
                        Aceptar y Continuar
                      </button>
                    </div>
                  </div>
                );
              }

              const legalBadge = legalPassed ? (
                <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  RFC 3161
                </span>
              ) : null;

              return (
                <>
                  <div className="flex items-center justify-center mb-6">
                    <div className={`rounded-full p-4 border-2 ${result.valid ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                      {result.valid ? (
                        <CheckCircle className="w-16 h-16 text-green-600" strokeWidth={2.5} />
                      ) : (
                        <XCircle className="w-16 h-16 text-red-600" strokeWidth={2.5} />
                      )}
                    </div>
                  </div>

                  <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
                    {result.valid ? 'Documento Verificado' : 'Documento No Válido'}
                  </h2>
                  <p className={`text-center mb-8 ${result.valid ? 'text-gray-600' : 'text-red-600 font-medium'}`}>
                    {headerMessage}
                  </p>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-cyan-600 mb-2">Nombre del Documento</h4>
                      <p className="text-gray-900 font-medium">{data.fileName || file?.name || 'No especificado'}</p>
                      {data.author && (
                        <p className="text-sm text-gray-600">Autor: {data.author}</p>
                      )}
                      {ndaRequired && (
                        <p className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          ⚠️ Requiere NDA
                        </p>
                      )}
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-cyan-600 mb-2">Timestamp Certificado</h4>
                      {documentTimestamp ? (
                        <p className="text-gray-900">
                          {documentTimestamp.toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'long' })}
                        </p>
                      ) : (
                        <p className="text-gray-600">No disponible</p>
                      )}
                      {legalPassed && (
                        <p className="mt-1 text-sm text-green-700 font-semibold flex items-center">
                          <CheckCircle className="w-4 h-4 mr-1" /> Timestamp con validez legal
                        </p>
                      )}
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 md:col-span-2">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-cyan-600">{documentHashLabel}</h4>
                        {documentHashHelp && (
                          <span className="text-xs text-orange-600 flex items-center">
                            <AlertTriangle className="w-4 h-4 mr-1" /> {documentHashHelp}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 font-mono break-all">
                        {documentHash}
                      </p>

                      {/* Byte-to-byte comparison details */}
                      {result.originalFileHash && result.manifestHash && (
                        <div className="mt-3 pt-3 border-t border-gray-300">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-gray-700">Verificación Byte-a-Byte:</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${result.originalFileHash === result.manifestHash ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {result.originalFileHash === result.manifestHash ? 'Coincide' : 'Diferente'}
                            </span>
                          </div>

                          <div className="mt-2 space-y-2">
                            <div>
                              <span className="text-xs text-gray-500">Hash del archivo original:</span>
                              <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all mt-1">
                                {result.originalFileHash}
                              </p>
                            </div>

                            <div>
                              <span className="text-xs text-gray-500">Hash en el manifiesto:</span>
                              <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all mt-1">
                                {result.manifestHash}
                              </p>
                            </div>

                            {result.originalFileHash !== result.manifestHash && (
                              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-700 text-sm font-medium flex items-center">
                                  <XCircle className="w-4 h-4 mr-2" />
                                  ¡Advertencia! El archivo ha sido modificado desde la certificación.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {data.publicKey && (
                    <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-cyan-600 mb-2">Clave Pública del Firmante</h4>
                      <p className="text-xs text-gray-700 font-mono break-all">{data.publicKey}</p>
                    </div>
                  )}

                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Capas de Verificación</h3>
                    <div className="space-y-3">
                      {verificationLayers.map(layer => {
                        const check = checks[layer.key];
                        const status = check?.passed === undefined ? 'pending' : check.passed ? 'success' : 'fail';
                        const message = check?.message || 'Verificación no ejecutada';
                        const containerClass =
                          status === 'success'
                            ? 'bg-green-50 border-green-200'
                            : status === 'fail'
                              ? 'bg-red-50 border-red-200'
                              : 'bg-gray-50 border-gray-200';
                        const icon = status === 'success'
                          ? <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                          : status === 'fail'
                            ? <XCircle className="w-5 h-5 text-red-600 mt-1" />
                            : <AlertTriangle className="w-5 h-5 text-gray-500 mt-1" />;

                        return (
                          <div
                            key={layer.key}
                            className={`flex items-start justify-between rounded-lg border px-4 py-3 ${containerClass} ${layer.optional ? 'opacity-90' : ''}`}
                          >
                            <div>
                              <p className="text-sm font-semibold text-gray-900 flex items-center">
                                {layer.title}
                                {layer.optional && (
                                  <span className="ml-2 text-xs font-medium text-gray-500">(Opcional)</span>
                                )}
                                {layer.key === 'legalTimestamp' && legalBadge}
                              </p>
                              <p className="text-xs text-gray-600">{layer.description}</p>
                              <p className={`text-sm mt-1 ${
                                status === 'success'
                                  ? 'text-green-700'
                                  : status === 'fail'
                                    ? 'text-red-700 font-medium'
                                    : 'text-gray-600'
                              }`}>
                                {message}
                              </p>
                            </div>
                            {icon}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {legalInfo && (
                    <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5">
                      <h4 className="text-green-800 font-semibold mb-2 flex items-center">
                        ⚖️ Detalle del Sello Legal
                      </h4>
                      <dl className="grid md:grid-cols-2 gap-4 text-sm text-gray-800">
                        <div>
                          <dt className="font-semibold text-gray-700">TSA</dt>
                          <dd>{legalInfo.tsa || 'No especificada'}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-gray-700">URL de Verificación</dt>
                          <dd>{legalInfo.tsaUrl || 'N/A'}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-gray-700">Estándar</dt>
                          <dd>{legalInfo.standard || 'RFC 3161'}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-gray-700">Token</dt>
                          <dd className="font-mono text-xs break-all">
                            {legalInfo.token ? `${legalInfo.token.slice(0, 64)}...` : 'No disponible'}
                          </dd>
                        </div>
                      </dl>
                      {legalReport && (
                        <div className="mt-4 bg-white/70 border border-green-200 rounded-lg p-3 text-sm text-gray-800">
                          <p className="font-semibold text-green-900">
                            Estado del hash sellado:
                            {legalReport.hashMatches === true && ' Coincide con el manifiesto ✅'}
                            {legalReport.hashMatches === false && ' NO coincide ⚠️'}
                            {legalReport.hashMatches === null && ' No se pudo comparar'}
                          </p>
                          <p className="mt-1 font-mono text-xs break-all">
                            Hash manifiesto: {legalReport.expectedHash || manifestHash || 'N/A'}
                          </p>
                          <p className="font-mono text-xs break-all">
                            Hash en TSR: {legalReport.tokenHash || 'N/A'}
                          </p>
                          {legalReport.message && (
                            <p className="mt-1 text-xs text-green-800">{legalReport.message}</p>
                          )}
                        </div>
                      )}
                      <p className="mt-3 text-xs text-green-800">
                        El token TSR (Base64) permite revalidar la evidencia ante un perito o tribunal sin depender de VerifySign.
                      </p>
                    </div>
                  )}

                  {(errorList.length > 0 || result.error) && (
                    <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-red-800 mb-2">Detalle de inconsistencias</h4>
                      <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                        {result.error && <li>{result.error}</li>}
                        {errorList.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.valid && (
                    <div className="mt-8">
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                        <h4 className="text-green-800 font-semibold mb-2 flex items-center">
                          <Shield className="w-5 h-5 mr-2" />Opciones de Protección Legal
                        </h4>
                        <p className="text-sm text-gray-800 mb-3">
                          Este documento ha sido verificado exitosamente. Puedes descargar el archivo .ECO original o compartirlo con otros.
                        </p>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => alert('Opción de notificación legal no implementada en esta vista')}
                            className="bg-white text-green-700 border border-green-600 hover:bg-green-50 px-4 py-2 rounded-lg font-medium text-sm"
                          >
                            Notificar Legalmente
                          </button>
                          <button
                            onClick={() => alert('Opción de compartir no implementada en esta vista')}
                            className="bg-white text-green-700 border border-green-600 hover:bg-green-50 px-4 py-2 rounded-lg font-medium text-sm"
                          >
                            Compartir Enlace
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 text-center">
                    {file && result && result.valid && (
                      <button
                        onClick={() => handleDownloadClick(file, data.fileName || file.name, manifestHash)}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-8 rounded-lg shadow-md transition duration-300 flex items-center justify-center"
                      >
                        <Download className="w-5 h-5 mr-2" /> Descargar .ECOX
                      </button>
                    )}
                    <div className="flex justify-center mt-4">
                      <button
                        onClick={() => {
                          setFile(null);
                          setResult(null);
                        }}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-8 py-3 rounded-lg transition duration-300 font-medium"
                      >
                        {result.valid ? 'Verificar Otro Documento' : 'Intentar Nuevamente'}
                      </button>
                      <button
                        onClick={() => navigate('/dashboard')}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-8 py-3 rounded-lg transition duration-300 font-medium ml-4"
                      >
                        Volver al Dashboard
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Download Warning Modal */}
        {showDownloadWarning && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full flex flex-col shadow-2xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <AlertTriangle className="w-6 h-6 text-orange-500 mr-2" /> Aviso Legal Importante
                </h3>
              </div>
              <div className="p-6 text-gray-700">
                <p className="mb-4">
                  La copia de este documento que está a punto de descargar ha sido criptográficamente sellada con su huella digital y un identificador de transacción único.
                </p>
                <p className="mb-4">
                  Este sello no afecta el contenido ni su validez, pero nos permite probar de manera irrefutable su origen en caso de divulgación o uso no autorizado (No-Repudiación).
                </p>
                <p className="font-semibold">
                  Al hacer clic en 'Descargar', usted acepta esta condición.
                </p>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={cancelDownload}
                  className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition duration-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDownload}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition duration-300"
                >
                  Descargar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 border border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">¿Qué verifica esta herramienta?</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-start space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <Lock className="w-6 h-6 text-cyan-600" strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-gray-900 font-semibold mb-1">Firma Criptográfica</h4>
                  <p className="text-gray-600 text-sm">
                    Verifica que el documento fue sellado con la clave privada correcta (Ed25519)
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-start space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <Shield className="w-6 h-6 text-cyan-600" strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-gray-900 font-semibold mb-1">Hash de Integridad</h4>
                  <p className="text-gray-600 text-sm">
                    Confirma que ni un solo byte ha sido modificado desde su certificación
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-start space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-cyan-600" strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-gray-900 font-semibold mb-1">Timestamp Certificado</h4>
                  <p className="text-gray-600 text-sm">
                    Establece la fecha y hora exacta de creación del certificado
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-start space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <Anchor className="w-6 h-6 text-cyan-600" strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-gray-900 font-semibold mb-1">Anclaje Blockchain</h4>
                  <p className="text-gray-600 text-sm">
                    Valida la prueba de existencia en una red pública descentralizada
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-600 text-sm">
            © 2025 VerifySign. Verificación independiente y transparente.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default DashboardVerifyPage;