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
        { text: 'Usuarios con Acceso al Panel', value: '1' },
        { text: 'Firmantes Invitados', value: 'Ilimitados' },
        { text: 'Almacenamiento en la Nube', value: '1 GB' },
        { text: 'Firma EcoSign (Uso Interno)', value: '3 Docs/mes' },
        { text: 'Firma Legal (SignNow)', value: '1 Firma/mes' },
        { text: 'Blindaje Forense', value: 'Básico (Polygon)' },
        { text: 'Panel de Auditoría Avanzado', value: false },
        { text: 'Acceso a API', value: false }
      ],
      buttonText: 'Empezar Gratis',
      popular: false
    },
    {
      name: 'PRO',
      subtitle: 'Profesional/Pyme',
      price: '$19',
      period: ' USD',
      originalPrice: '$40',
      description: 'Promoción de lanzamiento',
      features: [
        { text: 'Usuarios con Acceso al Panel', value: '2' },
        { text: 'Firmantes Invitados', value: 'Ilimitados' },
        { text: 'Almacenamiento en la Nube', value: '5 GB' },
        { text: 'Firma EcoSign (Uso Interno)', value: 'ILIMITADAS' },
        { text: 'Firma Legal (SignNow)', value: '20 Firmas/mes' },
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
      price: '$99',
      period: ' USD',
      description: 'Para empresas en crecimiento',
      features: [
        { text: 'Usuarios con Acceso al Panel', value: '5' },
        { text: 'Firmantes Invitados', value: 'Ilimitados' },
        { text: 'Almacenamiento en la Nube', value: '25 GB' },
        { text: 'Firma EcoSign (Uso Interno)', value: 'ILIMITADAS' },
        { text: 'Firma Legal (SignNow)', value: '100 Firmas/mes' },
        { text: 'Blindaje Forense', value: 'Completo' },
        { text: 'Panel de Auditoría Avanzado', value: true },
        { text: 'Acceso a API', value: 'Limitado' }
      ],
      buttonText: 'Comenzar BUSINESS',
      popular: false
    },
    {
      name: 'ENTERPRISE',
      price: 'Personalizado',
      period: '',
      description: 'Solución a medida',
      features: [
        { text: 'Usuarios con Acceso al Panel', value: 'Ilimitados' },
        { text: 'Firmantes Invitados', value: 'Ilimitados' },
        { text: 'Almacenamiento en la Nube', value: 'Personalizado' },
        { text: 'Firma EcoSign (Uso Interno)', value: 'ILIMITADAS' },
        { text: 'Firma Legal (SignNow)', value: 'Personalizado' },
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
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-sm fixed w-full top-0 z-50 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-3">
                <span className="text-2xl font-extrabold text-black">EcoSign</span>
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center text-sm text-gray-500 hover:text-black transition"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Volver al dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-6">
              <Link to="/" className="text-gray-600 hover:text-black transition duration-200 font-medium">
                Inicio
              </Link>
              <Link to="/verify" className="text-gray-600 hover:text-black transition duration-200 font-medium">
                Verificar
              </Link>
              <Link to="/login" className="text-gray-600 hover:text-black transition duration-200 font-medium">
                Iniciar Sesión
              </Link>
              <Link
                to="/login"
                className="bg-black hover:bg-gray-800 text-white font-semibold px-6 py-2.5 rounded-lg transition duration-300 shadow-md hover:shadow-lg"
              >
                Comenzar Gratis
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 pt-32">
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">Planes de Servicio de EcoSign.app</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Elige el plan que mejor se adapte a tus necesidades de firma y almacenamiento
          </p>
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
              <div className="p-6">
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
                <p className="text-sm text-gray-600 mb-6">{plan.description}</p>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm">
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

        {/* Comparison Table */}
        <div className="bg-gray-50 p-8 md:p-12 rounded-2xl border border-gray-200 mb-12">
          <h2 className="text-3xl font-bold text-black mb-8 text-center">Comparativa Detallada de Características</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="p-4 text-black font-bold">Característica</th>
                  <th className="p-4 text-center text-black font-bold">FREE</th>
                  <th className="p-4 text-center text-black font-bold bg-gray-100">PRO</th>
                  <th className="p-4 text-center text-black font-bold">BUSINESS</th>
                  <th className="p-4 text-center text-black font-bold">ENTERPRISE</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-4 font-medium text-black">Precio Mensual</td>
                  <td className="p-4 text-center text-gray-700">$0</td>
                  <td className="p-4 text-center text-gray-700 bg-gray-50 font-semibold">$19 USD</td>
                  <td className="p-4 text-center text-gray-700">$99 USD</td>
                  <td className="p-4 text-center text-gray-700">Personalizado</td>
                </tr>
                <tr className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-4 font-medium text-black">Valor Real del Plan</td>
                  <td className="p-4 text-center text-gray-700">—</td>
                  <td className="p-4 text-center text-gray-700 bg-gray-50">
                    <div>
                      <span className="line-through text-gray-500">$40 USD</span>
                      <div className="text-xs text-green-700 font-semibold mt-1">50% OFF</div>
                    </div>
                  </td>
                  <td className="p-4 text-center text-gray-700">—</td>
                  <td className="p-4 text-center text-gray-700">—</td>
                </tr>
                <tr className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-4 font-medium text-black">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Usuarios con Acceso al Panel
                    </div>
                  </td>
                  <td className="p-4 text-center text-gray-700">1</td>
                  <td className="p-4 text-center text-gray-700 bg-gray-50 font-semibold">2</td>
                  <td className="p-4 text-center text-gray-700">5</td>
                  <td className="p-4 text-center text-gray-700">Ilimitados</td>
                </tr>
                <tr className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-4 font-medium text-black">
                    <div className="flex items-center">
                      <HardDrive className="w-4 h-4 mr-2" />
                      Almacenamiento en la Nube
                    </div>
                  </td>
                  <td className="p-4 text-center text-gray-700">1 GB</td>
                  <td className="p-4 text-center text-gray-700 bg-gray-50 font-semibold">5 GB</td>
                  <td className="p-4 text-center text-gray-700">25 GB</td>
                  <td className="p-4 text-center text-gray-700">Personalizado</td>
                </tr>
                <tr className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-4 font-medium text-black">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Firma EcoSign (Uso Interno)
                    </div>
                  </td>
                  <td className="p-4 text-center text-gray-700">3 Docs/mes</td>
                  <td className="p-4 text-center text-gray-700 bg-gray-50 font-semibold">100 Docs/mes</td>
                  <td className="p-4 text-center text-gray-700 font-bold">ILIMITADA</td>
                  <td className="p-4 text-center text-gray-700 font-bold">ILIMITADA</td>
                </tr>
                <tr className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-4 font-medium text-black">
                    <div className="flex items-center">
                      <Lock className="w-4 h-4 mr-2" />
                      Firma Legal (SignNow)
                    </div>
                  </td>
                  <td className="p-4 text-center text-gray-700">1 Firma/mes</td>
                  <td className="p-4 text-center text-gray-700 bg-gray-50 font-semibold">20 Firmas/mes</td>
                  <td className="p-4 text-center text-gray-700">100 Firmas/mes</td>
                  <td className="p-4 text-center text-gray-700">Personalizado</td>
                </tr>
                <tr className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-4 font-medium text-black">
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-2" />
                      Blindaje Forense
                    </div>
                  </td>
                  <td className="p-4 text-center text-gray-700">Básico (Polygon)</td>
                  <td className="p-4 text-center text-gray-700 bg-gray-50 font-semibold">Completo</td>
                  <td className="p-4 text-center text-gray-700">Completo</td>
                  <td className="p-4 text-center text-gray-700">Completo</td>
                </tr>
                <tr className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-4 font-medium text-black">
                    <div className="flex items-center">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Panel de Auditoría Avanzado
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <X className="w-5 h-5 text-gray-400 inline-block" />
                  </td>
                  <td className="p-4 text-center bg-gray-50">
                    <X className="w-5 h-5 text-gray-400 inline-block" />
                  </td>
                  <td className="p-4 text-center">
                    <Check className="w-5 h-5 text-black inline-block" strokeWidth={2.5} />
                  </td>
                  <td className="p-4 text-center">
                    <Check className="w-5 h-5 text-black inline-block" strokeWidth={2.5} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

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
      <footer className="bg-black text-white mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-300 text-sm">
            © 2025 EcoSign.app por Temporal Dynamics LLC. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default PricingPage;
