import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import FooterPublic from '../components/FooterPublic';
import Header from '../components/Header';
import SEO from '../components/SEO';

const LawyersPage = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SEO title="Protección para Abogados" description="Certifica contratos, acuerdos y documentos legales con evidencia verificable y timestamp RFC 3161." path="/abogados" />
      <Header
        variant="public"
        publicCta={{ to: '/login?mode=signup', label: 'Proteger mis documentos' }}
      />

      <header className="pt-32 pb-24 md:pt-40 md:pb-32 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-[54px] sm:text-6xl lg:text-7xl font-bold leading-tight text-black mb-8">
            Tu cliente protegido.<br />Tu estudio blindado.
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto mb-12 leading-relaxed">
            Evidencia técnica verificable que resiste impugnación.
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
              <p className="text-gray-700">Sin evidencia clara del después de la firma, el litigio se vuelve más costoso.</p>
            </div>
            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Tiempo no facturable</h3>
              <p className="text-gray-700">Seguimiento manual de firmantes, reenvíos y coordinación operativa.</p>
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
            No todos los documentos necesitan la misma protección
          </h2>
          <p className="text-xl text-gray-700 text-center mb-10 max-w-3xl mx-auto">
            En la mayoría de las operaciones, la firma legal es suficiente. La firma certificada se reserva para casos donde la evidencia puede ser impugnada.
          </p>
          <div className="grid md:grid-cols-2 gap-6 mt-10">
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-3">Firma Legal (80% del flujo)</h3>
              <p className="text-gray-700 mb-2"><strong>Cuándo:</strong> acuerdos privados, NDAs, autorizaciones, cartas documento y documentación de gestión.</p>
              <p className="text-gray-700"><strong>Por qué:</strong> rápida, económica y con evidencia verificable. Suficiente para la mayoría de los casos.</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-3">Firma Certificada (20% crítico)</h3>
              <p className="text-gray-700 mb-2"><strong>Cuándo:</strong> contratos de alto valor, escrituras, o documentos que exigen certificación externa por normativa.</p>
              <p className="text-gray-700"><strong>Por qué:</strong> subís el nivel en los casos de mayor exposición con un proveedor acreditado.</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-6 text-center">
            La firma confirma intención. La protección preserva respaldo.
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
              <span><strong>Trazabilidad:</strong> quién accedió y cuándo en cada etapa.</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Protegé cada caso con evidencia verificable.
          </h2>
          <Link to="/login?mode=signup" className="inline-block bg-black hover:bg-gray-800 text-white font-semibold px-12 py-4 rounded-lg transition duration-300 text-lg">
            Proteger mis documentos
          </Link>
        </div>
      </section>

      <FooterPublic />
    </div>
  );
};

export default LawyersPage;
