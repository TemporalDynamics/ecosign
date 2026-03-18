import { Link } from 'react-router-dom';
import Header from '../components/Header';
import FooterPublic from '../components/FooterPublic';
import PageTitle from '../components/PageTitle';
import SEO from '../components/SEO';

const HelpPage = () => {
  const faqs = [
    {
      question: '¿Mi archivo se sube?',
      answer: 'EcoSign no necesita acceder al contenido del archivo para protegerlo.'
    },
    {
      question: '¿Qué es un archivo .ECO?',
      answer: 'Es un respaldo portable con evidencia verificable de integridad, fecha y trazabilidad.'
    },
    {
      question: '¿Cómo verifico mi documento?',
      answer: 'Entrá al Verificador, cargá el PDF y/o el .ECO, y validá integridad, fecha y trazabilidad. En el Verificador, el archivo se procesa localmente (no se sube). En el flujo de firma, el documento puede subirse y almacenarse cifrado.'
    },
    {
      question: '¿Qué diferencia hay entre Firma Legal y Firma Certificada?',
      answer: 'Firma Legal: para el flujo diario con evidencia verificable. Firma Certificada (pago por uso): para los casos que exigen certificación externa.'
    },
    {
      question: '¿Puedo usar Firma Legal para contratos formales?',
      answer: 'Depende del caso y la jurisdicción. Si el proceso exige certificación externa, usá Firma Certificada. Para el resto (RRHH, acuerdos comerciales, NDAs), Firma Legal suele ser la opción práctica.'
    },
    {
      question: 'Perdí mi archivo .ECO, ¿qué hago?',
      answer: 'Podés regenerarlo desde tu panel si el documento no fue eliminado.'
    }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SEO title="Centro de Ayuda" description="Guías y respuestas para usar EcoSign. Protección, firma digital, verificación y más." path="/help" />
      <Header variant="public" />

      {/* Content */}
      <main className="pt-32 pb-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 pb-24">
          <PageTitle subtitle="Preguntas frecuentes sobre EcoSign">
            Ayuda
          </PageTitle>

          <div className="space-y-6 mt-8">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-gray-200 pb-4">
                <h2 className="text-xl font-semibold text-black mb-2">
                  {faq.question}
                </h2>
                <p className="text-base text-gray-700">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-16 pt-8 border-t border-gray-200">
            <div className="text-center space-y-4">
              <p className="text-lg text-gray-700">
                ¿No encontraste lo que buscabas?
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  to="/contact"
                  className="inline-block bg-black hover:bg-gray-800 text-white font-semibold px-8 py-3 rounded-lg transition duration-300"
                >
                  Contactanos
                </Link>
                <Link
                  to="/"
                  className="inline-block bg-white border-2 border-black text-black hover:bg-black hover:text-white font-semibold px-8 py-3 rounded-lg transition duration-300"
                >
                  Volver al inicio
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <FooterPublic />
    </div>
  );
};

export default HelpPage;
