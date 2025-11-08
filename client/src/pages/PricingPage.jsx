import React from 'react';
import { Link } from 'react-router-dom';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Navigation */}
      <nav className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="text-2xl">🔒</div>
              <span className="text-xl font-bold text-white">VerifySign</span>
            </Link>
            <div className="flex items-center space-x-6">
              <Link to="/" className="text-slate-300 hover:text-cyan-500 transition duration-200">
                Inicio
              </Link>
              <Link to="/verify" className="text-slate-300 hover:text-cyan-500 transition duration-200">
                Verificar
              </Link>
              <Link to="/login" className="text-slate-300 hover:text-cyan-500 transition duration-200">
                Iniciar Sesión
              </Link>
              <Link
                to="/login"
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-6 py-2 rounded-lg transition duration-300"
              >
                Comenzar Gratis
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="text-center mb-16">
          <h1 className="text-4xl font-bold text-white mb-4">Planes de Precios</h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Elige el plan que mejor se adapte a tus necesidades de seguridad y cumplimiento
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <div key={index} className={`relative bg-slate-800 rounded-2xl shadow-xl overflow-hidden ${plan.popular ? 'ring-2 ring-cyan-500' : ''}`}>
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-cyan-500 text-slate-900 text-xs font-bold px-4 py-1 rounded-full">
                  MÁS POPULAR
                </div>
              )}
              <div className="p-8">
                <h2 className="text-2xl font-bold text-white mb-2">{plan.name}</h2>
                <div className="text-4xl font-bold text-cyan-500 mb-2">{plan.price}</div>
                <p className="text-slate-400 mb-6">{plan.description}</p>
                
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-cyan-500 mr-2">✓</span>
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button className={`w-full py-3 px-6 rounded-lg font-bold transition duration-300 ${
                  plan.popular 
                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white' 
                    : 'bg-slate-700 hover:bg-slate-600 text-cyan-500'
                }`}>
                  {plan.buttonText}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Preguntas Frecuentes</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-cyan-500 mb-2">¿Qué es un certificado .ECO?</h3>
              <p className="text-slate-400">
                El estándar .ECO es un formato de certificación digital que combina hash SHA-256, timestamp criptográfico y firma digital para crear pruebas de existencia, integridad y autoría verificables de forma independiente.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-cyan-500 mb-2">¿Cómo funciona el anclaje en blockchain?</h3>
              <p className="text-slate-400">
                Después de generar el hash de tu documento, lo registramos en la cadena de bloques Polygon como prueba inmutable de la existencia del documento en un momento específico.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-cyan-500 mb-2">¿Qué pasa si excedo mi límite?</h3>
              <p className="text-slate-400">
                Te notificaremos antes de alcanzar tu límite. Puedes actualizar tu plan en cualquier momento desde tu panel de control.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center text-slate-400 mb-8">
          <p>¿Tienes preguntas? <a href="mailto:contact@verifysign.com" className="text-cyan-500 hover:text-cyan-400">Contáctanos</a> para una demostración personalizada.</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-800 border-t border-slate-700 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm">
            © 2025 VerifySign. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default PricingPage;