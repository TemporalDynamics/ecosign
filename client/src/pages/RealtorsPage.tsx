import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import FooterPublic from '../components/FooterPublic';
import Header from '../components/Header';
import SEO from '../components/SEO';

const RealtorsPage = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SEO title="Protección para Inmobiliarias" description="Protegé reservas, boletos y documentación inmobiliaria con firma digital y evidencia blockchain." path="/realtors" />
      <Header
        variant="public"
        publicCta={{ to: '/login?mode=signup', label: 'Proteger mi próxima operación' }}
      />

      <header className="pt-32 pb-24 md:pt-40 md:pb-32 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-[54px] sm:text-6xl lg:text-7xl font-bold leading-tight text-black mb-8">
            Tu operación cerrada en minutos,<br />no en semanas.
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
            El costo real de usar plataformas genéricas
          </h2>
          <div className="space-y-6">
            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Fricción de cierre</h3>
              <p className="text-gray-700">Tu comprador quiere firmar a las 11pm. Con firma papel, esperás al día siguiente. Con EcoSign, la reserva queda firmada en 15 minutos.</p>
            </div>
            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Riesgo y exposición</h3>
              <p className="text-gray-700">Precios, comisiones y datos sensibles en sistemas donde no controlás todo el flujo. EcoSign nunca lee el contenido del documento.</p>
            </div>
            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Costo impredecible</h3>
              <p className="text-gray-700">Límites por sobres o créditos que impactan justo en operaciones clave. Con EcoSign, operaciones ilimitadas desde $15 USD/mes.</p>
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
              <h3 className="text-xl font-semibold text-black mb-3">Cierre más rápido</h3>
              <p className="text-gray-700">Firma y seguimiento en el mismo flujo para reducir demoras operativas.</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-3">Confidencialidad real</h3>
              <p className="text-gray-700">Protegés el trabajo sin exponer el contenido del archivo.</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-3">Respaldo verificable</h3>
              <p className="text-gray-700">La evidencia queda lista para revisar cuando haga falta.</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-3">Menos tareas manuales</h3>
              <p className="text-gray-700">Menos reenvíos, menos seguimiento por chat y menos fricción con el cliente.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 text-center">
            Qué documentos protegés con EcoSign
          </h2>
          <p className="text-xl text-gray-700 text-center mb-12 max-w-3xl mx-auto">
            Casos reales del día a día inmobiliario. Diseñado con corredores de Buenos Aires.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-3">Reservas y señas</h3>
              <p className="text-gray-700">Acuerdos rápidos que necesitan agilidad. El cliente firma en el acto desde el celular.</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-3">Boletos de compraventa</h3>
              <p className="text-gray-700">Protegés el acuerdo antes de la escritura y conservás evidencia de cada versión.</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-3">Mandatos de venta</h3>
              <p className="text-gray-700">El propietario firma remoto y vos seguís el estado sin perder contexto.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
            Guía rápida para decidir
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-xl border border-gray-200">
              <h3 className="text-2xl font-bold text-black mb-4">Firma Legal (flujo diario)</h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />Reservas, autorizaciones y acuerdos previos.</li>
                <li className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />Rápida, simple y con evidencia verificable.</li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-xl border border-gray-200">
              <h3 className="text-2xl font-bold text-black mb-4">Firma Certificada (casos críticos)</h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />Escrituras o procesos que exigen certificación externa.</li>
                <li className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />Misma plataforma, distinto nivel según necesidad.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Protegé tu próxima operación desde hoy.
          </h2>
          <Link to="/login?mode=signup" className="inline-block bg-black hover:bg-gray-800 text-white font-semibold px-12 py-4 rounded-lg transition duration-300 text-lg">
            Proteger mi próxima operación
          </Link>
        </div>
      </section>

      <FooterPublic />
    </div>
  );
};

export default RealtorsPage;
