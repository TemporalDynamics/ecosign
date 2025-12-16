// client/src/pages/DashboardVerifyPage.jsx
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import VerificationComponent from '../components/VerificationComponent';
import DashboardNav from '../components/DashboardNav';
import FooterInternal from '../components/FooterInternal';

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
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-gray-900">Verificador</h1>
            <Link
              to="/inicio"
              className="flex items-center gap-2 text-gray-600 hover:text-black font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver
            </Link>
          </div>
          <p className="text-lg text-gray-700 mb-2">
            Comprobá la autenticidad de tu documento y asegurate de que no fue alterado.
          </p>
          <p className="text-gray-600">
            Toda la verificación ocurre en tu ordenador: tus archivos nunca se suben ni se almacenan.
          </p>
        </div>

        {/* Verificación Independiente */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Info className="w-6 h-6 text-gray-900" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Verificación Independiente</h2>
              <p className="text-gray-700 mb-4">
                Esta herramienta analiza tu documento y su certificado asociado para confirmar su autenticidad, su integridad y su validez legal.
                La verificación se realiza de forma local, sin exponer tus archivos.
              </p>
              <p className="text-sm text-gray-900 font-semibold">
                EcoSign nunca ve tu documento. Nunca se sube. Todo ocurre en tu navegador.
              </p>
            </div>
          </div>
        </div>

        {/* Verification Component */}
        <VerificationComponent />

        {/* What this tool validates */}
        <div className="mt-12 bg-white border border-gray-200 rounded-xl p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">¿Qué valida esta herramienta?</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="mr-2">-</span>
              <span>Que el documento no haya sido modificado</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">-</span>
              <span>Que la evidencia coincida con el contenido del archivo</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">-</span>
              <span>Autenticidad de la Firma Legal</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">-</span>
              <span>Huella digital del documento</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">-</span>
              <span>Sello de integridad y fecha original</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">-</span>
              <span>Estructura del certificado .ECO</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">-</span>
              <span>Correspondencia entre PDF y certificado</span>
            </li>
          </ul>
        </div>

        {/* Advanced Features Notice */}
        <div className="mt-8 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            Funciones avanzadas (solo planes Business/Enterprise)
          </h3>
          <p className="text-gray-700 mb-4">
            Los planes superiores incluyen capacidades forenses avanzadas:
          </p>
          <ul className="space-y-2 text-gray-700 mb-6">
            <li className="flex items-start">
              <span className="mr-2">-</span>
              <span>Reconstrucción de la cadena de custodia</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">-</span>
              <span>Análisis de eventos de riesgo</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">-</span>
              <span>Validación extendida de sellos y anclajes</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">-</span>
              <span>Reportes listos para auditoría o litigio (PDF/JSON/XML)</span>
            </li>
          </ul>
          <Link
            to="/dashboard/pricing"
            className="inline-block bg-gray-900 hover:bg-gray-800 text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            Actualizar plan
          </Link>
        </div>

        {/* Cómo se verifica este certificado */}
        <div className="mt-10 bg-white border border-gray-200 rounded-xl p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">¿Cómo se verifica este certificado?</h3>
          <div className="space-y-3 text-sm text-gray-800">
            <div>
              <p className="font-semibold">Identidad del documento</p>
              <p className="text-gray-700">El certificado contiene la huella digital única del documento. Cualquier modificación genera una huella diferente.</p>
            </div>
            <div>
              <p className="font-semibold">Integridad</p>
              <p className="text-gray-700">La huella del documento coincide con la registrada en el certificado, lo que prueba que el contenido no fue alterado.</p>
            </div>
            <div>
              <p className="font-semibold">Tiempo</p>
              <p className="text-gray-700">El certificado incluye un sello de tiempo legal (RFC 3161) emitido por un tercero independiente, que prueba cuándo existía el documento.</p>
            </div>
            <div>
              <p className="font-semibold">Existencia pública</p>
              <p className="text-gray-700">Esa huella fue registrada en redes públicas (Polygon y/o Bitcoin), independientes de EcoSign y verificables externamente.</p>
            </div>
            <div>
              <p className="font-semibold">Certificación</p>
              <p className="text-gray-700">EcoSign firma el certificado para confirmar que este proceso ocurrió correctamente, pero la validez no depende de EcoSign.</p>
            </div>
            <p className="text-gray-800 font-medium">
              Incluso si EcoSign dejara de existir, este certificado seguiría siendo verificable.
            </p>
          </div>
        </div>
      </main>

      <FooterInternal />
    </div>
  );
}

export default DashboardVerifyPage;
