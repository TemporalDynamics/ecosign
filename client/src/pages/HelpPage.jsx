import { Link } from 'react-router-dom';
import HeaderPublic from '../components/HeaderPublic';
import FooterPublic from '../components/FooterPublic';
import PageTitle from '../components/PageTitle';
import HuellaDigitalTooltip from '../components/HuellaDigitalTooltip';
import SelloDeIntegridadTooltip from '../components/SelloDeIntegridadTooltip';
import RegistroDigitalInalterableTooltip from '../components/RegistroDigitalInalterableTooltip';
import SelloDeTiempoLegalTooltip from '../components/SelloDeTiempoLegalTooltip';
import InhackeableTooltip from '../components/InhackeableTooltip';
import PolygonTooltip from '../components/PolygonTooltip';
import BitcoinTooltip from '../components/BitcoinTooltip';

const HelpPage = () => {
  const faqs = [
    {
      question: '¿Mi archivo se sube?',
      answer: <>No. Solo procesamos su <HuellaDigitalTooltip>Huella Digital</HuellaDigitalTooltip> (<SelloDeIntegridadTooltip>Sello de Integridad</SelloDeIntegridadTooltip>).</>
    },
    {
      question: '¿Qué es un archivo .ECO?',
      answer: <>Es un certificado ligero que contiene la prueba de <SelloDeIntegridadTooltip>integridad</SelloDeIntegridadTooltip>, <SelloDeTiempoLegalTooltip>fecha</SelloDeTiempoLegalTooltip> y autenticidad.</>
    },
    {
      question: '¿Cómo verifico mi documento?',
      answer: 'Subís el PDF o el archivo .ECO en la sección "Verificar" y nuestro sistema confirma su validez.'
    },
    {
      question: '¿Qué diferencia hay entre Firma Legal y Firma Certificada?',
      answer: <>Firma Legal → firma interna con Hoja de Auditoría. Firma Certificada (pago por uso) → firma con validez eIDAS/ESIGN/UETA.</>
    },
    {
      question: '¿Puedo usar Firma Legal para contratos formales?',
      answer: 'Sí, usando la opción de Firma Certificada.'
    },
    {
      question: 'Perdí mi archivo .ECO, ¿qué hago?',
      answer: 'Podés regenerarlo desde tu panel si el documento no fue eliminado.'
    }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <HeaderPublic />

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
