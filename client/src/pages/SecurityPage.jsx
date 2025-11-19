import { Link } from 'react-router-dom';
import { Shield, Lock, Clock, Eye, Anchor } from 'lucide-react';

const SecurityPage = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white fixed w-full top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center space-x-3">
              <span className="text-2xl font-bold text-black">VerifySign</span>
            </Link>
            <Link
              to="/"
              className="text-gray-600 hover:text-black font-medium transition duration-200"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-32 pb-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-8 text-center">
            Seguridad en EcoSign
          </h1>
          
          <p className="text-xl text-gray-700 text-center mb-16 max-w-3xl mx-auto leading-relaxed">
            Construimos EcoSign sobre estándares internacionales usados por bancos, laboratorios y organismos legales.
          </p>

          <div className="space-y-16">
            <div className="text-center">
              <Lock className="w-10 h-10 text-black mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-black mb-3">
                Protección del Documento
              </h2>
              <div className="text-lg text-gray-700 max-w-2xl mx-auto space-y-2">
                <p>El archivo nunca se expone ni se sube a ningún servidor.</p>
                <p>Su integridad se representa mediante un hash SHA-256 (huella digital irreversible).</p>
              </div>
            </div>

            <div className="text-center">
              <Clock className="w-10 h-10 text-black mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-black mb-3">
                Prueba de Existencia Legal
              </h2>
              <div className="text-lg text-gray-700 max-w-2xl mx-auto space-y-3">
                <p>Sello de Tiempo Legal RFC 3161, emitido por una Autoridad de Confianza.</p>
                <p className="font-semibold text-black">Registro público en blockchain:</p>
                <ul className="space-y-1">
                  <li>Polygon (rápido, económico)</li>
                  <li>Bitcoin (irreversible, nivel máximo)</li>
                </ul>
              </div>
            </div>

            <div className="text-center">
              <Shield className="w-10 h-10 text-black mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-black mb-3">
                Trazabilidad Completa
              </h2>
              <div className="text-lg text-gray-700 max-w-2xl mx-auto">
                <p className="mb-3">Cada evento queda registrado:</p>
                <ul className="space-y-1">
                  <li>Creación</li>
                  <li>Apertura</li>
                  <li>Firma</li>
                  <li>Blindaje</li>
                  <li>Verificación</li>
                </ul>
              </div>
            </div>

            <div className="text-center">
              <Eye className="w-10 h-10 text-black mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-black mb-3">
                Verificación Universal
              </h2>
              <p className="text-lg text-gray-700 max-w-2xl mx-auto">
                Tu archivo .ECO puede verificarse desde cualquier navegador, sin necesidad de cuenta.
              </p>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-gray-200 text-center">
            <Link
              to="/"
              className="inline-block bg-black hover:bg-gray-800 text-white font-semibold px-8 py-3 rounded-lg transition duration-300"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SecurityPage;
