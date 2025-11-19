// client/src/components/VerificationComponent.jsx
import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Clock, Hash, User, Eye } from 'lucide-react';
import { verifyEcoFile } from '../lib/verificationService'; // Asumiendo que tienes esta función

const VerificationComponent = ({ initialFile = null }) => {
  const [file, setFile] = useState(initialFile);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleFileChange = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setVerificationResult(null);
      setError(null);
    }
  }, []);

  const handleVerify = useCallback(async () => {
    if (!file) {
      setError('Por favor selecciona un archivo .ECO primero');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // Asumiendo que tienes una función verifyEcoFile que implementa la verificación
      const result = await verifyEcoFile(file);
      
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
  }, [file]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.eco') || droppedFile.name.endsWith('.ecox'))) {
      setFile(droppedFile);
      setVerificationResult(null);
      setError(null);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div 
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-cyan-500 transition-colors duration-300 bg-gray-50"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="w-16 h-16 bg-gradient-to-br from-cyan-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <Upload className="w-8 h-8 text-cyan-600" strokeWidth={2.5} />
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {file ? 'Archivo Seleccionado' : 'Sube tu archivo .ECO para verificar'}
        </h3>
        
        <p className="text-gray-600 mb-4">
          Arrastra y suelta tu archivo .ECO o .ECOX aquí, o haz clic para seleccionar
        </p>
        
        <label htmlFor="eco-upload" className="cursor-pointer">
          <span className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-300">
            Seleccionar archivo
          </span>
          <input
            id="eco-upload"
            type="file"
            accept=".eco,.ecox"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
        
        {file && (
          <div className="mt-4 p-3 bg-cyan-50 border border-cyan-200 rounded-lg inline-block">
            <p className="text-cyan-700 font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-red-800 font-semibold">Error de Verificación</h4>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Verification Button */}
      {file && !verificationResult && (
        <div className="text-center">
          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition duration-300 flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Verificando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Verificar Certificado
              </>
            )}
          </button>
        </div>
      )}

      {/* Verification Result */}
      {verificationResult && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className={`p-6 ${verificationResult.valid ? 'bg-green-50 border-b border-green-200' : 'bg-red-50 border-b border-red-200'}`}>
            <div className="flex items-center gap-3">
              {verificationResult.valid ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-600" />
              )}
              <div>
                <h3 className={`text-xl font-bold ${verificationResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                  {verificationResult.valid ? '¡Verificación Exitosa!' : 'Verificación Fallida'}
                </h3>
                <p className="text-gray-600">
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
                <FileText className="w-5 h-5" />
                Información del Documento
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600">Nombre del Archivo</p>
                  <p className="font-mono text-sm break-all">{verificationResult.fileName || 'No disponible'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600">Hash SHA-256</p>
                  <p className="font-mono text-sm break-all">{verificationResult.hash || 'No disponible'}</p>
                </div>
              </div>
            </div>

            {/* Timestamp Info */}
            {verificationResult.timestamp && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Información de Timestamp
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600">Fecha de Certificación</p>
                    <p className="font-medium">{new Date(verificationResult.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600">Tipo de Timestamp</p>
                    <p className="font-medium">{verificationResult.timestampType || 'Estándar'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600">Anclaje</p>
                    <p className="font-medium">{verificationResult.anchorChain || 'No disponible'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Signature Info */}
            {verificationResult.signature && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Información de Firma
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600">Algoritmo</p>
                    <p className="font-medium">{verificationResult.signature.algorithm || 'No disponible'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600">Validador</p>
                    <p className="font-medium">EcoSign .ECO Standard</p>
                  </div>
                </div>
              </div>
            )}

            {/* Verification Details */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Detalles de Verificación
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Integridad del Documento</span>
                  <span className={`font-semibold ${verificationResult.documentIntegrity ? 'text-green-600' : 'text-red-600'}`}>
                    {verificationResult.documentIntegrity ? '✓ Verificado' : '✗ No Verificado'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Firma Digital</span>
                  <span className={`font-semibold ${verificationResult.signatureValid ? 'text-green-600' : 'text-red-600'}`}>
                    {verificationResult.signatureValid ? '✓ Válida' : '✗ Inválida'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Timestamp Válido</span>
                  <span className={`font-semibold ${verificationResult.timestampValid ? 'text-green-600' : 'text-red-600'}`}>
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