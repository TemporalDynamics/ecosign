import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Check, ArrowLeft, X, Users, HardDrive, FileText, Shield, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
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
            FREE es ideal para empezar sin costos.
          </p>
          <p className="text-gray-700 leading-relaxed mt-2">
            PRO está pensado para profesionales y PyMEs que firman con regularidad.
          </p>
          <p className="text-gray-700 leading-relaxed mt-2">
            BUSINESS está hecho para equipos que necesitan más usuarios, auditoría avanzada y API.
          </p>
        </>
      )
    },
    {
      question: "¿Qué incluye la promoción de lanzamiento?",
      answer: (
        <>
          <p className="text-gray-700 leading-relaxed">
            Los primeros 10.000 usuarios mantienen su precio de por vida mientras no cambien de plan.
          </p>
          <p className="text-gray-700 leading-relaxed mt-2">
            PRO: valor real $40 → $15 USD
          </p>
          <p className="text-gray-700 leading-relaxed">
            BUSINESS: valor real $89 → $49 USD
          </p>
          <p className="text-gray-700 leading-relaxed mt-2">
            Es una ventaja permanente para quienes se suman en esta etapa.
          </p>
        </>
      )
    },
    {
      question: "Si tengo el plan FREE, ¿puedo comprar firmas sin suscribirme?",
      answer: (
        <p className="text-gray-700 leading-relaxed">
          Sí. Podés comprar paquetes cuando los necesitás. No te forzamos a subir de plan. Elegís según tu uso real.
        </p>
      )
    },
    {
      question: "¿Me conviene comprar paquetes o pasarme a PRO/BUSINESS?",
      answer: (
        <>
          <p className="text-gray-700 leading-relaxed">
            Depende de tu volumen:
          </p>
          <ul className="text-gray-700 leading-relaxed mt-2 space-y-1 ml-4">
            <li>• Hasta 10 firmas legales/mes → FREE + paquetes</li>
            <li>• 10–20 firmas legales/mes → PRO conviene mucho más</li>
            <li>• Equipos o múltiples usuarios → BUSINESS directamente</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-2">
            La plataforma no empuja upgrades. Te mostramos lo que realmente te conviene.
          </p>
        </>
      )
    },
    {
      question: "¿Qué pasa si un mes no uso todas mis firmas legales?",
      answer: (
        <p className="text-gray-700 leading-relaxed">
          Se acumulan por 60 días. Las ves reflejadas en tu panel y nunca se pierden sin aviso.
        </p>
      )
    },
    {
      question: "¿Puedo cambiar de plan en cualquier momento?",
      answer: (
        <>
          <p className="text-gray-700 leading-relaxed">
            Sí, y es simple:
          </p>
          <ul className="text-gray-700 leading-relaxed mt-2 space-y-1 ml-4">
            <li>• Si ya pagaste tu plan actual, solo abonás la diferencia para subir de plan.</li>
            <li>• Tu ciclo de facturación no cambia.</li>
            <li>• Tus firmas disponibles mantienen sus 60 días aunque cambie el plan.</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-2">
            Sin confusiones, sin recargos ocultos.
          </p>
        </>
      )
    },
    {
      question: "¿Puedo pedir un reembolso si no estoy conforme?",
      answer: (
        <>
          <p className="text-gray-700 leading-relaxed">
            Sí. Aunque es raro que ocurra, si no estás satisfecho podés solicitar un reembolso desde tu panel o escribiendo a soporte.
          </p>
          <p className="text-gray-700 leading-relaxed mt-2">
            Un ejecutivo de cuentas te contactará rápidamente para confirmar el proceso. La devolución depende del método de pago externo (Stripe u otros), pero te mantenemos informado en todo momento y no demoramos ninguna aprobación de nuestra parte.
          </p>
          <p className="text-gray-700 leading-relaxed mt-2">
            Tu tranquilidad es prioridad.
          </p>
        </>
      )
    },
    {
      question: "¿Hay cargos ocultos o facturación inesperada?",
      answer: (
        <p className="text-gray-700 leading-relaxed">
          No. No tenemos excedentes automáticos ni sorpresas. Si estás por llegar a un límite, la plataforma te avisa antes.
        </p>
      )
    },
    {
      question: "¿Cómo funciona la cancelación?",
      answer: (
        <p className="text-gray-700 leading-relaxed">
          Podés cancelar cuando quieras. Tu cuenta queda activa hasta el final del período ya pagado.
        </p>
      )
    },
    {
      question: "¿Dónde puedo contactarlos si tengo dudas?",
      answer: (
        <p className="text-gray-700 leading-relaxed">
          Escribinos a support@ecosign.app. Respondemos en forma clara y humana —sin bots genéricos.
        </p>
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
        { text: 'Firma Legal', value: 'Pago por uso' },
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
        { text: 'Firma Legal', value: '20 por mes' },
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
        { text: 'Firma Legal', value: '100 por mes' },
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
        { text: 'Firma Legal', value: 'Personalizado' },
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
                Verificar
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
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">Planes de Servicio EcoSign</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">Elegí el plan que mejor se adapte a tus necesidades. Precios claros, sin excedentes y sin sorpresas.</p>
        </header>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 mt-8">
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

        {/* Transparencia ante todo */}
        <div className="max-w-4xl mx-auto px-4 py-24">
          <h2 className="text-4xl font-bold text-center mb-6">Transparencia ante todo</h2>
          <p className="text-lg text-center text-gray-600 max-w-3xl mx-auto mb-12">
            En EcoSign no hay cargos ocultos ni facturación inesperada.<br />
            Pagás solo lo que usás y tu panel siempre muestra cuántas firmas te quedan.<br />
            El sistema te avisa antes de alcanzar cualquier límite.
          </p>
        </div>

        {/* Acumulación inteligente */}
        <div className="max-w-4xl mx-auto px-4 py-24">
          <h2 className="text-4xl font-bold text-center mb-6">Acumulación inteligente</h2>
          <p className="text-lg text-center text-gray-600 max-w-3xl mx-auto mb-12">
            Si un mes no usás todas tus firmas legales, no las perdés.<br />
            Se acumulan por 60 días y siempre ves cuántas tenés disponibles.
          </p>
          <div className="bg-gray-50 p-6 rounded-lg max-w-3xl mx-auto mb-6 text-center">
            <p className="font-semibold text-black mb-2">Ejemplo:</p>
            <p className="text-base text-gray-700 leading-relaxed mb-2">
              Si tu plan incluye 20 firmas y usaste 15, el mes siguiente empezás con 25.
            </p>
            <p className="text-base text-gray-700 leading-relaxed">
              Las más antiguas vencen a los 60 días para mantener tu cuenta ordenada.
            </p>
          </div>
        </div>

        {/* Beneficio Founders */}
        <div className="max-w-4xl mx-auto px-4 py-24">
          <h2 className="text-4xl font-bold text-center mb-6">Beneficio Founders</h2>
          <p className="text-lg text-center text-gray-600 max-w-3xl mx-auto mb-12">
            Los primeros 10.000 usuarios mantienen su precio de por vida<br />
            mientras continúen en su plan.
          </p>
        </div>

        {/* ¿Por qué EcoSign? */}
        <div className="max-w-4xl mx-auto px-4 py-24">
          <h2 className="text-4xl font-bold text-center mb-6">¿Por qué EcoSign?</h2>
          <p className="text-lg text-center text-gray-600 max-w-3xl mx-auto mb-12">
            No guardamos tu archivo.<br />
            No vemos tu contenido.<br />
            No pedimos confianza: te damos evidencia.
          </p>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-24">
          <h2 className="text-4xl font-bold text-center mb-6">Hecho para quienes valoran claridad</h2>
          <p className="text-lg text-center text-gray-600 max-w-3xl mx-auto text-center mb-12">
            EcoSign es un servicio pensado para trabajar con vos, no contra vos.
          </p>
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
