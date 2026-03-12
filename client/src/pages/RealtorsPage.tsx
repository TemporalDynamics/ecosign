import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import FooterPublic from '../components/FooterPublic';

const RealtorsPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <nav className="bg-white fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center space-x-3">
              <span className="text-2xl font-bold text-[#0E4B8B]">EcoSign</span>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/how-it-works" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200">
                Como funciona
              </Link>
              <Link to="/verify" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200">
                Verificador
              </Link>
              <Link to="/pricing" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200">
                Precios
              </Link>
              <Link to="/login" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200">
                Iniciar sesion
              </Link>
              <Link to="/login" className="bg-black hover:bg-gray-800 text-white font-semibold px-6 py-2.5 rounded-lg transition duration-300">
                Proteger mi proxima operacion
              </Link>
            </div>
            <button className="md:hidden text-gray-600 hover:text-black" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-white">
            <div className="px-4 pt-2 pb-4 space-y-2">
              <Link to="/how-it-works" className="block text-gray-600 hover:text-black px-3 py-2 rounded-lg">Como funciona</Link>
              <Link to="/verify" className="block text-gray-600 hover:text-black px-3 py-2 rounded-lg">Verificador</Link>
              <Link to="/pricing" className="block text-gray-600 hover:text-black px-3 py-2 rounded-lg">Precios</Link>
              <Link to="/login" className="block text-gray-600 hover:text-black px-3 py-2 rounded-lg">Iniciar sesion</Link>
              <Link to="/login" className="block bg-black hover:bg-gray-800 text-white font-semibold px-4 py-2 rounded-lg text-center mt-2">
                Proteger mi proxima operacion
              </Link>
            </div>
          </div>
        )}
      </nav>

      <header className="pt-32 pb-24 md:pt-40 md:pb-32 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-[54px] sm:text-6xl lg:text-7xl font-bold leading-tight text-black mb-8">
            Tu operacion cerrada en minutos,<br />no en semanas.
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto mb-12 leading-relaxed">
            De la reserva a la escritura: cada paso protegido con evidencia verificable.
            <br />
            Sin exponer precios, comisiones o datos sensibles.
          </p>
        </div>
      </header>

      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
            El costo real de usar plataformas genericas
          </h2>
          <div className="space-y-6">
            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Friccion de cierre</h3>
              <p className="text-gray-700">Firmas que tardan dias justo cuando el cliente esta listo para avanzar.</p>
            </div>
            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Riesgo y exposicion</h3>
              <p className="text-gray-700">Precios, comisiones y datos sensibles en sistemas donde no controlas todo el flujo.</p>
            </div>
            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Costo impredecible</h3>
              <p className="text-gray-700">Limites por sobres o creditos que impactan justo en operaciones clave.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
            EcoSign resuelve el flujo inmobiliario
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-3">Cierre mas rapido</h3>
              <p className="text-gray-700">Firma y seguimiento en el mismo flujo para reducir demoras operativas.</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-3">Confidencialidad real</h3>
              <p className="text-gray-700">Proteges el trabajo sin exponer el contenido del archivo.</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-3">Respaldo verificable</h3>
              <p className="text-gray-700">La evidencia queda lista para revisar cuando haga falta.</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-3">Menos tareas manuales</h3>
              <p className="text-gray-700">Menos reenvios, menos seguimiento por chat y menos friccion con el cliente.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 text-center">
            Que documentos proteges con EcoSign
          </h2>
          <p className="text-xl text-gray-700 text-center mb-12 max-w-3xl mx-auto">
            Casos reales del dia a dia inmobiliario.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-3">Reservas y senales</h3>
              <p className="text-gray-700">Acuerdos rapidos que necesitan validez inmediata. El cliente firma en el acto.</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-3">Boletos de compraventa</h3>
              <p className="text-gray-700">Proteges el acuerdo antes de escritura y conservas evidencia de cada version.</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-3">Mandatos de venta</h3>
              <p className="text-gray-700">El propietario firma remoto y vos seguis el estado sin perder contexto.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
            Guia rapida para decidir
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-xl border border-gray-200">
              <h3 className="text-2xl font-bold text-black mb-4">Firma tecnica (flujo diario)</h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />Reservas, autorizaciones y acuerdos previos.</li>
                <li className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />Rapida, simple y con evidencia verificable.</li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-xl border border-gray-200">
              <h3 className="text-2xl font-bold text-black mb-4">Firma certificada (casos criticos)</h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />Escrituras o procesos que exigen certificacion externa.</li>
                <li className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />Misma plataforma, distinto nivel segun necesidad.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Protege tu proxima operacion desde hoy.
          </h2>
          <Link to="/login" className="inline-block bg-black hover:bg-gray-800 text-white font-semibold px-12 py-4 rounded-lg transition duration-300 text-lg">
            Proteger mi proxima operacion
          </Link>
        </div>
      </section>

      <FooterPublic />
    </div>
  );
};

export default RealtorsPage;
