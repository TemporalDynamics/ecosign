import { Link } from 'react-router-dom';

const TermsPage = () => {
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
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-12">
            Términos de Servicio
          </h1>

          <div className="space-y-8 text-lg text-gray-700 leading-relaxed">
            <p>
              EcoSign ofrece herramientas de certificación digital, firma electrónica y verificación de documentos.
              Al utilizar el servicio, aceptás que:
            </p>

            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-black mb-3">
                  Privacidad del archivo
                </h2>
                <p>
                  EcoSign no recibe ni almacena tu archivo. La certificación se realiza únicamente con su huella digital (hash SHA-256).
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-black mb-3">
                  Uso del servicio
                </h2>
                <p>
                  Sos responsable de asegurarte de que tu uso cumpla con la normativa aplicable en tu país o industria. EcoSign no brinda asesoramiento legal.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-black mb-3">
                  Limitaciones del servicio
                </h2>
                <p>
                  El servicio puede actualizarse, modificarse o interrumpirse temporalmente. EcoSign no garantiza disponibilidad ininterrumpida.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-black mb-3">
                  Firmas legales de terceros
                </h2>
                <p>
                  Las firmas legales provistas mediante servicios como SignNow están sujetas a los términos y políticas del proveedor externo.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-black mb-3">
                  Exclusión de responsabilidad
                </h2>
                <p>
                  EcoSign no se hace responsable por daños derivados del uso del servicio, pérdida de archivos, demoras o decisiones tomadas sobre la base de nuestros certificados.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-black mb-3">
                  Cambios en los términos
                </h2>
                <p>
                  EcoSign puede actualizar estos términos. Las nuevas versiones se publicarán en esta misma página.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
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

export default TermsPage;
