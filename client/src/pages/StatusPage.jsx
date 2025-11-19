import { Link } from 'react-router-dom';
import { Activity, CheckCircle } from 'lucide-react';

const StatusPage = () => {
  const services = [
    { name: 'Certificación', status: 'operational' },
    { name: 'Verificación', status: 'operational' },
    { name: 'Timestamps RFC 3161', status: 'operational' },
    { name: 'Blockchain Polygon', status: 'operational' },
    { name: 'Blockchain Bitcoin', status: 'operational' },
    { name: 'Firmas Legales', status: 'operational' }
  ];

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
          <div className="text-center mb-12">
            <Activity className="w-12 h-12 text-black mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
              Estado del Servicio
            </h1>
            <p className="text-xl text-gray-700">
              Aquí podrás consultar la disponibilidad de nuestros servicios
            </p>
          </div>

          <div className="space-y-4 mb-12">
            {services.map((service, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-6 border border-gray-200 rounded-lg"
              >
                <span className="text-lg font-medium text-black">{service.name}</span>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-black" />
                  <span className="text-gray-700">Operativo</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-100 rounded-xl p-8 text-center">
            <p className="text-gray-700">
              Pronto agregaremos métricas en tiempo real.
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 text-center">
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

export default StatusPage;
