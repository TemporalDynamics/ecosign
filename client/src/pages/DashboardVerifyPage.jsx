// client/src/pages/DashboardVerifyPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Upload, X, Info, ArrowLeft } from 'lucide-react';
import VerificationComponent from '../components/VerificationComponent';
import DashboardNav from '../components/DashboardNav';

function DashboardVerifyPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-cyan-50">
      <DashboardNav onLogout={handleLogout} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Verificación de .ECO</h2>
            <p className="text-gray-600 mt-2">
              Verifica la autenticidad e integridad de tus certificados .ECO
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-cyan-600 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al dashboard
          </button>
        </div>

        {/* Transparency Notice */}
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-6 mb-8">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Info className="w-6 h-6 text-cyan-600" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-gray-900 font-semibold mb-2">Verificación Independiente</h3>
              <p className="text-gray-700 text-sm">
                Esta herramienta valida la firma electrónica, huella digital y sello de tiempo del documento.
                La verificación se realiza localmente en tu navegador - el archivo nunca se sube a nuestros servidores.
              </p>
            </div>
          </div>
        </div>

        {/* Verification Component */}
        <VerificationComponent />
      </main>

      <footer className="bg-gray-50 border-t border-gray-200 mt-12 py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 text-sm">© 2025 EcoSign por Temporal Dynamics LLC. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

export default DashboardVerifyPage;