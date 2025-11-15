import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Check, ArrowLeft } from 'lucide-react';

function PricingPage() {
  const plans = [
    {
      name: 'Básico',
      price: 'Gratis',
      description: 'Ideal para probar la plataforma',
      features: [
        'Hasta 5 documentos protegidos',
        '10 accesos con NDA',
        'Certificados .ECO básicos',
        'Soporte por email'
      ],
      buttonText: 'Empezar Gratis',
      popular: false
    },
    {
      name: 'Profesional',
      price: '$29/mes',
      description: 'Para profesionales y pequeñas empresas',
      features: [
        'Documentos ilimitados',
        'Accesos ilimitados con NDA',
        'Certificados .ECO y .ECOX',
        'Anclaje en blockchain',
        'Panel de control avanzado',
        'Soporte prioritario'
      ],
      buttonText: 'Comenzar Profesional',
      popular: true
    },
    {
      name: 'Empresarial',
      price: '$99/mes',
      description: 'Para empresas con altos volúmenes',
      features: [
        'Todo en Profesional',
        'Integración API',
        'Personalización de marca',
        'Soporte dedicado 24/7',
        'Análisis avanzado',
        'Cumplimiento regulatorio'
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
                <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">VerifySign</span>
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center text-sm text-gray-500 hover:text-cyan-600 transition"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Volver al dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-6">
              <Link to="/" className="text-gray-600 hover:text-cyan-600 transition duration-200 font-medium">
                Inicio
              </Link>
              <Link to="/verify" className="text-gray-600 hover:text-cyan-600 transition duration-200 font-medium">
                Verificar
              </Link>
              <Link to="/login" className="text-gray-600 hover:text-cyan-600 transition duration-200 font-medium">
                Iniciar Sesión
              </Link>
              <Link
                to="/login"
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold px-6 py-2.5 rounded-lg transition duration-300 shadow-md hover:shadow-lg"
              >
                Comenzar Gratis
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 pt-32">
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Planes de Precios</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Elige el plan que mejor se adapte a tus necesidades de seguridad y cumplimiento
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <div key={index} className={`relative bg-white rounded-2xl shadow-xl overflow-hidden border-2 ${plan.popular ? 'border-cyan-500' : 'border-gray-200'}`}>
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                  MÁS POPULAR
                </div>
              )}
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h2>
                <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600 mb-2">{plan.price}</div>
                <p className="text-gray-600 mb-6">{plan.description}</p>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <Check className="w-5 h-5 text-cyan-600 mr-2 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/login" className={`block w-full py-3 px-6 rounded-lg font-bold text-center transition duration-300 ${
                  plan.popular
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg'
                    : 'bg-gray-100 hover:bg-gray-200 text-cyan-600'
                }`}>
                  {plan.buttonText}
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-8 md:p-12 rounded-2xl border border-cyan-200 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Preguntas Frecuentes</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-cyan-700 mb-2">¿Qué es un certificado .ECO?</h3>
              <p className="text-gray-700 leading-relaxed">
                El estándar .ECO es un formato de certificación digital que combina hash SHA-256, timestamp criptográfico y firma digital para crear pruebas de existencia, integridad y autoría verificables de forma independiente.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-cyan-700 mb-2">¿Cómo funciona el anclaje en blockchain?</h3>
              <p className="text-gray-700 leading-relaxed">
                Después de generar el hash de tu documento, lo registramos en la cadena de bloques Polygon como prueba inmutable de la existencia del documento en un momento específico.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-cyan-700 mb-2">¿Qué pasa si excedo mi límite?</h3>
              <p className="text-gray-700 leading-relaxed">
                Te notificaremos antes de alcanzar tu límite. Puedes actualizar tu plan en cualquier momento desde tu panel de control.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center text-gray-600 mb-8">
          <p>¿Tienes preguntas? <a href="mailto:contact@verifysign.com" className="text-cyan-600 hover:text-cyan-700 font-semibold">Contáctanos</a> para una demostración personalizada.</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-600 text-sm">
            © 2025 VerifySign por Temporal Dynamics LLC. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default PricingPage;
