import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';

const HelpPage = () => {
  const faqs = [
    {
      question: '¿Mi archivo se sube?',
      answer: 'No. Solo procesamos su hash SHA-256.'
    },
    {
      question: '¿Qué es un archivo .ECO?',
      answer: 'Es un certificado ligero que contiene la prueba matemática de integridad, fecha y autenticidad.'
    },
    {
      question: '¿Cómo verifico mi documento?',
      answer: 'Subís el PDF o el archivo .ECO en la sección "Verificar" y nuestro sistema confirma su validez.'
    },
    {
      question: '¿Qué diferencia hay entre Firma EcoSign y Firma Legal?',
      answer: 'EcoSign → firma interna con Hoja de Auditoría. SignNow → firma legal con validez eIDAS/ESIGN/UETA.'
    },
    {
      question: '¿Puedo usar EcoSign para contratos formales?',
      answer: 'Sí, usando la opción de Firma Legal.'
    },
    {
      question: 'Perdí mi archivo .ECO, ¿qué hago?',
      answer: 'Podés regenerarlo desde tu panel si el documento no fue eliminado.'
    }
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
            <HelpCircle className="w-12 h-12 text-black mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
              Ayuda
            </h1>
            <p className="text-xl text-gray-700">
              Preguntas frecuentes sobre EcoSign
            </p>
          </div>

          <div className="space-y-8">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-black mb-3">
                  {faq.question}
                </h2>
                <p className="text-lg text-gray-700">
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
    </div>
  );
};

export default HelpPage;
