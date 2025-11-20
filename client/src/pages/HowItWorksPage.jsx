import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Shield, Clock, Lock, CheckCircle, Hash, Anchor } from 'lucide-react';

function HowItWorksPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation - Same as Landing */}
      <nav className="bg-white fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center space-x-3">
              <span className="text-2xl font-bold text-black">EcoSign</span>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/how-it-works" className="text-black font-semibold transition duration-200">
                Cómo funciona
              </Link>
              <Link to="/verify" className="text-gray-600 hover:text-black font-medium transition duration-200">
                Verificar
              </Link>
              <Link to="/pricing" className="text-gray-600 hover:text-black font-medium transition duration-200">
                Precios
              </Link>
              <Link to="/login" className="text-gray-600 hover:text-black font-medium transition duration-200">
                Iniciar Sesión
              </Link>
              <Link
                to="/login"
                className="bg-black hover:bg-gray-800 text-white font-semibold px-6 py-2.5 rounded-lg transition duration-300"
              >
                Comenzar Gratis
              </Link>
            </div>
            <button
              className="md:hidden text-gray-600 hover:text-black"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-white">
            <div className="px-4 pt-2 pb-4 space-y-2">
              <Link to="/how-it-works" className="block text-black font-semibold px-3 py-2 rounded-lg">Cómo funciona</Link>
              <Link to="/verify" className="block text-gray-600 hover:text-black px-3 py-2 rounded-lg">Verificar</Link>
              <Link to="/pricing" className="block text-gray-600 hover:text-black px-3 py-2 rounded-lg">Precios</Link>
              <Link to="/login" className="block text-gray-600 hover:text-black px-3 py-2 rounded-lg">Iniciar Sesión</Link>
              <Link
                to="/login"
                className="block bg-black hover:bg-gray-800 text-white font-semibold px-4 py-2 rounded-lg text-center mt-2"
              >
                Comenzar Gratis
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <header className="pt-32 pb-24 md:pt-40 md:pb-32 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight text-black mb-8">
            Cómo Lo Hacemos
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto mb-12 leading-relaxed">
            Sin tecnicismos innecesarios. Así funciona EcoSign, de principio a fin.
          </p>
        </div>
      </header>

      {/* Proceso Simple */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-16 text-center">
            El proceso en 4 pasos
          </h2>
          
          <div className="space-y-12">
            <div className="text-center md:text-left">
              <div className="inline-block bg-black text-white text-3xl font-bold w-14 h-14 rounded-full flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="text-2xl font-semibold text-black mb-2">Elegí tu archivo</h3>
              <p className="text-lg text-gray-600">
                Nunca lo subimos ni lo almacenamos. Tu contenido permanece siempre con vos.
              </p>
            </div>
            
            <div className="text-center md:text-left">
              <div className="inline-block bg-black text-white text-3xl font-bold w-14 h-14 rounded-full flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="text-2xl font-semibold text-black mb-2">Firmá en un solo paso</h3>
              <p className="text-lg text-gray-600">
                Aplicamos una firma digital con validez legal internacional.
              </p>
            </div>
            
            <div className="text-center md:text-left">
              <div className="inline-block bg-black text-white text-3xl font-bold w-14 h-14 rounded-full flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="text-2xl font-semibold text-black mb-2">Sellá tu evidencia</h3>
              <p className="text-lg text-gray-600">
                Sumamos Sello de Tiempo legal, huella digital y anclaje público.
              </p>
            </div>

            <div className="text-center md:text-left">
              <div className="inline-block bg-black text-white text-3xl font-bold w-14 h-14 rounded-full flex items-center justify-center mb-4">
                4
              </div>
              <h3 className="text-2xl font-semibold text-black mb-2">Guardá tu .ECO</h3>
              <p className="text-lg text-gray-600">
                Esta es tu evidencia con fecha y hora inmutable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tu Archivo Nunca Pierde Su Forma */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-8 text-center">
            Tu Archivo Nunca Pierde Su Forma
          </h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-16 text-center leading-relaxed">
            Aceptamos cualquier formato. Trabajá como siempre: Word, Excel, Photoshop, CAD, lo que necesites.
          </p>

          <div className="grid md:grid-cols-3 gap-16 text-center">
            <div>
              <FileText className="w-10 h-10 text-black mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-black mb-3">Cualquier formato</h3>
              <p className="text-gray-600">Tu archivo original queda intacto, sin ser tocado.</p>
            </div>
            
            <div>
              <Shield className="w-10 h-10 text-black mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-black mb-3">PDF legal</h3>
              <p className="text-gray-600">Generamos copia temporal en PDF solo para el sello legal.</p>
            </div>
            
            <div>
              <Lock className="w-10 h-10 text-black mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-black mb-3">Control total</h3>
              <p className="text-gray-600">No se expone, no se almacena. Todo bajo tu control.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Blindaje Forense */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-8 text-center">
            Blindamos Tu Evidencia con Sellos Irrompibles
          </h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-16 text-center leading-relaxed">
            Después de firmar, podés elegir cuántas capas de verificación querés sumar.
          </p>

          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <Hash className="w-8 h-8 text-black flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-black mb-2">Huella Digital (Hash)</h3>
                <p className="text-gray-600">La identidad única del contenido. Probamos la integridad (que nada cambió).</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <Clock className="w-8 h-8 text-black flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-black mb-2">Sello de Tiempo Legal (Timestamp)</h3>
                <p className="text-gray-600">Emitido por una TSA bajo el estándar RFC 3161. Probamos el momento exacto con validez forense.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <Anchor className="w-8 h-8 text-black flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-black mb-2">Anclaje Público (Blockchain)</h3>
                <p className="text-gray-600">Registro descentralizado e inmutable. Verificable por peritos sin depender de EcoSign.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <CheckCircle className="w-8 h-8 text-black flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-black mb-2">VerifyTracker (opcional)</h3>
                <p className="text-gray-600">Registramos accesos sin ver el contenido. Probamos trazabilidad y no-repudiación.</p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-xl font-semibold text-black">
              Cada capa suma una barrera contra el fraude. Esto es blindaje forense total.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            ¿Listo para proteger tu trabajo?
          </h2>
          <p className="text-xl text-gray-700 mb-12 max-w-3xl mx-auto">
            Comenzá gratis hoy mismo. Sin tarjeta de crédito, sin vueltas.
          </p>
          <Link
            to="/login"
            className="inline-block bg-black hover:bg-gray-800 text-white font-semibold px-12 py-4 rounded-lg transition duration-300 text-lg"
          >
            Comenzar Gratis
          </Link>
        </div>
      </section>

      {/* Footer - Same as Landing */}
      <footer className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <span className="text-2xl font-bold text-black">EcoSign</span>
              <p className="text-sm text-gray-600 mt-3">Infraestructura de Confianza Digital</p>
            </div>
            <div>
              <h4 className="font-semibold text-black mb-3">Producto</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link to="/how-it-works" className="hover:text-black">Cómo funciona</Link></li>
                <li><Link to="/pricing" className="hover:text-black">Precios</Link></li>
                <li><Link to="/verify" className="hover:text-black">Verificar</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-black mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link to="/terms" className="hover:text-black">Términos</Link></li>
                <li><Link to="/privacy" className="hover:text-black">Privacidad</Link></li>
                <li><Link to="/security" className="hover:text-black">Seguridad</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-black mb-3">Soporte</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link to="/help" className="hover:text-black">Ayuda</Link></li>
                <li><Link to="/contact" className="hover:text-black">Contacto</Link></li>
                <li><Link to="/status" className="hover:text-black">Estado</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 space-y-3 text-sm text-gray-600">
            <p>© 2025 EcoSign. Todos los derechos reservados.</p>
            <p>EcoSign es un servicio independiente de certificación y firma digital.</p>
            <p>El formato .ECO y los procesos forenses están sujetos a protección de propiedad intelectual en trámite.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HowItWorksPage;
