import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, CheckCircle, X, FileText, Shield, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import FooterPublic from '../components/FooterPublic';
import Header from '../components/Header';

function PricingPage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const faqs = [
    {
      question: "¿Cuál es la diferencia entre FREE, PRO y BUSINESS?",
      answer: (
        <>
          <p className="text-gray-700 leading-relaxed">
            La diferencia principal es la capacidad operativa: operaciones mensuales, participantes por operación, documentos por operación y nivel de supervisión.
          </p>
          <p className="text-gray-700 leading-relaxed mt-2">
            El plan BUSINESS está pensado para equipos que necesitan mayor volumen y control. PRO es ideal para operación profesional diaria.
          </p>
        </>
      )
    },
    {
      question: "¿Si agoto mis límites, puedo sumar capacidad sin subir de plan?",
      answer: (
        <>
          <p className="text-gray-700 leading-relaxed">
            Sí. Podés sumar capacidad puntual para operaciones o participantes cuando lo necesitás, sin quedar obligado a cambiar de plan.
          </p>
          <p className="text-gray-700 leading-relaxed mt-2">
            El costo adicional depende de tu plan y siempre se muestra antes de confirmar.
          </p>
        </>
      )
    },
    {
      question: "¿Qué pasa si un mes no uso toda mi capacidad?",
      answer: (
        <>
          <p className="text-gray-700 leading-relaxed">
            Tu cuenta conserva el plan activo y podés ajustar capacidad cuando cambie tu volumen de trabajo.
          </p>
        </>
      )
    },
    {
      question: "¿Hay cargos ocultos o facturación inesperada?",
      answer: (
        <>
          <p className="text-gray-700 leading-relaxed">
            No. Nuestra promesa de transparencia es total. El sistema requiere tu confirmación para procesar cualquier firma adicional fuera del límite del plan.
          </p>
        </>
      )
    },
    {
      question: "¿Puedo cambiar de plan en cualquier momento?",
      answer: (
        <>
          <p className="text-gray-700 leading-relaxed">
            Sí. Podés subir, bajar o cancelar tu plan en cualquier momento desde el panel de usuario.
          </p>
        </>
      )
    },
    {
      question: "¿Te quedaron dudas?",
      answer: (
        <>
          <p className="text-gray-700 leading-relaxed">
            Puedes contactarnos a support@email.ecosign.app
          </p>
        </>
      )
    }
  ];
  const plans = [
    {
      name: 'FREE',
      price: '$0',
      period: '',
      subtitle: 'Muestra',
      description: 'Empezá gratis y creá hábito de protección.',
      features: [
        { text: 'Usuarios', value: '1' },
        { text: 'Operaciones por mes', value: '5' },
        { text: 'Participantes por operación', value: 'Hasta 2' },
        { text: 'Documentos por operación', value: '1' },
        { text: 'Almacenamiento', value: '1 GB' },
        { text: 'Protección base', value: 'Incluida' },
        { text: 'Protección reforzada', value: 'Estándar' },
        { text: 'Panel de Auditoría Avanzado', value: false },
        { text: 'Acceso a API', value: false }
      ],
      buttonText: 'Empezar Gratis',
      popular: false
    },
    {
      name: 'PRO',
      subtitle: 'Profesional/Pyme',
      price: '$15',
      period: ' USD',
      originalPrice: '$40',
      description: 'Promoción de lanzamiento.',
      features: [
        { text: 'Usuarios', value: '2' },
        { text: 'Operaciones por mes', value: '100' },
        { text: 'Participantes por operación', value: 'Hasta 10' },
        { text: 'Documentos por operación', value: 'Hasta 5' },
        { text: 'Almacenamiento', value: '5 GB' },
        { text: 'Protección base', value: 'Incluida' },
        { text: 'Protección reforzada', value: 'Prioritaria' },
        { text: 'Panel de Auditoría Avanzado', value: false },
        { text: 'Acceso a API', value: false }
      ],
      buttonText: 'Comenzar PRO',
      popular: true
    },
    {
      name: 'BUSINESS',
      subtitle: 'Alto Volumen/Equipos · Compliance y operaciones',
      price: '$49',
      period: ' USD',
      originalPrice: '$89',
      description: 'Promoción de lanzamiento.',
      features: [
        { text: 'Usuarios', value: '5' },
        { text: 'Operaciones por mes', value: '300' },
        { text: 'Participantes por operación', value: 'Hasta 20' },
        { text: 'Documentos por operación', value: 'Hasta 10' },
        { text: 'Almacenamiento', value: '25 GB' },
        { text: 'Protección base', value: 'Incluida' },
        { text: 'Protección reforzada', value: 'Prioritaria' },
        { text: 'Panel supervisor', value: true },
        { text: 'Acceso a API', value: 'Limitado' }
      ],
      buttonText: 'Comenzar BUSINESS',
      popular: false
    },
    {
      name: 'ENTERPRISE',
      price: 'Custom',
      period: '',
      description: 'Solución a medida',
      features: [
        { text: 'Usuarios', value: 'Ilimitados' },
        { text: 'Operaciones por mes', value: 'Custom' },
        { text: 'Participantes por operación', value: 'Custom' },
        { text: 'Documentos por operación', value: 'Custom' },
        { text: 'Almacenamiento', value: 'Personalizado' },
        { text: 'Protección base', value: 'Incluida' },
        { text: 'Protección reforzada', value: 'A medida' },
        { text: 'Panel de Auditoría Avanzado', value: true },
        { text: 'Acceso a API', value: 'Completo' }
      ],
      buttonText: 'Contactar Ventas',
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header variant="public" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 pt-32">
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">Planes EcoSign: Evidencia que Crece Contigo</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">Elegí la capacidad que necesitás para proteger trabajo real: operaciones, participantes y supervisión, sin costos sorpresa.</p>
          <p className="text-sm text-gray-600 mt-2">Probá sin tarjeta y podés cancelar cuando quieras.</p>
        </header>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {plans.map((plan, index) => (
            <div key={index} className={`relative bg-white rounded-xl overflow-visible border-2 ${plan.popular ? 'border-[#0E4B8B] shadow-[0_4px_25px_-5px_rgba(14,75,139,0.2)]' : 'border-gray-200 shadow-lg'}`}>
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#0E4B8B] text-white text-xs font-bold px-4 py-1 rounded-full shadow-md z-20">
                  MÁS POPULAR
                </div>
              )}
              <div className="p-6 flex flex-col h-full">
                <div className="flex-shrink-0 mb-6 min-h-[170px]">
                  <h2 className="text-2xl font-bold text-black mb-1">{plan.name}</h2>
                  {plan.subtitle && (
                    <p className="text-sm text-gray-600 mb-3">{plan.subtitle}</p>
                  )}
                  <div className="mb-3">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-black">{plan.price}</span>
                      {plan.period && <span className="text-lg text-gray-600">{plan.period}</span>}
                    </div>
                    {plan.originalPrice && (
                      <div className="text-sm text-gray-500 mt-1">
                        Valor Real: <span className="line-through">{plan.originalPrice} USD</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{plan.description}</p>
                  {(plan.name === 'PRO' || plan.name === 'BUSINESS') && (
                    <div className="mt-3 inline-block bg-gray-100 text-gray-800 text-xs font-semibold px-3 py-1 rounded-md">
                      Tu tarifa queda protegida mientras sigas en el plan
                    </div>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm relative group"> {/* Added relative group */}
                      {feature.value === true ? (
                        <Check className="w-4 h-4 text-black mr-2 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                      ) : feature.value === false ? (
                        <X className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                      ) : (
                        <Check className="w-4 h-4 text-black mr-2 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                      )}
                      <div className="flex-1">
                        <span className="text-gray-700 font-medium">{feature.text}:</span>
                        {feature.value !== true && feature.value !== false && (
                          <span className="text-black ml-1">{feature.value}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                <Link to="/login" className={`block w-full py-3 px-6 rounded-lg font-bold text-center transition duration-300 ${
                  plan.popular
                    ? 'bg-black hover:bg-gray-800 text-white shadow-lg'
                    : 'bg-gray-100 hover:bg-gray-200 text-black border border-gray-300'
                }`}>
                  {plan.buttonText}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Transparencia y Control: La Filosofía de Precios */}
        <div className="max-w-4xl mx-auto px-4 py-24">
          <h2 className="text-4xl font-bold text-center mb-6 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-[#0E4B8B] mr-3" strokeWidth={1.5} />
            Transparencia y Control: La Filosofía de Precios
          </h2>
          <p className="text-lg text-center text-gray-600 max-w-3xl mx-auto mb-12">
            En EcoSign, no hay facturación sorpresa ni cargos ocultos. El control de tu presupuesto está en tus manos.
          </p>
        </div>

        {/* Capacidad adicional */}
        <div className="max-w-4xl mx-auto px-4 py-24">
          <h2 className="text-4xl font-bold text-center mb-6 flex items-center justify-center">
            <FileText className="w-8 h-8 text-[#0E4B8B] mr-3" strokeWidth={1.5} />
            Capacidad adicional cuando la necesitás
          </h2>
          <p className="text-lg text-center text-gray-600 max-w-3xl mx-auto mb-6">
            Si tu volumen crece, podés sumar capacidad para operaciones o participantes sin cambiar de plan.
          </p>
          <p className="text-lg text-center text-gray-600 max-w-3xl mx-auto mb-8">
            <strong>Precio adicional orientativo por participante:</strong> desde $0.0027 (FREE) y $0.0047 (PRO), según el plan.
          </p>
          <p className="text-lg text-center text-gray-600 max-w-3xl mx-auto mb-12">
            <strong>Pagás solo lo que usás.</strong> Tu panel muestra capacidad y consumo antes de confirmar cualquier adicional.
          </p>
        </div>

        {/* Escalabilidad de operación */}
        <div className="max-w-4xl mx-auto px-4 py-24">
          <h2 className="text-4xl font-bold text-center mb-6 flex items-center justify-center">
            <Clock className="w-8 h-8 text-[#0E4B8B] mr-3" strokeWidth={1.5} />
            Escalabilidad sin frenar tu flujo
          </h2>
          <p className="text-lg text-center text-gray-600 max-w-3xl mx-auto mb-6">
            EcoSign está diseñado para crecer con tu operación: empezás simple, subís capacidad cuando lo necesitás y mantenés continuidad de trabajo.
          </p>
          <div className="bg-gray-50 p-6 rounded-lg max-w-3xl mx-auto mb-6 text-center">
            <p className="font-semibold text-black mb-2">Ejemplo:</p>
            <p className="text-base text-gray-700 leading-relaxed">
              Si operás con mayor volumen en un mes puntual, podés ampliar capacidad y volver al plan base cuando estabilizás tu operación.
            </p>
          </div>
        </div>

        {/* Beneficio Founder: Asegura tu Precio para Siempre */}
        <div className="max-w-4xl mx-auto px-4 py-24">
          <h2 className="text-4xl font-bold text-center mb-6 flex items-center justify-center">
            <Shield className="w-8 h-8 text-[#0E4B8B] mr-3" strokeWidth={1.5} />
            Beneficio Founder: Asegura tu Precio para Siempre
          </h2>
          <p className="text-lg text-center text-gray-600 max-w-3xl mx-auto mb-6">
            Los primeros usuarios que se unan a EcoSign mantendrán su precio de lanzamiento de por vida mientras continúen activos en su plan.
          </p>
          <p className="text-lg text-center text-gray-600 max-w-3xl mx-auto mb-12">
            <em>Recibirás un Badge Founder por correo, confirmando tu estatus y número de usuario inicial.</em>
          </p>
        </div>

        {/* ¿Por qué EcoSign? La Seguridad de la Verdad */}
        <div className="max-w-4xl mx-auto px-4 py-24">
          <h2 className="text-4xl font-bold text-center mb-6 flex items-center justify-center">
            <Check className="w-8 h-8 text-[#0E4B8B] mr-3" strokeWidth={1.5} />
            ¿Por qué EcoSign? La Seguridad de la Verdad
          </h2>
          <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 min-w-[140px] w-[30%]">Característica</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900">Propuesta de Valor (Blindaje Forense)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">Evidencia, no Confianza</td>
                  <td className="py-4 px-4 text-sm text-gray-700">No te pedimos que confíes en nosotros. Te damos evidencia forense irrefutable (Triple Anclaje y SmartHash) que podés verificar por tu cuenta.</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">Privacidad Total</td>
                  <td className="py-4 px-4 text-sm text-gray-700">No almacenamos tu archivo. Nuestro sistema está diseñado para trabajar con el hash de tu documento, no con el contenido.</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">Control Absoluto</td>
                  <td className="py-4 px-4 text-sm text-gray-700">No vemos tu contenido. EcoSign es un servicio pensado para blindar tu voluntad y tus documentos, no para trabajar contra vos como intermediario.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        

        <div className="bg-white p-8 md:p-12 rounded-2xl border-2 border-gray-200 mb-12">
          <h2 className="text-3xl font-bold text-black mb-8 text-center">Preguntas Frecuentes</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-gray-200">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex justify-between items-center py-4 text-left hover:bg-gray-50 transition-colors px-2"
                >
                  <h3 className="text-base md:text-lg font-medium text-black pr-4">
                    {faq.question}
                  </h3>
                  {openFAQ === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-600 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0" />
                  )}
                </button>
                {openFAQ === index && (
                  <div className="pb-4 px-2 animate-fadeIn text-base text-gray-700 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-gray-600 mb-8">
          <p>¿Te quedaron dudas? Puedes contactarnos a <a href="mailto:support@email.ecosign.app" className="text-black hover:text-gray-700 font-semibold underline">support@email.ecosign.app</a></p>
        </div>
      </div>

      <FooterPublic />
    </div>
  );
}

export default PricingPage;
