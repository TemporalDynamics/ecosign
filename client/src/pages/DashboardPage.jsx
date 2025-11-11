import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, FileText, Shield, CheckCircle, Upload, X, Info } from 'lucide-react';
import { certifyAndDownload } from '../lib/basicCertificationBrowser';

function DashboardPage() {
  const navigate = useNavigate();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [file, setFile] = useState(null);
  const [ndaRequired, setNdaRequired] = useState(true);
  const [useLegalTimestamp, setUseLegalTimestamp] = useState(false);
  const [useBlockchainAnchoring, setUseBlockchainAnchoring] = useState(false);
  const [certifying, setCertifying] = useState(false);
  const [certificationResult, setCertificationResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setCertificationResult(null);
    }
  };

  const handleCreateLink = async () => {
    if (!file) return;

    setCertifying(true);
    setError(null);
    setCertificationResult(null);

    try {
      console.log('🚀 Starting certification process...');

      // Get user email from Supabase if available
      // For now, we'll use a placeholder
      const options = {
        userEmail: 'user@verifysign.pro',
        userId: 'user-' + Date.now(),
        useLegalTimestamp: useLegalTimestamp, // RFC 3161 if enabled
        useBlockchainAnchoring: useBlockchainAnchoring // OpenTimestamps if enabled
      };

      const result = await certifyAndDownload(file, options);

      console.log('✅ Certification complete!', result);

      setCertificationResult({
        fileName: result.fileName,
        hash: result.hash,
        timestamp: result.timestamp,
        ecoxFileName: result.downloadedFileName,
        fileSize: result.fileSize,
        ecoxSize: result.ecoxSize,
        publicKey: result.publicKey,
        legalTimestamp: result.legalTimestamp, // Include legal timestamp info
        blockchainAnchoring: result.blockchainAnchoring // Include blockchain anchoring info
      });

      // Don't close modal - show success message
    } catch (err) {
      console.error('❌ Certification failed:', err);
      setError(err.message || 'Error al certificar el documento');
    } finally {
      setCertifying(false);
    }
  };

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-cyan-50">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center space-x-3">
              <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">VerifySign</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/" className="text-gray-600 hover:text-cyan-600 transition duration-200 font-medium">
                Inicio
              </Link>
              <Link to="/dashboard" className="text-cyan-600 font-semibold transition duration-200">
                Dashboard
              </Link>
              <Link to="/verify" className="text-gray-600 hover:text-cyan-600 transition duration-200 font-medium">
                Verificar
              </Link>
              <Link to="/pricing" className="text-gray-600 hover:text-cyan-600 transition duration-200 font-medium">
                Precios
              </Link>
              <button
                onClick={handleLogout}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition duration-200 font-medium"
              >
                Cerrar Sesión
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
            <h3 className="text-gray-600 text-sm font-medium mb-1">Documentos Protegidos</h3>
            <p className="text-3xl font-bold text-gray-900">12</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
            <h3 className="text-gray-600 text-sm font-medium mb-1">Accesos Registrados</h3>
            <p className="text-3xl font-bold text-gray-900">47</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
            <h3 className="text-gray-600 text-sm font-medium mb-1">NDA Firmados</h3>
            <p className="text-3xl font-bold text-gray-900">34</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
            <h3 className="text-gray-600 text-sm font-medium mb-1">Confiabilidad</h3>
            <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">99.9%</p>
          </div>
        </div>

        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl p-8 mb-8 shadow-lg">
          <h2 className="text-3xl font-bold text-white mb-2">Bienvenido a VerifySign</h2>
          <p className="text-cyan-50 text-lg mb-6">
            Crea enlaces seguros, protege tus documentos y verifica su autenticidad con tecnología blockchain
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-white hover:bg-gray-100 text-cyan-700 font-bold py-3 px-8 rounded-lg shadow-md transition duration-300"
          >
            + Crear Nuevo Certificado .ECO
          </button>
        </div>

        {/* Dashboard Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition duration-300">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-100 to-cyan-200 rounded-xl flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-cyan-600" strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Certificar Documento</h3>
            <p className="text-gray-600 text-sm mb-4">
              Crea un certificado .ECO con hash SHA-256 y timestamp
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="text-cyan-600 hover:text-cyan-700 font-semibold text-sm"
            >
              Comenzar →
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition duration-300">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mb-3">
              <Shield className="w-6 h-6 text-blue-600" strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Enlace con NDA</h3>
            <p className="text-gray-600 text-sm mb-4">
              Comparte documentos protegidos con acuerdos de confidencialidad
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="text-cyan-600 hover:text-cyan-700 font-semibold text-sm"
            >
              Crear enlace →
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition duration-300">
            <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center mb-3">
              <CheckCircle className="w-6 h-6 text-green-600" strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Verificar .ECO</h3>
            <p className="text-gray-600 text-sm mb-4">
              Valida la autenticidad de cualquier certificado digital
            </p>
            <Link
              to="/verify"
              className="text-cyan-600 hover:text-cyan-700 font-semibold text-sm"
            >
              Ir a verificador →
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Actividad Reciente</h2>
          <div className="space-y-4">
            <div className="border border-gray-200 p-4 rounded-lg hover:bg-gray-50 transition duration-200">
              <div className="text-sm text-cyan-600 font-medium mb-1">Hoy, 10:30 AM</div>
              <p className="text-gray-700">Documento "Proyecto Alpha" firmado por juan@empresa.com</p>
            </div>
            <div className="border border-gray-200 p-4 rounded-lg hover:bg-gray-50 transition duration-200">
              <div className="text-sm text-cyan-600 font-medium mb-1">Ayer, 3:45 PM</div>
              <p className="text-gray-700">Enlace seguro creado para "Informe Confidencial"</p>
            </div>
            <div className="border border-gray-200 p-4 rounded-lg hover:bg-gray-50 transition duration-200">
              <div className="text-sm text-cyan-600 font-medium mb-1">12 Nov, 9:15 AM</div>
              <p className="text-gray-700">Nuevo certificado .ECO generado para contrato</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-50 border-t border-gray-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 text-sm">© 2025 VerifySign por Temporal Dynamics LLC. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Crear Certificado .ECO</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setFile(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition duration-200"
              >
                <X className="w-6 h-6" strokeWidth={2.5} />
              </button>
            </div>

            <div className="space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Documento a Certificar *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-cyan-500 transition duration-300 bg-gray-50">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-8 h-8 text-cyan-600" strokeWidth={2.5} />
                  </div>
                  <label htmlFor="file-input" className="cursor-pointer">
                    <span className="text-cyan-600 hover:text-cyan-700 font-semibold">
                      Haz clic para seleccionar
                    </span>
                    <span className="text-gray-600"> o arrastra tu archivo aquí</span>
                    <input
                      id="file-input"
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {file && (
                    <div className="mt-4 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                      <p className="text-cyan-700 font-medium">
                        ✓ {file.name} ({(file.size / 1024).toFixed(2)} KB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* NDA Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <h4 className="text-gray-900 font-semibold">Requiere NDA para acceso</h4>
                  <p className="text-sm text-gray-600">
                    Los receptores deberán firmar un acuerdo de confidencialidad
                  </p>
                </div>
                <button
                  onClick={() => setNdaRequired(!ndaRequired)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    ndaRequired ? 'bg-cyan-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      ndaRequired ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Legal Timestamp Toggle */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                <div>
                  <h4 className="text-gray-900 font-semibold flex items-center">
                    ⚖️ Timestamp con Validez Legal (RFC 3161)
                    <span className="ml-2 px-2 py-0.5 bg-green-600 text-white text-xs rounded-full font-bold">LEGAL</span>
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Timestamp certificado por Time Stamp Authority (TSA)
                  </p>
                  <p className="text-xs text-green-700 font-medium mt-1">
                    ✅ Validez legal en +100 países • Cumple estándar RFC 3161
                  </p>
                </div>
                <button
                  onClick={() => setUseLegalTimestamp(!useLegalTimestamp)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    useLegalTimestamp ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useLegalTimestamp ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Blockchain Anchoring Toggle */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border-2 border-orange-200">
                <div>
                  <h4 className="text-gray-900 font-semibold flex items-center">
                    ⛓️ Anclaje en Blockchain (OpenTimestamps)
                    <span className="ml-2 px-2 py-0.5 bg-orange-600 text-white text-xs rounded-full font-bold">BLOCKCHAIN</span>
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Prueba inmutable en Bitcoin blockchain
                  </p>
                  <p className="text-xs text-orange-700 font-medium mt-1">
                    🆓 Gratis • Confirmación en ~10 min • Permanente
                  </p>
                </div>
                <button
                  onClick={() => setUseBlockchainAnchoring(!useBlockchainAnchoring)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    useBlockchainAnchoring ? 'bg-orange-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useBlockchainAnchoring ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 font-medium">⚠️ {error}</p>
                </div>
              )}

              {/* Success Message */}
              {certificationResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" strokeWidth={2.5} />
                    <h4 className="text-green-800 font-bold">✅ Certificado generado exitosamente!</h4>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Archivo:</span>
                      <span className="font-mono text-gray-900">{certificationResult.fileName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tamaño original:</span>
                      <span className="font-mono text-gray-900">{(certificationResult.fileSize / 1024).toFixed(2)} KB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tamaño .ecox:</span>
                      <span className="font-mono text-gray-900">{(certificationResult.ecoxSize / 1024).toFixed(2)} KB</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-gray-600">Hash SHA-256:</span>
                      <span className="font-mono text-xs text-gray-900 break-all max-w-[60%] text-right">{certificationResult.hash}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Timestamp:</span>
                      <span className="font-mono text-xs text-gray-900">{new Date(certificationResult.timestamp).toLocaleString()}</span>
                    </div>
                    {/* Legal Timestamp Info */}
                    {certificationResult.legalTimestamp && certificationResult.legalTimestamp.enabled && (
                      <div className="flex justify-between items-start bg-green-50 -mx-2 px-2 py-2 rounded">
                        <span className="text-green-700 font-semibold flex items-center">
                          ⚖️ Validez Legal:
                        </span>
                        <div className="text-right">
                          <span className="font-mono text-xs text-green-800 font-bold block">{certificationResult.legalTimestamp.standard}</span>
                          <span className="text-xs text-green-600">{certificationResult.legalTimestamp.tsa}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-start">
                      <span className="text-gray-600">Clave pública:</span>
                      <span className="font-mono text-xs text-gray-900 break-all max-w-[60%] text-right">{certificationResult.publicKey.substring(0, 40)}...</span>
                    </div>
                  </div>

                  {/* Legal timestamp badge */}
                  {certificationResult.legalTimestamp && certificationResult.legalTimestamp.enabled && (
                    <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded p-3 mt-3">
                      <p className="text-green-800 text-sm font-bold flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        ✅ Este certificado tiene VALIDEZ LEGAL internacional (RFC 3161)
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Timestamp certificado por TSA • Aceptado en +100 países
                      </p>
                    </div>
                  )}

                  {/* Blockchain anchoring badge */}
                  {certificationResult.blockchainAnchoring && certificationResult.blockchainAnchoring.enabled && (
                    <div className="bg-gradient-to-r from-orange-100 to-yellow-100 border-2 border-orange-300 rounded p-3 mt-3">
                      <p className="text-orange-800 text-sm font-bold flex items-center">
                        <Shield className="w-4 h-4 mr-2" />
                        ⛓️ Anclado en {certificationResult.blockchainAnchoring.blockchain} Blockchain
                      </p>
                      <p className="text-xs text-orange-700 mt-1">
                        {certificationResult.blockchainAnchoring.status === 'pending' ? (
                          <>⏳ Esperando confirmación en blockchain (~10 min)</>
                        ) : (
                          <>✅ Confirmado en blockchain • Prueba permanente e inmutable</>
                        )}
                      </p>
                      <p className="text-xs text-orange-600 mt-1 font-mono">
                        Protocolo: {certificationResult.blockchainAnchoring.protocol}
                      </p>
                    </div>
                  )}

                  <div className="bg-green-100 rounded p-3 mt-3">
                    <p className="text-green-800 text-sm font-medium">
                      📥 Descargado: <span className="font-mono">{certificationResult.ecoxFileName}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={handleCreateLink}
                  disabled={!file || certifying}
                  className={`flex-1 font-bold py-3 px-6 rounded-lg transition duration-300 ${
                    file && !certifying
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {certifying ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generando certificado...
                    </span>
                  ) : (
                    'Generar Certificado'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setFile(null);
                    setCertificationResult(null);
                    setError(null);
                  }}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition duration-300"
                >
                  {certificationResult ? 'Cerrar' : 'Cancelar'}
                </button>
              </div>

              {/* Info */}
              {!certificationResult && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 flex items-start">
                  <Info className="w-5 h-5 text-cyan-600 mr-3 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                  <p className="text-sm text-cyan-800">
                    <strong>Información:</strong> El documento se procesará localmente. Generaremos un hash SHA-256,
                    timestamp certificado y firma digital Ed25519. Opcionalmente, podemos anclar el hash en blockchain.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;