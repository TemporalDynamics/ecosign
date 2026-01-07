import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Shield,
  CheckCircle,
  XCircle,
  Upload,
  FileText,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { verifyEcoxFile } from '../lib/verificationService';
import LegalProtectionOptions from '../components/LegalProtectionOptions';
import VerificationSummary from '../components/VerificationSummary';
import FooterPublic from '../components/FooterPublic';
import WorkflowVerifier from '../components/WorkflowVerifier';
import InhackeableTooltip from '../components/InhackeableTooltip';

// INTERFAZ DE RESULTADO (COINCIDE CON BACKEND)
interface VerificationServiceResult {
  valid: boolean
  fileName: string
  hash: string
  timestamp: string
  timestampType: string
  probativeSignals?: {
    anchorRequested: boolean,
    polygonConfirmed: boolean,
    bitcoinConfirmed: boolean,
    fetchError: boolean,
  }
  // ... otros campos que el backend pueda devolver
  manifest?: {
    projectId: string
    [key: string]: any
  };
  [key: string]: any; // Permite otros campos
}

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
  const [file, setFile] = useState<File | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerificationServiceResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'eco' | 'hash'>('eco');

  const validateFile = (file: File | null): { valid: boolean; error?: string } => {
    if (!file) {
      return { valid: false, error: 'Elegí un archivo para verificar.' };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `El archivo excede el límite de 50MB.` };
    }
    if (file.size === 0) {
      return { valid: false, error: 'El archivo está vacío.' };
    }
    const fileName = file.name.toLowerCase();
    const ext = fileName.substring(fileName.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return { valid: false, error: `Extensión no permitida. Solo: ${ALLOWED_EXTENSIONS.join(', ')}` };
    }
    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return { valid: false, error: `Tipo de archivo no permitido (${file.type})` };
    }
    return { valid: true };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      const validation = validateFile(selectedFile);
      if (!validation.valid) {
        setValidationError(validation.error ?? null);
        setFile(null);
        setResult(null);
        setOriginalFile(null);
        return;
      }
      setFile(selectedFile);
      setValidationError(null);
      setResult(null);
      setOriginalFile(null);
    }
  };

  const handleOriginalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      setOriginalFile(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const validation = validateFile(droppedFile);
      if (!validation.valid) {
        setValidationError(validation.error ?? null);
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
      const verificationResult = await verifyEcoxFile(file, originalFile);
      console.log('✅ Verification complete:', verificationResult);
      setResult(verificationResult);
    } catch (error) {
      console.error('❌ Verification error:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      setResult({
        valid: false,
        error: `Error al procesar el archivo: ${message}`,
        fileName: file?.name || "Unknown",
        hash: "",
        timestamp: "",
        timestampType: "",
        errors: [message],
        warnings: [],
        signature: { algorithm: "", valid: false }
      });
    }
    setVerifying(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white fixed w-full top-0 z-50">
        {/* ... Nav content ... */}
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-full mb-6">
            <Search className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">Verificador</h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Comprobá en segundos si tu certificado es auténtico.
          </p>
        </div>

        {/* ... Tab buttons ... */}

        {activeTab === 'eco' ? (
          <>
        <div className="bg-white rounded-xl p-8 border-2 border-gray-200 mb-12">
          {/* ... File upload UI ... */}
        </div>

        {result && (
          <>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-1">Resultado de la Verificación</h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Integridad del Certificado</p>
                  <p className={`text-sm font-semibold ${result.valid ? 'text-green-700' : 'text-red-700'}`}>
                    {result.valid ? '✔️ Válido' : '❌ Inválido'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Coincidencia con Original</p>
                  <p className="text-sm font-semibold">
                    {originalFile
                      ? (result as any).originalFileMatches
                        ? '✔️ El PDF coincide con el certificado.'
                        : '❌ El PDF no coincide con el certificado.'
                      : 'ℹ️ No se cargó un archivo original para comparar.'}
                  </p>
                </div>
              </div>
            </div>

            <VerificationSummary result={result} originalProvided={!!originalFile} />
            
            {/* ... Other result details ... */}

            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  setFile(null);
                  setOriginalFile(null);
                  setResult(null);
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-8 py-3 rounded-lg transition duration-300 font-medium"
              >
                Verificar otro documento
              </button>
            </div>
          </>
        )}
          </>
        ) : (
          <WorkflowVerifier className="mt-6" />
        )}
      </main>

      <FooterPublic />
    </div>
  );
}

export default VerifyPage;
