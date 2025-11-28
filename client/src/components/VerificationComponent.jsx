// client/src/components/VerificationComponent.jsx
import React, { useState, useCallback } from 'react';
import Upload from 'lucide-react/dist/esm/icons/upload';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Clock from 'lucide-react/dist/esm/icons/clock';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import FileCheck from 'lucide-react/dist/esm/icons/file-check';
import { verifyEcoFile } from '../lib/verificationService';

const VerificationComponent = ({ initialFile = null }) => {
  const [ecoFile, setEcoFile] = useState(initialFile);
  const [pdfFile, setPdfFile] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleEcoFileChange = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setEcoFile(selectedFile);
      setVerificationResult(null);
      setError(null);
    }
  }, []);

  const handlePdfFileChange = useCallback((e) => {
    const selectedFile = e.target.files[0];
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
      const result = await verifyEcoFile(ecoFile, pdfFile);
      
      if (result.valid) {
        setVerificationResult(result);
      } else {
        setError(result.error || 'La verificación falló');
      }
    } catch (err) {
      setError(err.message || 'Error al verificar el archivo');
    } finally {
      setIsVerifying(false);
    }
  }, [ecoFile, pdfFile]);

  const handleDrop = useCallback((e, type) => {
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

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

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
      {error && (
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
                  {verificationResult.valid ? '✓ Verificación Exitosa' : '✗ Verificación Fallida'}
                </h3>
                <p className="text-sm text-gray-700 mt-1">
                  {verificationResult.valid 
                    ? 'El certificado es válido y la integridad del documento está confirmada' 
                    : 'El certificado no es válido o el documento ha sido modificado'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Fecha de Certificación</p>
                    <p className="font-medium text-sm text-gray-900">{new Date(verificationResult.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Tipo de Timestamp</p>
                    <p className="font-medium text-sm text-gray-900">{verificationResult.timestampType || 'Estándar'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Anclaje</p>
                    <p className="font-medium text-sm text-gray-900">{verificationResult.anchorChain || 'No disponible'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Verification Details */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#0A66C2]" />
                Detalles de Verificación
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-700">Integridad del Documento</span>
                  <span className={`font-semibold text-sm ${verificationResult.documentIntegrity ? 'text-green-600' : 'text-red-600'}`}>
                    {verificationResult.documentIntegrity ? '✓ Verificado' : '✗ No Verificado'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-700">Firma Digital</span>
                  <span className={`font-semibold text-sm ${verificationResult.signatureValid ? 'text-green-600' : 'text-red-600'}`}>
                    {verificationResult.signatureValid ? '✓ Válida' : '✗ Inválida'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-700">Timestamp Válido</span>
                  <span className={`font-semibold text-sm ${verificationResult.timestampValid ? 'text-green-600' : 'text-red-600'}`}>
                    {verificationResult.timestampValid ? '✓ Válido' : '✗ Inválido'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationComponent;