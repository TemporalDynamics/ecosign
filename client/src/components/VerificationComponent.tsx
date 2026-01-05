import React, { useState, useCallback } from 'react';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { verifyEcoWithOriginal } from '../lib/verificationService';

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
  anchors?: {
    polygon?: { status?: string } | null;
    bitcoin?: { status?: string } | null;
  } | null;
  errors?: string[];
  warnings?: string[];
  error?: string;
  [key: string]: any; // Permite otros campos
}

const buildEvidenceItems = (result: VerificationServiceResult): string[] => {
  const items: string[] = [];

  if (result.valid) {
    items.push('Integridad criptográfica verificada.');
  }

  if (result.signatureValid) {
    items.push('Existe una firma registrada en el certificado.');
  }

  if (result.timestamp) {
    items.push('Existe un sello de tiempo en el certificado.');
  }

  const polygonConfirmed =
    result.anchors?.polygon?.status === 'confirmed' ||
    result.probativeSignals?.polygonConfirmed;
  const bitcoinConfirmed =
    result.anchors?.bitcoin?.status === 'confirmed' ||
    result.probativeSignals?.bitcoinConfirmed;

  if (polygonConfirmed) {
    items.push('Existe un anclaje público confirmado (Polygon).');
  }

  if (bitcoinConfirmed) {
    items.push('Existe un anclaje público confirmado (Bitcoin).');
  }

  return items;
};


interface VerificationComponentProps {
  initialFile?: File | null;
}

const VerificationComponent: React.FC<VerificationComponentProps> = ({ initialFile = null }) => {
  const [ecoFile, setEcoFile] = useState<File | null>(initialFile ?? null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationServiceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleEcoFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setEcoFile(selectedFile);
      setVerificationResult(null);
      setError(null);
    }
  }, []);

  const handlePdfFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setPdfFile(selectedFile);
      setVerificationResult(null);
      setError(null);
    }
  }, []);

  const handleVerify = useCallback(async () => {
    if (!ecoFile || !pdfFile) {
      setError('Por favor selecciona ambos archivos (.ECO y PDF firmado)');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const result = await verifyEcoWithOriginal(ecoFile, pdfFile);
      setVerificationResult(result);
      if (!result.valid) {
        setError(result.error || result.errors?.join(', ') || 'La verificación falló');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar el archivo');
    } finally {
      setIsVerifying(false);
    }
  }, [ecoFile, pdfFile]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, type: 'eco' | 'pdf') => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (type === 'eco' && droppedFile.name.endsWith('.eco')) {
        setEcoFile(droppedFile);
        setVerificationResult(null);
        setError(null);
      } else if (type === 'pdf' && droppedFile.type === 'application/pdf') {
        setPdfFile(droppedFile);
        setVerificationResult(null);
        setError(null);
      }
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const evidenceItems = verificationResult ? buildEvidenceItems(verificationResult) : [];

  return (
    <div className="space-y-6">
      {/* Dual Upload Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* ECO File Upload */}
        <div 
          className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-[#0A66C2] transition-colors duration-300 bg-white"
          onDrop={(e) => handleDrop(e, 'eco')}
          onDragOver={handleDragOver}
        >
          <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-7 h-7 text-white" strokeWidth={2} />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Certificado .ECO
          </h3>
          
          <p className="text-sm text-gray-600 mb-4">
            Arrastra el archivo .ECO aquí
          </p>
          
          <label htmlFor="eco-upload" className="cursor-pointer">
            <span className="inline-block bg-black hover:bg-gray-800 text-white font-medium py-2 px-5 rounded-lg transition duration-200">
              Seleccionar .ECO
            </span>
            <input
              id="eco-upload"
              type="file"
              accept=".eco"
              onChange={handleEcoFileChange}
              className="hidden"
            />
          </label>
          
          {ecoFile && (
            <div className="mt-4 p-2.5 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm font-medium flex items-center justify-center gap-2">
                <FileCheck className="w-4 h-4" />
                {ecoFile.name}
              </p>
            </div>
          )}
        </div>

        {/* PDF File Upload */}
        <div 
          className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-[#0A66C2] transition-colors duration-300 bg-white"
          onDrop={(e) => handleDrop(e, 'pdf')}
          onDragOver={handleDragOver}
        >
          <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-7 h-7 text-white" strokeWidth={2} />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            PDF Firmado
          </h3>
          
          <p className="text-sm text-gray-600 mb-4">
            Arrastra el PDF firmado aquí
          </p>
          
          <label htmlFor="pdf-upload" className="cursor-pointer">
            <span className="inline-block bg-black hover:bg-gray-800 text-white font-medium py-2 px-5 rounded-lg transition duration-200">
              Seleccionar PDF
            </span>
            <input
              id="pdf-upload"
              type="file"
              accept="application/pdf"
              onChange={handlePdfFileChange}
              className="hidden"
            />
          </label>
          
          {pdfFile && (
            <div className="mt-4 p-2.5 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm font-medium flex items-center justify-center gap-2">
                <FileCheck className="w-4 h-4" />
                {pdfFile.name}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && !verificationResult?.valid && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-red-800 font-semibold">Error de Verificación</h4>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Verification Button */}
      {ecoFile && pdfFile && !verificationResult && (
        <div className="text-center">
          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className="bg-[#0A66C2] hover:bg-[#0E4B8B] text-white font-semibold py-3 px-8 rounded-lg transition duration-200 flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Verificando...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Verificar Certificado
              </>
            )}
          </button>
        </div>
      )}

      {/* Verification Result */}
      {verificationResult && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className={`p-6 ${verificationResult.valid ? 'bg-green-50 border-b border-green-200' : 'bg-red-50 border-b border-red-200'}`}>
            <div className="flex items-center gap-3">
              {verificationResult.valid ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-600" />
              )}
              <div>
                <h3 className={`text-xl font-bold ${verificationResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                  {verificationResult.valid ? '✓ Verificación Válida' : '✗ Verificación Fallida'}
                </h3>
                <p className="text-sm text-gray-700 mt-1">
                  {verificationResult.valid 
                    ? 'La integridad del certificado y el documento son correctas.' 
                    : 'El certificado no es válido o el documento ha sido modificado.'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#0A66C2]" />
              Resumen Probatorio
            </h4>
            <div className="space-y-2">
              {(evidenceItems.length > 0
                ? evidenceItems
                : ['No hay evidencia verificable en este certificado.']
              ).map((item) => (
                <p key={item} className="text-sm text-gray-700">
                  • {item}
                </p>
              ))}
            </div>

            {/* Document Info */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0A66C2]" />
                Información del Documento
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Nombre del Archivo</p>
                  <p className="font-mono text-sm break-all text-gray-900">{verificationResult.fileName || 'No disponible'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Hash SHA-256</p>
                  <p className="font-mono text-xs break-all text-gray-900">{verificationResult.hash || 'No disponible'}</p>
                </div>
              </div>
            </div>

            {/* Timestamp Info */}
            {verificationResult.timestamp && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#0A66C2]" />
                  Información de Timestamp
                </h4>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Fecha de Certificación</p>
                    <p className="font-medium text-sm text-gray-900">{new Date(verificationResult.timestamp).toLocaleString()}</p>
                  </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationComponent;
