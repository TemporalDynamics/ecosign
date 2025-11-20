import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Shield, CheckCircle, XCircle, Upload, FileText, Lock, Anchor, ArrowLeft } from 'lucide-react';
import { verifyEcoxFile } from '../lib/verificationService';
import LegalProtectionOptions from '../components/LegalProtectionOptions';
import VerificationSummary from '../components/VerificationSummary';

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
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-full mb-6">
            <Search className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">Verificador Público .ECO</h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Verifica la autenticidad e integridad de cualquier documento certificado con EcoSign.
            Sin registro, sin pagos, sin barreras.
          </p>
        </div>

        {/* Transparency Notice */}
        <div className="bg-gray-100 border border-gray-200 rounded-xl p-6 mb-8">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Shield className="w-6 h-6 text-black" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-black font-semibold mb-2">Verificación Independiente y Transparente</h3>
              <p className="text-gray-700 text-sm">
                Esta herramienta valida la firma electrónica, huella digital y sello de tiempo del documento.
                La verificación se realiza localmente en tu navegador - el archivo nunca se guarda en nuestros servidores.
                Para máxima confianza, puedes verificar la constancia pública de forma independiente.
              </p>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-xl p-8 border-2 border-gray-200 mb-8">
          {/* .ECOX File Upload */}
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
              dragging
                ? 'border-black bg-gray-100'
                : 'border-gray-300 hover:border-black bg-white'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-full mb-4">
              <Upload className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-semibold text-black mb-2">
              Arrastra tu archivo .ECO aquí
            </h3>
            <p className="text-gray-600 mb-6">o haz clic para seleccionar</p>

            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="bg-black hover:bg-gray-800 text-white font-semibold px-8 py-3 rounded-lg inline-block transition duration-300">
                Seleccionar .ECO
              </span>
              <input
                id="file-upload"
                type="file"
                accept=".eco"
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
              <div className="mt-6 p-4 bg-gray-100 border border-gray-200 rounded-lg">
                <p className="text-black font-medium flex items-center justify-center">
                  <FileText className="w-4 h-4 mr-2" />
                  {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              </div>
            )}
          </div>

          {/* Original File Upload for Hash Verification */}
          {file && !result && (
            <div className="mt-6 p-6 bg-gray-100 border border-gray-200 rounded-xl">
              <div className="flex items-center space-x-3 mb-4">
                <Lock className="w-5 h-5 text-black" />
                <h4 className="text-lg font-semibold text-black">Verificación Byte-a-Byte</h4>
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
              className="w-full mt-6 bg-black hover:bg-gray-800 text-white font-bold py-4 rounded-lg transition duration-300"
            >
              Verificar Documento
            </button>
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

        {/* Info Section */}
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

      {/* Footer */}
      <footer className="bg-black py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <span className="text-2xl font-bold text-[#0E4B8B]">EcoSign</span>
              <p className="text-sm text-gray-400 mt-3">Certificación digital con privacidad total</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Producto</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/how-it-works" className="hover:text-[#0E4B8B] hover:underline transition">Cómo funciona</Link></li>
                <li><Link to="/pricing" className="hover:text-[#0E4B8B] hover:underline transition">Precios</Link></li>
                <li><Link to="/verify" className="hover:text-[#0E4B8B] hover:underline transition">Verificar</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/terms" className="hover:text-[#0E4B8B] hover:underline transition">Términos</Link></li>
                <li><Link to="/privacy" className="hover:text-[#0E4B8B] hover:underline transition">Privacidad</Link></li>
                <li><Link to="/security" className="hover:text-[#0E4B8B] hover:underline transition">Seguridad</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Soporte</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/help" className="hover:text-[#0E4B8B] hover:underline transition">Ayuda</Link></li>
                <li><Link to="/contact" className="hover:text-[#0E4B8B] hover:underline transition">Contacto</Link></li>
                <li><Link to="/status" className="hover:text-[#0E4B8B] hover:underline transition">Estado</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 space-y-3 text-sm text-gray-400 border-t border-gray-800">
            <p>© 2025 EcoSign. Todos los derechos reservados.</p>
            <p>EcoSign es un servicio independiente de certificación y firma digital.</p>
            <p>El formato .ECO y los procesos forenses están sujetos a protección de propiedad intelectual en trámite.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default VerifyPage;
