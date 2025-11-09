import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, FileText, Shield, CheckCircle, Upload, X, Info } from 'lucide-react';

function DashboardPage() {
  const navigate = useNavigate();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [file, setFile] = useState(null);
  const [ndaRequired, setNdaRequired] = useState(true);

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleCreateLink = () => {
    if (!file) return;
    // Aquí irá la lógica de creación del enlace seguro
    alert('Enlace seguro creado exitosamente! (Funcionalidad en desarrollo)');
    setShowUploadModal(false);
    setFile(null);
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
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl border border-gray-200">
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

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={handleCreateLink}
                  disabled={!file}
                  className={`flex-1 font-bold py-3 px-6 rounded-lg transition duration-300 ${
                    file
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Generar Certificado
                </button>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setFile(null);
                  }}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition duration-300"
                >
                  Cancelar
                </button>
              </div>

              {/* Info */}
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 flex items-start">
                <Info className="w-5 h-5 text-cyan-600 mr-3 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                <p className="text-sm text-cyan-800">
                  <strong>Información:</strong> El documento se procesará localmente. Generaremos un hash SHA-256,
                  timestamp certificado y firma digital Ed25519. Opcionalmente, podemos anclar el hash en blockchain.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;