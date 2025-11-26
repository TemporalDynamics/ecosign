import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Shield, CheckCircle, XCircle, Upload, FileText, Lock, Anchor, ArrowLeft } from 'lucide-react';
import { verifyEcoxFile } from '../lib/verificationService';
import LegalProtectionOptions from '../components/LegalProtectionOptions';
import VerificationSummary from '../components/VerificationSummary';
import FooterPublic from '../components/FooterPublic';

// Configuración de validación
const ALLOWED_EXTENSIONS = ['.eco', '.pdf', '.zip'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = [
  'application/octet-stream', // .eco
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  '' // Algunos navegadores no establecen MIME para archivos desconocidos
];

function VerifyPage() {
  const [file, setFile] = useState(null);
  const [originalFile, setOriginalFile] = useState(null); // New: Store original file
  const [dragging, setDragging] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [validationError, setValidationError] = useState(null);

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
      setOriginalFile(null); // Reset original file when new .eco is selected
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
    <div className="min-h-screen bg-white">
      {/* Navigation - Same as Landing */}
      <nav className="bg-white fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center space-x-3">
              <span className="text-2xl font-bold text-[#0E4B8B]">EcoSign</span>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/how-it-works" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200">
                Cómo funciona
              </Link>
              <Link to="/verify" className="text-black font-medium text-[17px] transition duration-200">
                Verificar
              </Link>
              <Link to="/pricing" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200">
                Precios
              </Link>
              <Link to="/login" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200">
                Iniciar Sesión
              </Link>
              <Link
                to="/login"
                className="bg-black hover:bg-gray-800 text-white font-semibold px-6 py-2.5 rounded-lg transition duration-300"
              >
                Comenzar Gratis
              </Link>
            </div>
            <div className="md:hidden flex items-center space-x-4">
              <Link to="/login" className="text-gray-600 hover:text-black text-sm font-semibold">
                Login
              </Link>
              <Link
                to="/login"
                className="bg-black hover:bg-gray-800 text-white font-semibold px-4 py-2 rounded-lg text-sm"
              >
                Gratis
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-full mb-6">
            <Search className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">Verificador</h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Comprobá en segundos si tu certificado es auténtico.
          </p>
          <p className="text-lg text-gray-600 max-w-xl mx-auto mt-3">
            Todo ocurre en tu ordenador. Tu archivo nunca se sube.
          </p>
        </div>

        {/* Verificador Estándar (Gratis) */}
        <div className="bg-white rounded-xl p-8 border-2 border-gray-200 mb-12">
          <h2 className="text-3xl font-bold text-black mb-2 text-center">Verificador estándar (gratis)</h2>
          <p className="text-gray-700 mb-6 text-center">Herramienta pública y gratuita</p>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-black mb-3">Lo que hace:</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span>Revisa que el archivo .ECO esté bien formado.</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span>Valida quien, cuando y el por siempre básicos.</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span>Muestra la cadena de firmas y operaciones.</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span>Comprueba la integridad del documento frente al certificado.</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-black mb-3">Ideal para:</h3>
              <p className="text-gray-700">
                Usuarios finales, validaciones simples, auditorías rápidas y uso público.
                Lo que la mayoría necesita, sin costo.
              </p>
            </div>
          </div>

          <div className="bg-gray-100 border border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="text-black font-semibold mb-3">Transparencia de la verificación</h3>
            <p className="text-gray-700 text-sm">
              Esta herramienta valida la firma electrónica, huella digital y sello de tiempo del documento.
              La verificación se realiza localmente en tu navegador - el archivo nunca se guarda en nuestros servidores.
            </p>
          </div>

          <h3 className="text-xl font-bold text-black mb-4 text-center">Carga ambos archivos para verificar</h3>

          <div className="grid md:grid-cols-2 gap-6">
            {/* .ECO File Upload */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                dragging
                  ? 'border-[#0E4B8B] bg-blue-50'
                  : file
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-[#0E4B8B] bg-white'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-3 ${
                file ? 'bg-green-500' : 'bg-[#0E4B8B]'
              }`}>
                {file ? (
                  <CheckCircle className="w-7 h-7 text-white" strokeWidth={2.5} />
                ) : (
                  <Shield className="w-7 h-7 text-white" strokeWidth={2.5} />
                )}
              </div>

              <h3 className="text-lg font-semibold text-black mb-2">
                Certificado .ECO
              </h3>
              <p className="text-gray-600 text-sm mb-4">Arrastra o selecciona</p>

              <label htmlFor="file-upload" className="cursor-pointer">
                <span className={`font-semibold px-6 py-2.5 rounded-lg inline-block transition duration-300 text-sm ${
                  file
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-[#0E4B8B] hover:bg-[#0A66C2] text-white'
                }`}>
                  {file ? 'Cambiar .ECO' : 'Seleccionar .ECO'}
                </span>
                <input
                  id="file-upload"
                  type="file"
                  accept=".eco"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {file && !validationError && (
                <div className="mt-4 p-3 bg-white border border-green-300 rounded-lg">
                  <p className="text-green-700 font-medium flex items-center justify-center text-sm">
                    <FileText className="w-4 h-4 mr-2" />
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}
            </div>

            {/* PDF File Upload */}
            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
              originalFile
                ? 'border-green-500 bg-green-50'
                : file 
                ? 'border-gray-300 hover:border-[#0E4B8B] bg-white'
                : 'border-gray-200 bg-gray-50'
            }`}>
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-3 ${
                originalFile ? 'bg-green-500' : file ? 'bg-[#0E4B8B]' : 'bg-gray-400'
              }`}>
                {originalFile ? (
                  <CheckCircle className="w-7 h-7 text-white" strokeWidth={2.5} />
                ) : (
                  <FileText className="w-7 h-7 text-white" strokeWidth={2.5} />
                )}
              </div>
              
              <h3 className="text-lg font-semibold text-black mb-2">
                PDF Firmado
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {file ? 'Arrastra o selecciona' : 'Primero carga el .ECO'}
              </p>
              
              <label htmlFor="original-file-upload" className={`cursor-pointer ${!file ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <span className={`font-semibold px-6 py-2.5 rounded-lg inline-block transition duration-300 text-sm ${
                  !file 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : originalFile 
                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                    : 'bg-[#0E4B8B] hover:bg-[#0A66C2] text-white'
                }`}>
                  {originalFile ? 'Cambiar PDF' : 'Seleccionar PDF'}
                </span>
                <input
                  id="original-file-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleOriginalFileChange}
                  className="hidden"
                  disabled={!file}
                />
              </label>
              
              {originalFile && (
                <div className="mt-4 p-3 bg-white border border-green-300 rounded-lg">
                  <p className="text-green-700 font-medium flex items-center justify-center text-sm">
                    <FileText className="w-4 h-4 mr-2" />
                    {originalFile.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(originalFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}
            </div>
          </div>

          {validationError && (
            <div className="mt-6 p-4 bg-red-50 border border-red-300 rounded-lg">
              <p className="text-red-700 font-medium flex items-center justify-center">
                <XCircle className="w-5 h-5 mr-2" />
                {validationError}
              </p>
            </div>
          )}

          {file && originalFile && !verifying && !result && (
            <button
              onClick={verifyFile}
              className="w-full mt-6 bg-black hover:bg-gray-800 text-white font-bold py-4 rounded-lg transition duration-300 flex items-center justify-center space-x-2"
            >
              <Shield className="w-5 h-5" />
              <span>Verificar Integridad del Documento</span>
            </button>
          )}
          
          {file && !originalFile && !result && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-center font-medium flex items-center justify-center">
                <Upload className="w-5 h-5 mr-2" />
                Carga el PDF firmado para continuar con la verificación
              </p>
            </div>
          )}

          {verifying && (
            <div className="mt-6 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black mb-4"></div>
              <p className="text-gray-700">Verificando integridad digital...</p>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <>
            <VerificationSummary result={result} originalProvided={!!originalFile} />

            {result.valid && (
              <div className="mt-8">
                <LegalProtectionOptions
                  documentId={result.data?.projectId || null}
                  documentHash={result.data?.hash || result.data?.manifestHash || null}
                  userId={null}
                  originalFile={originalFile}
                  documentName={result.data?.fileName || file?.name || 'Documento certificado'}
                />
              </div>
            )}

            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  setFile(null);
                  setOriginalFile(null);
                  setResult(null);
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-8 py-3 rounded-lg transition duration-300 font-medium"
              >
                {result.valid ? 'Verificar otro documento' : 'Intentar nuevamente'}
              </button>
            </div>
          </>
        )}

        {/* Verificador forense PRO */}
        <div className="bg-blue-50 rounded-xl p-8 border-2 border-[#0E4B8B] mb-12">
          <h2 className="text-3xl font-bold text-black mb-2 text-center">Verificador forense PRO</h2>
          <p className="text-gray-700 mb-4 text-center">Auditoría avanzada para equipos legales, forenses y compliance</p>
          <p className="text-gray-700 mb-6 text-center italic">Todo lo que hace el verificador estándar, más análisis profundo de cadena de custodia y reportes listos para juicio.</p>

          <div className="grid md:grid-cols-2 gap-8 mb-6">
            <div>
              <h3 className="font-semibold text-black mb-3">Análisis avanzado:</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span>Reconstrucción completa de la cadena de custodia.</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span>Análisis de contexto de firmas y eventos de riesgo.</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span>Reportes forenses listos para litigio (PDF / JSON / XML).</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span>Validación multi-anclaje (TSA, blockchain, keeper, redundancias).</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-black mb-3">Integración y soporte:</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span>Integración con sistemas internos (API, plugins, CRMs, DMS).</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span>Actualizaciones y soporte alineados a normativa vigente.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-700 mb-4">
              Pensado para instituciones, gobiernos, estudios jurídicos y empresas que necesitan algo más que "sí / no".
              Disponible bajo licencia profesional.
            </p>
            <Link
              to="/contact"
              className="inline-block bg-black hover:bg-gray-800 text-white font-semibold px-8 py-3 rounded-lg transition duration-300"
            >
              Solicitar acceso PRO
            </Link>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 border border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">¿Qué verifica esta herramienta?</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-start space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <Lock className="w-6 h-6 text-black" strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-gray-900 font-semibold mb-1">Firma Electrónica</h4>
                  <p className="text-gray-600 text-sm">
                    Comprueba que el certificado proviene de EcoSign y no fue adulterado.
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-start space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <Shield className="w-6 h-6 text-black" strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-gray-900 font-semibold mb-1">Huella de Integridad</h4>
                  <p className="text-gray-600 text-sm">
                    Detecta si el archivo cambió aunque sea 1 byte desde la certificación.
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-start space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-black" strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-gray-900 font-semibold mb-1">Timestamp Certificado</h4>
                  <p className="text-gray-600 text-sm">
                    Fija la fecha exacta en la que el documento existía con ese contenido.
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-start space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <Anchor className="w-6 h-6 text-black" strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-gray-900 font-semibold mb-1">Verificación Pública</h4>
                  <p className="text-gray-600 text-sm">
                    Permite validar la prueba sin depender de EcoSign ni de nuestros servidores.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <FooterPublic />
    </div>
  );
}

export default VerifyPage;
