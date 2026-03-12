import { useState } from 'react';
import { Link } from 'react-router-dom';
import FooterPublic from '../components/FooterPublic';

const BusinessPage = () => {
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
              <Link to="/how-it-works" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200">Como funciona</Link>
              <Link to="/verify" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200">Verificador</Link>
              <Link to="/pricing" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200">Precios</Link>
              <Link to="/login" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200">Iniciar sesion</Link>
              <Link to="/login" className="bg-black hover:bg-gray-800 text-white font-semibold px-6 py-2.5 rounded-lg transition duration-300">Proteger mis procesos</Link>
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
              <Link to="/login" className="block bg-black hover:bg-gray-800 text-white font-semibold px-4 py-2 rounded-lg text-center mt-2">Proteger mis procesos</Link>
            </div>
          </div>
        )}
      </nav>

      <header className="pt-32 pb-24 md:pt-40 md:pb-32 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-[54px] sm:text-6xl lg:text-7xl font-bold leading-tight text-black mb-8">
            Tus procesos internos,<br />blindados para siempre.
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto mb-12 leading-relaxed">
            Ordenes de compra, autorizaciones y acuerdos B2B.
            <br />
            Cada documento protegido con evidencia verificable.
          </p>
        </div>
      </header>

      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
            Donde se pierden tiempo y costos
          </h2>
          <div className="space-y-6">
            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Costos operacionales disparados</h3>
              <p className="text-gray-700">Sobres, creditos y limites que rompen el flujo del equipo.</p>
            </div>
            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Procesos frenados</h3>
              <p className="text-gray-700">Aprobaciones internas que tardan dias por falta de trazabilidad.</p>
            </div>
            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Auditorias complejas</h3>
              <p className="text-gray-700">Demostrar el historial del documento consume horas de trabajo manual.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 text-center">
            Como usa EcoSign cada industria
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-3">Recursos Humanos</h3>
              <p className="text-gray-700">Contratos, adendas y confidencialidad. Firma en minutos, no dias.</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-3">Compras y proveedores</h3>
              <p className="text-gray-700">Ordenes de compra y cotizaciones con versionado y respaldo.</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-3">Legal y Compliance</h3>
              <p className="text-gray-700">Acuerdos, actas y resoluciones con evidencia lista para auditoria.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="bg-blue-50 p-8 rounded-xl border border-blue-200">
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 text-center">
              Cuanto ahorras con EcoSign
            </h2>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-sm text-gray-600">Sin EcoSign</p>
                <p className="text-3xl font-bold text-black">$2,400 / ano</p>
                <p className="text-xs text-gray-600">100 documentos x $2 c/u</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Con EcoSign</p>
                <p className="text-3xl font-bold text-black">$180 / ano</p>
                <p className="text-xs text-gray-600">Plan BUSINESS (ejemplo)</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Ahorro estimado</p>
                <p className="text-3xl font-bold text-green-600">$2,220 / ano</p>
                <p className="text-xs text-gray-600">Hasta 92% menos</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Protege los procesos que sostienen tu negocio.
          </h2>
          <Link to="/login" className="inline-block bg-black hover:bg-gray-800 text-white font-semibold px-12 py-4 rounded-lg transition duration-300 text-lg">
            Proteger mis procesos
          </Link>
        </div>
      </section>

      <FooterPublic />
    </div>
  );
};

export default BusinessPage;
