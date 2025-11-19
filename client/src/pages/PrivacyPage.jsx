import { Link } from 'react-router-dom';

const PrivacyPage = () => {
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
            Privacidad
          </h1>

          <div className="space-y-8 text-lg text-gray-700 leading-relaxed">
            <p>
              En EcoSign tu privacidad es prioritaria. Estas son nuestras prácticas:
            </p>

            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-black mb-3">
                  Información que NO recopilamos
                </h2>
                <ul className="list-disc list-inside space-y-2">
                  <li>No recibimos, subimos ni almacenamos tu archivo.</li>
                  <li>No analizamos, indexamos ni abrimos su contenido.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-black mb-3">
                  Información que sí recopilamos
                </h2>
                <p className="mb-3">Para operar el servicio:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Tu email (cuando creás cuenta o firmás)</li>
                  <li>Los eventos del proceso de auditoría (fecha, IP aproximada, tipo de evento)</li>
                  <li>Datos técnicos mínimos de verificación</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-black mb-3">
                  Cómo usamos tu información
                </h2>
                <ul className="list-disc list-inside space-y-2">
                  <li>Para emitir certificados y auditar procesos.</li>
                  <li>Para enviar notificaciones relacionadas al documento.</li>
                  <li>Para garantizar seguridad y detectar actividad sospechosa.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-black mb-3">
                  ¿Compartimos tu información?
                </h2>
                <p>
                  No vendemos, alquilamos ni compartimos tus datos con terceros comerciales.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-black mb-3">
                  Eliminación de datos
                </h2>
                <p>
                  Podés solicitar la eliminación total de tu perfil enviando un correo a{' '}
                  <a href="mailto:soporte@ecosign.app" className="text-black font-semibold hover:underline">
                    soporte@ecosign.app
                  </a>
                  .
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-black mb-3">
                  Cambios
                </h2>
                <p>
                  Actualizaremos esta política cuando se lancen nuevas funciones.
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

export default PrivacyPage;
