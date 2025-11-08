import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="text-2xl">🔒</div>
              <h1 className="text-xl font-bold text-white">VerifySign</h1>
            </Link>
            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/" className="text-slate-300 hover:text-cyan-500 transition duration-200">
                Inicio
              </Link>
              <Link to="/dashboard" className="text-cyan-500 font-semibold transition duration-200">
                Dashboard
              </Link>
              <Link to="/verify" className="text-slate-300 hover:text-cyan-500 transition duration-200">
                Verificar
              </Link>
              <Link to="/pricing" className="text-slate-300 hover:text-cyan-500 transition duration-200">
                Precios
              </Link>
              <button
                onClick={handleLogout}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition duration-200"
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
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
            <h3 className="text-slate-400 text-sm font-medium mb-1">Documentos Protegidos</h3>
            <p className="text-3xl font-bold text-white">12</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
            <h3 className="text-slate-400 text-sm font-medium mb-1">Accesos Registrados</h3>
            <p className="text-3xl font-bold text-white">47</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
            <h3 className="text-slate-400 text-sm font-medium mb-1">NDA Firmados</h3>
            <p className="text-3xl font-bold text-white">34</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
            <h3 className="text-slate-400 text-sm font-medium mb-1">Confiabilidad</h3>
            <p className="text-3xl font-bold text-cyan-500">99.9%</p>
          </div>
        </div>

        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-800 rounded-xl p-8 mb-8 shadow-lg">
          <h2 className="text-3xl font-bold text-white mb-2">Bienvenido a VerifySign 👋</h2>
          <p className="text-cyan-100 text-lg mb-6">
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
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg hover:border-cyan-500/50 transition duration-300">
            <div className="text-3xl mb-3">📝</div>
            <h3 className="text-lg font-semibold text-white mb-2">Certificar Documento</h3>
            <p className="text-slate-400 text-sm mb-4">
              Crea un certificado .ECO con hash SHA-256 y timestamp
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="text-cyan-500 hover:text-cyan-400 font-semibold text-sm"
            >
              Comenzar →
            </button>
          </div>

          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg hover:border-cyan-500/50 transition duration-300">
            <div className="text-3xl mb-3">🔐</div>
            <h3 className="text-lg font-semibold text-white mb-2">Enlace con NDA</h3>
            <p className="text-slate-400 text-sm mb-4">
              Comparte documentos protegidos con acuerdos de confidencialidad
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="text-cyan-500 hover:text-cyan-400 font-semibold text-sm"
            >
              Crear enlace →
            </button>
          </div>

          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg hover:border-cyan-500/50 transition duration-300">
            <div className="text-3xl mb-3">✅</div>
            <h3 className="text-lg font-semibold text-white mb-2">Verificar .ECO</h3>
            <p className="text-slate-400 text-sm mb-4">
              Valida la autenticidad de cualquier certificado digital
            </p>
            <Link
              to="/verify"
              className="text-cyan-500 hover:text-cyan-400 font-semibold text-sm"
            >
              Ir a verificador →
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
          <h2 className="text-xl font-semibold text-white mb-4">Actividad Reciente</h2>
          <div className="space-y-4">
            <div className="border border-slate-700 p-4 rounded-lg">
              <div className="text-sm text-cyan-500 mb-1">Hoy, 10:30 AM</div>
              <p className="text-slate-300">Documento "Proyecto Alpha" firmado por juan@empresa.com</p>
            </div>
            <div className="border border-slate-700 p-4 rounded-lg">
              <div className="text-sm text-cyan-500 mb-1">Ayer, 3:45 PM</div>
              <p className="text-slate-300">Enlace seguro creado para "Informe Confidencial"</p>
            </div>
            <div className="border border-slate-700 p-4 rounded-lg">
              <div className="text-sm text-cyan-500 mb-1">12 Nov, 9:15 AM</div>
              <p className="text-slate-300">Nuevo certificado .ECO generado para contrato</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-slate-800 border-t border-slate-700 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-500">© 2025 VerifySign. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl max-w-2xl w-full p-8 shadow-2xl border border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">Crear Certificado .ECO</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setFile(null);
                }}
                className="text-gray-400 hover:text-white transition duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Documento a Certificar *
                </label>
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-cyan-500 transition duration-300">
                  <div className="text-4xl mb-3">📄</div>
                  <label htmlFor="file-input" className="cursor-pointer">
                    <span className="text-cyan-500 hover:text-cyan-400 font-semibold">
                      Haz clic para seleccionar
                    </span>
                    <span className="text-slate-400"> o arrastra tu archivo aquí</span>
                    <input
                      id="file-input"
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {file && (
                    <div className="mt-4 p-3 bg-slate-700 rounded-lg">
                      <p className="text-cyan-500 font-medium">
                        ✓ {file.name} ({(file.size / 1024).toFixed(2)} KB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* NDA Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                <div>
                  <h4 className="text-white font-semibold">Requiere NDA para acceso</h4>
                  <p className="text-sm text-slate-400">
                    Los receptores deberán firmar un acuerdo de confidencialidad
                  </p>
                </div>
                <button
                  onClick={() => setNdaRequired(!ndaRequired)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    ndaRequired ? 'bg-cyan-600' : 'bg-slate-600'
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
                      ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Generar Certificado
                </button>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setFile(null);
                  }}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition duration-300"
                >
                  Cancelar
                </button>
              </div>

              {/* Info */}
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <p className="text-sm text-cyan-300">
                  <strong>ℹ️ Información:</strong> El documento se procesará localmente. Generaremos un hash SHA-256,
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