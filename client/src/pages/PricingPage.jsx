import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Check from 'lucide-react/dist/esm/icons/check';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import X from 'lucide-react/dist/esm/icons/x';
import Users from 'lucide-react/dist/esm/icons/users';
import HardDrive from 'lucide-react/dist/esm/icons/hard-drive';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Shield from 'lucide-react/dist/esm/icons/shield';
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart3';
import Clock from 'lucide-react/dist/esm/icons/clock';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
import FooterPublic from '../components/FooterPublic';

function PricingPage() {
  const [openFAQ, setOpenFAQ] = useState(null);

  const toggleFAQ = (index) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const faqs = [
    {
      question: "¿Cuál es la diferencia entre FREE, PRO y BUSINESS?",
      answer: (
        <>
          <p className="text-gray-700 leading-relaxed">
            La diferencia principal es el volumen de Firmas Legales incluidas y el nivel de herramientas de Auditoría Avanzada.
          </p>
          <p className="text-gray-700 leading-relaxed mt-2">
            El plan BUSINESS te ofrece Firmas EcoSign (Forense) Ilimitadas, mientras que el PRO está pensado para un uso profesional de bajo volumen.
          </p>
        </>
      )
    },
    {
      question: "¿Si tengo el plan FREE o agoto mi límite, puedo comprar firmas sin subir de plan?",
      answer: (
        <>
          <p className="text-gray-700 leading-relaxed">
            Sí. Podés comprar paquetes de Firmas Legales cuando los necesitás. No te forzamos a subir de plan.
          </p>
          <p className="text-gray-700 leading-relaxed mt-2">
            El costo de la firma adicional depende de tu plan desde $0.99 USD a $2.50 USD por unidad.
          </p>
        </>
      )
    },
    {
      question: "¿Qué pasa si un mes no uso todas mis firmas legales?",
      answer: (
        <>
          <p className="text-gray-700 leading-relaxed">
            Se acumulan automáticamente por 60 días para que puedas utilizarlas en los meses de mayor demanda.
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
            Puedes contactarnos a support@ecosign.app
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
      description: 'Probá la plataforma. Pagás solo lo que necesitás.',
      features: [
        { text: 'Usuarios', value: '1' },
        { text: 'Firmantes Invitados', value: 'Ilimitados' },
        { text: 'Almacenamiento', value: '1 GB' },
        { text: 'Firma EcoSign', value: '3 por mes' },
        { text: 'LegalSign', value: '$2.50 USD x firma' },
        { text: 'Blindaje Forense', value: 'Básico' },
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
      description: 'Promoción de lanzamiento',
      features: [
        { text: 'Usuarios', value: '2' },
        { text: 'Firmantes Invitados', value: 'Ilimitados' },
        { text: 'Almacenamiento', value: '5 GB' },
        { text: 'Firma EcoSign', value: '100 por mes' },
        { text: 'LegalSign', value: '20 por mes' },
        { text: 'Blindaje Forense', value: 'Completo' },
        { text: 'Panel de Auditoría Avanzado', value: false },
        { text: 'Acceso a API', value: false }
      ],
      buttonText: 'Comenzar PRO',
      popular: true
    },
    {
      name: 'BUSINESS',
      subtitle: 'Alto Volumen/Equipos',
      price: '$49',
      period: ' USD',
      originalPrice: '$89',
      description: 'Para empresas en crecimiento',
      features: [
        { text: 'Usuarios', value: '5' },
        { text: 'Firmantes Invitados', value: 'Ilimitados' },
        { text: 'Almacenamiento', value: '25 GB' },
        { text: 'Firma EcoSign', value: 'ILIMITADAS' },
        { text: 'LegalSign', value: '100 por mes' },
        { text: 'Blindaje Forense', value: 'Completo' },
        { text: 'Panel de Auditoría Avanzado', value: true },
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
        { text: 'Firmantes Invitados', value: 'Ilimitados' },
        { text: 'Almacenamiento', value: 'Personalizado' },
        { text: 'Firma EcoSign', value: 'ILIMITADAS' },
        { text: 'LegalSign', value: 'Personalizado' },
        { text: 'Blindaje Forense', value: 'Completo' },
        { text: 'Panel de Auditoría Avanzado', value: true },
        { text: 'Acceso a API', value: 'Completo' }
      ],
      buttonText: 'Contactar Ventas',
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation - Same as Landing */}
      <nav className="bg-white fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center space-x-3">
              <span className="text-2xl font-bold text-[#0E4B8B]">EcoSign</span>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/how-it-works" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200">
                Cómo funciona
              </Link>
              <Link to="/verify" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200">
                Verificador
              </Link>
              <Link to="/pricing" className="text-black font-medium text-[17px] transition duration-200">
                Precios
              </Link>
              <Link to="/login" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200">
                Iniciar Sesión
              </Link>
              <Link
                to="/login"
                className="bg-black hover:bg-gray-800 text-white font-semibold px-6 py-2.5 rounded-lg transition duration-300"
              >
                Comenzar Gratis
              </Link>
            </div>
            <div className="md:hidden flex items-center space-x-4">
              <Link to="/login" className="text-gray-600 hover:text-black text-sm font-semibold">
                Login
              </Link>
              <Link
                to="/login"
                className="bg-black hover:bg-gray-800 text-white font-semibold px-4 py-2 rounded-lg text-sm"
              >
                Gratis
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 pt-32">
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">Planes EcoSign: Evidencia que Crece Contigo</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">Fija tu seguridad, no tus costos. Elegí el plan que mejor se adapte a tus necesidades. Precios claros, sin excedentes sorpresa y con la máxima solidez forense.</p>
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
                        {feature.text === 'Firma Legal' ? (
                          <div className="relative inline-block"> {/* Tooltip trigger */}
                            <span className="text-gray-700 font-medium cursor-pointer group-hover:text-[#0E4B8B]" tabIndex="0">
                              {feature.text}:
                            </span>
                            {feature.value !== true && feature.value !== false && (
                              <span className="text-black ml-1">{feature.value}</span>
                            )}
                            {/* Tooltip content */}
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-10 group-hover:block group-focus-within:block">
                              Usamos la API de SignNow que cumple con los estándares eIDAS, ESIGN, UETA con aceptación en más de 90 países.
                              <div className="absolute left-1/2 -translate-x-1/2 h-2 w-2 bg-gray-800 rotate-45 -bottom-1"></div> {/* Tooltip arrow */}
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className="text-gray-700 font-medium">{feature.text}:</span>
                            {feature.value !== true && feature.value !== false && (
                              <span className="text-black ml-1">{feature.value}</span>
                            )}
                          </>
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

        {/* Costo de Servicios Avanzados (Firmas Legales) */}
        <div className="max-w-4xl mx-auto px-4 py-24">
          <h2 className="text-4xl font-bold text-center mb-6 flex items-center justify-center">
            <FileText className="w-8 h-8 text-[#0E4B8B] mr-3" strokeWidth={1.5} />
            Costo de Servicios Avanzados (Firmas Legales)
          </h2>
          <p className="text-lg text-center text-gray-600 max-w-3xl mx-auto mb-6">
            Cuando tu flujo requiere Firma Electrónica Avanzada o Cualificada (QES) a través de LegalSign, el costo por unidad es:
          </p>
          <p className="text-lg text-center text-gray-600 max-w-3xl mx-auto mb-8">
            <strong>Precio por Firma:</strong> Desde $0.99 USD hasta $2.50 USD por unidad, dependiendo de tu plan base.
          </p>
          <p className="text-lg text-center text-gray-600 max-w-3xl mx-auto mb-12">
            <strong>Pagás solo lo que usás.</strong> Tu panel de control siempre muestra tu saldo disponible de firmas. El sistema te notifica con antelación antes de alcanzar cualquier límite y nunca cobra un excedente sin tu autorización explícita.
          </p>
        </div>

        {/* Acumulación Inteligente de Firmas */}
        <div className="max-w-4xl mx-auto px-4 py-24">
          <h2 className="text-4xl font-bold text-center mb-6 flex items-center justify-center">
            <Clock className="w-8 h-8 text-[#0E4B8B] mr-3" strokeWidth={1.5} />
            Acumulación Inteligente de Firmas
          </h2>
          <p className="text-lg text-center text-gray-600 max-w-3xl mx-auto mb-6">
            [SOLO aplica a Firmas Legales / LegalSign] Si las firmas legales incluidas en tu plan no son utilizadas en el mes, no se pierden. Se acumulan automáticamente en tu cuenta por 60 días, permitiéndote usarlas cuando más las necesites.
          </p>
          <div className="bg-gray-50 p-6 rounded-lg max-w-3xl mx-auto mb-6 text-center">
            <p className="font-semibold text-black mb-2">Ejemplo:</p>
            <p className="text-base text-gray-700 leading-relaxed">
              Si tu plan incluye 20 firmas y usaste 15, el mes siguiente inicias con 25 firmas disponibles. Las más antiguas caducan a los 60 días de su emisión inicial.
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
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 min-w-[200px]">Característica</th>
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
          <p>¿Te quedaron dudas? Puedes contactarnos a <a href="mailto:support@ecosign.app" className="text-black hover:text-gray-700 font-semibold underline">support@ecosign.app</a></p>
        </div>
      </div>

      <FooterPublic />
    </div>
  );
}

export default PricingPage;
