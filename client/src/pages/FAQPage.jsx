import React, { useState } from 'react';
import HeaderPublic from '../components/HeaderPublic';
import FooterPublic from '../components/FooterPublic';
import PageTitle from '../components/PageTitle';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';

const faqs = [
  {
    question: "¿Mi documento se sube a los servidores de EcoSign?",
    answer: "No. EcoSign aplica el principio Zero-Knowledge: el archivo nunca se sube ni se almacena."
  },
  {
    question: "¿Qué es un archivo .ECO?",
    answer: "Es un certificado portable que contiene la evidencia matemática del proceso: hash, timestamps, blockchain y la auditoría completa. No incluye tu documento."
  },
  {
    question: "¿En qué se diferencia EcoSign de una firma legal tradicional?",
    answer: "EcoSign Ilimitada: evidencia forense + trazabilidad (uso interno). Firma Legal: cumplimiento jurídico pleno (eIDAS/ESIGN/UETA)."
  },
  {
    question: "¿Cómo garantizan la fecha cierta?",
    answer: "Mediante sellos de tiempo legales RFC 3161 de Autoridades de Confianza."
  },
  {
    question: "¿Qué pasa si cambian el documento después de firmarlo?",
    answer: "El hash cambia automáticamente. El .ECO detecta la modificación al instante."
  }
];

function FAQItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={onToggle}
        className="w-full py-6 flex items-center justify-between text-left hover:bg-gray-50 transition px-6"
      >
        <span className="text-lg font-semibold text-black pr-8">{question}</span>
        {isOpen ? (
          <ChevronUp className="w-6 h-6 text-[#0A66C2] flex-shrink-0" />
        ) : (
          <ChevronDown className="w-6 h-6 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 pb-6 text-gray-700">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <HeaderPublic />
      
      <main className="flex-grow pt-16">
        <div className="max-w-3xl mx-auto px-4 pb-24">
          <PageTitle subtitle="Respuestas claras sobre privacidad, firmas legales y verificación.">
            Preguntas Frecuentes
          </PageTitle>

          {/* FAQ List */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm mt-8">
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={openIndex === index}
                onToggle={() => setOpenIndex(openIndex === index ? null : index)}
              />
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-16 pt-8 border-t border-gray-200">
            <p className="text-lg text-gray-700 mb-6">
              ¿No encontraste lo que buscabas?
            </p>
            <a
              href="/contact"
              className="inline-block bg-black text-white px-8 py-4 rounded-lg font-semibold hover:bg-gray-800 transition"
            >
              Contactar Soporte
            </a>
          </div>
        </div>
      </main>

      <FooterPublic />
    </div>
  );
}
