import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Check, ArrowLeft, X, Users, HardDrive, FileText, Shield, BarChart3 } from 'lucide-react';

function PricingPage() {
  const plans = [
    {
      name: 'FREE',
      price: '$0',
      period: '',
      subtitle: 'Muestra',
      description: 'Prueba la plataforma',
      features: [
        { text: 'Usuarios', value: '1' },
        { text: 'Firmantes Invitados', value: 'Ilimitados' },
        { text: 'Almacenamiento', value: '1 GB' },
        { text: 'Firma EcoSign', value: '3 por mes' },
        { text: 'Firma Legal', value: '1 por mes' },
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
      originalPrice: '$69',
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
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {plans.map((plan, index) => (
            <div key={index} className={`relative bg-white rounded-xl shadow-lg overflow-hidden border-2 ${plan.popular ? 'border-black' : 'border-gray-200'}`}>
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black text-white text-xs font-bold px-4 py-1 rounded-full">
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

        <section className="mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-8 text-center">Transparencia ante todo</h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-4 text-center leading-relaxed">
            En EcoSign no hay cargos ocultos, excedentes ni facturación inesperada.
          </p>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-4 text-center leading-relaxed">
            Pagás solo lo que usás y siempre sabés cuántas firmas tenés disponibles.
          </p>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto text-center leading-relaxed">
            El sistema te avisa antes de superar cualquier límite.
          </p>
        </section>

        <section className="mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-8 text-center">Acumulación inteligente</h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-4 text-center leading-relaxed">
            Si un mes no usás todas tus firmas legales, no las perdés.
          </p>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-4 text-center leading-relaxed">
            Podés usarlas durante los próximos 60 días, y tu panel siempre muestra cuántas te quedan.
          </p>
          <div className="bg-gray-50 p-6 rounded-lg max-w-3xl mx-auto mb-4">
            <p className="font-semibold text-black mb-2">Ejemplo simple:</p>
            <p className="text-lg text-gray-700 leading-relaxed">
              Si tu plan incluye 20 firmas y este mes usaste 15, el próximo mes empezás con 25.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              Las firmas más antiguas se vencen a los 60 días, para mantener tu cuenta ordenada.
            </p>
          </div>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto text-center leading-relaxed">
            Así de claro.
          </p>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto text-center leading-relaxed">
            Así de simple.
          </p>
        </section>

        <section className="mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-8 text-center">¿Por qué EcoSign puede ofrecer precios tan accesibles?</h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-4 text-center leading-relaxed">
            Porque optimizamos los costos reales sin sacrificar seguridad:
          </p>
          <ul className="space-y-2 text-xl text-gray-700 max-w-3xl mx-auto mb-4">
            <li>• No subimos tu archivo → menos infraestructura.</li>
            <li>• El hash se calcula en tu dispositivo → costo cero.</li>
            <li>• Timestamp legal y blockchain → costos mínimos y verificados.</li>
            <li>• Solo pagamos firmas legales cuando las usás.</li>
          </ul>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto text-center leading-relaxed">
            Eso nos permite darte un servicio premium, privado y seguro—sin abusos ni letra chica.
          </p>
        </section>

        <section className="mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-8 text-center">Beneficios exclusivos</h2>
          <ul className="space-y-2 text-xl text-gray-700 max-w-3xl mx-auto mb-4">
            <li>• Precio protegido: tu tarifa queda fija mientras mantengas tu suscripción.</li>
            <li>• Soporte prioritario: respuestas claras, humanas y sin bots genéricos.</li>
            <li>• Acumulación inteligente: nunca perdés tus firmas sin usar.</li>
            <li>• Auditoría avanzada y blindaje completo: transparencia certificada.</li>
          </ul>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto text-center leading-relaxed">
            Ideal para profesionales, creadores, estudios jurídicos y PyMEs que necesitan seguridad real sin pagar de más.
          </p>
        </section>

        <section className="mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-8 text-center">Hecho para quienes valoran claridad</h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-4 text-center leading-relaxed">
            Sin “sobres”, sin trucos, sin facturación extra.
          </p>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto text-center leading-relaxed">
            EcoSign es un servicio pensado para trabajar con vos, no contra vos.
          </p>
        </section>

        

        <div className="bg-white p-8 md:p-12 rounded-2xl border-2 border-gray-200 mb-12">
          <h2 className="text-3xl font-bold text-black mb-8 text-center">Preguntas Frecuentes</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-black mb-2">¿Qué incluye la promoción de lanzamiento del plan PRO?</h3>
              <p className="text-gray-700 leading-relaxed">
                El plan PRO tiene un valor real de $40 USD, pero lo ofrecemos a $19 USD como parte de nuestra promoción de lanzamiento. Esto representa un ahorro del 50% para los primeros usuarios.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-black mb-2">¿Qué es la Firma EcoSign y en qué se diferencia de SignNow?</h3>
              <p className="text-gray-700 leading-relaxed">
                La Firma EcoSign es nuestra solución interna para uso corporativo y gestión de documentos. SignNow es nuestra integración para firmas legalmente vinculantes con validez jurídica completa.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-black mb-2">¿Qué es el Blindaje Forense?</h3>
              <p className="text-gray-700 leading-relaxed">
                El Blindaje Forense es nuestra tecnología de protección blockchain. El nivel básico utiliza Polygon para registro de huellas digitales, mientras que el Completo incluye verificación multi-cadena y certificación notarial digital.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-black mb-2">¿Puedo cambiar de plan en cualquier momento?</h3>
              <p className="text-gray-700 leading-relaxed">
                Sí, puedes actualizar o cambiar tu plan en cualquier momento desde tu panel de control. Los cambios se aplican inmediatamente y se prorratean según corresponda.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center text-gray-600 mb-8">
          <p>¿Tienes preguntas? <a href="mailto:contact@ecosign.app" className="text-black hover:text-gray-700 font-semibold underline">Contáctanos</a> para una demostración personalizada.</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <span className="text-2xl font-bold text-[#0E4B8B]">EcoSign</span>
              <p className="text-sm text-gray-400 mt-3">Certificación digital con privacidad total</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Producto</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/how-it-works" className="hover:text-[#0E4B8B] hover:underline transition">Cómo funciona</Link></li>
                <li><Link to="/pricing" className="hover:text-[#0E4B8B] hover:underline transition">Precios</Link></li>
                <li><Link to="/verify" className="hover:text-[#0E4B8B] hover:underline transition">Verificar</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/terms" className="hover:text-[#0E4B8B] hover:underline transition">Términos</Link></li>
                <li><Link to="/privacy" className="hover:text-[#0E4B8B] hover:underline transition">Privacidad</Link></li>
                <li><Link to="/security" className="hover:text-[#0E4B8B] hover:underline transition">Seguridad</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Soporte</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/help" className="hover:text-[#0E4B8B] hover:underline transition">Ayuda</Link></li>
                <li><Link to="/contact" className="hover:text-[#0E4B8B] hover:underline transition">Contacto</Link></li>
                <li><Link to="/status" className="hover:text-[#0E4B8B] hover:underline transition">Estado</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 space-y-3 text-sm text-gray-400 border-t border-gray-800">
            <p>© 2025 EcoSign. Todos los derechos reservados.</p>
            <p>EcoSign es un servicio independiente de certificación y firma digital.</p>
            <p>El formato .ECO y los procesos forenses están sujetos a protección de propiedad intelectual en trámite.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PricingPage;
