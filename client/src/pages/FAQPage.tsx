import React, { useState } from 'react';
import Header from '../components/Header';
import FooterPublic from '../components/FooterPublic';
import PageTitle from '../components/PageTitle';
import SEO from '../components/SEO';
import { ChevronUp, ChevronDown } from 'lucide-react';

type FAQ = {
  question: string;
  answer: React.ReactNode;
};

const faqs: FAQ[] = [
  {
    question: '¿Qué protege EcoSign exactamente?',
    answer: (
      <>
        Protege el proceso completo: documento, participantes, acciones y respaldo final.
        No se trata solo de cerrar una firma, sino de conservar evidencia verificable sobre lo que ocurrió.
      </>
    ),
  },
  {
    question: '¿EcoSign puede leer mi documento?',
    answer: (
      <>
        No. El producto está diseñado para proteger sin exponer contenido.
        La plataforma no necesita abrir tu archivo para generar respaldo verificable.
      </>
    ),
  },
  {
    question: '¿Qué recibe la persona que participa en el flujo?',
    answer: (
      <>
        Recibe un acceso claro para revisar, firmar y descargar su respaldo.
        El objetivo es reducir fricción durante el flujo y dejar claridad después.
      </>
    ),
  },
  {
    question: '¿Qué pasa si necesito verificar después?',
    answer: (
      <>
        EcoSign conserva un respaldo verificable para que puedas validar integridad y trazabilidad cuando haga falta.
      </>
    ),
  },
  {
    question: '¿Cuál es la diferencia entre una plataforma de firma y EcoSign?',
    answer: (
      <>
        Una plataforma de firma confirma consentimiento.
        EcoSign, además, protege el trabajo con evidencia verificable y continuidad de proceso.
      </>
    ),
  },
  {
    question: '¿Tengo que empezar con un plan pago?',
    answer: (
      <>
        No. Podés empezar gratis para crear hábito y validar el flujo.
        Cuando tu operación crece, escalás capacidad por operaciones y participantes.
      </>
    ),
  },
];

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}) {
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
      {isOpen && <div className="px-6 pb-6 text-gray-700">{answer}</div>}
    </div>
  );
}

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SEO title="Preguntas Frecuentes" description="Respuestas a las preguntas más comunes sobre firma digital, protección y verificación en EcoSign." path="/faq" />
      <Header variant="public" />

      <main className="flex-grow pt-16">
        <div className="max-w-3xl mx-auto px-4 pb-24">
          <PageTitle subtitle="Respuestas simples sobre protección, privacidad y verificación.">
            Preguntas frecuentes
          </PageTitle>

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

          <div className="text-center mt-16 pt-8 border-t border-gray-200">
            <p className="text-lg text-gray-700 mb-6">¿No encontraste lo que buscabas?</p>
            <a
              href="/contact"
              className="inline-block bg-black text-white px-8 py-4 rounded-lg font-semibold hover:bg-gray-800 transition"
            >
              Contactar soporte
            </a>
          </div>
        </div>
      </main>

      <FooterPublic />
    </div>
  );
}
