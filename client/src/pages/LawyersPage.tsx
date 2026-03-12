import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import FooterPublic from '../components/FooterPublic';

const LawyersPage = () => {
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
              <Link to="/login" className="bg-black hover:bg-gray-800 text-white font-semibold px-6 py-2.5 rounded-lg transition duration-300">Proteger mis documentos</Link>
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
              <Link to="/login" className="block bg-black hover:bg-gray-800 text-white font-semibold px-4 py-2 rounded-lg text-center mt-2">Proteger mis documentos</Link>
            </div>
          </div>
        )}
      </nav>

      <header className="pt-32 pb-24 md:pt-40 md:pb-32 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-[54px] sm:text-6xl lg:text-7xl font-bold leading-tight text-black mb-8">
            Tu cliente protegido.<br />Tu estudio blindado.
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto mb-12 leading-relaxed">
            Evidencia tecnica verificable que resiste impugnacion.
            <br />
            Sin depender de relatos o plataformas externas.
          </p>
        </div>
      </header>

      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
            Riesgos del esquema tradicional
          </h2>
          <div className="space-y-6">
            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Cadena de custodia difusa</h3>
              <p className="text-gray-700">Sin evidencia clara del despues de la firma, el litigio se vuelve mas costoso.</p>
            </div>
            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Tiempo no facturable</h3>
              <p className="text-gray-700">Seguimiento manual de firmantes, reenvios y coordinacion operativa.</p>
            </div>
            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Dependencia de terceros</h3>
              <p className="text-gray-700">Validar evidencia queda atado al proveedor en lugar de un respaldo portable.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 text-center">
            No todos los documentos necesitan la misma proteccion
          </h2>
          <div className="grid md:grid-cols-2 gap-6 mt-10">
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-3">Firma tecnica (80% del flujo)</h3>
              <p className="text-gray-700 mb-2"><strong>Cuando:</strong> acuerdos privados, NDAs, autorizaciones y documentacion de gestion.</p>
              <p className="text-gray-700"><strong>Por que:</strong> rapida, economica y con evidencia verificable.</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-3">Firma certificada (20% critico)</h3>
              <p className="text-gray-700 mb-2"><strong>Cuando:</strong> contratos de alto valor o documentos que exigen certificacion externa.</p>
              <p className="text-gray-700"><strong>Por que:</strong> subis nivel de respaldo en los casos de mayor exposicion.</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-6 text-center">
            La firma confirma intencion. La proteccion preserva respaldo.
          </p>
        </div>
      </section>

      <section className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
            Lo que un perito puede verificar hoy
          </h2>
          <ul className="space-y-4 bg-white rounded-xl p-8 border border-gray-200">
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <span><strong>Huella digital:</strong> evidencia de integridad del documento.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <span><strong>Sello de tiempo:</strong> constancia verificable de fecha.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <span><strong>Registro inalterable:</strong> continuidad del proceso sin huecos.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <span><strong>Trazabilidad:</strong> quien accedio y cuando en cada etapa.</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Protege cada caso con evidencia verificable.
          </h2>
          <Link to="/login" className="inline-block bg-black hover:bg-gray-800 text-white font-semibold px-12 py-4 rounded-lg transition duration-300 text-lg">
            Proteger mis documentos
          </Link>
        </div>
      </section>

      <FooterPublic />
    </div>
  );
};

export default LawyersPage;
