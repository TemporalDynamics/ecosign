import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  FileText,
  Lock,
  CheckCircle,
  Upload,
  Link as LinkIcon,
  Eye,
  Anchor,
  Clock,
  Users
} from 'lucide-react';

const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-sm fixed w-full top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center space-x-3">
              <span className="text-2xl font-extrabold text-gray-900">EcoSign</span>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/how-it-works" className="text-gray-700 hover:text-blue-600 font-medium transition duration-200">
                Cómo funciona
              </Link>
              <Link to="/verify" className="text-gray-700 hover:text-blue-600 font-medium transition duration-200">
                Verificar
              </Link>
              <Link to="/pricing" className="text-gray-700 hover:text-blue-600 font-medium transition duration-200">
                Precios
              </Link>
              <Link to="/login" className="text-gray-700 hover:text-blue-600 font-medium transition duration-200">
                Iniciar Sesión
              </Link>
              <Link
                to="/login"
                className="bg-gray-900 hover:bg-gray-800 text-white font-semibold px-6 py-2.5 rounded-lg transition duration-300"
              >
                Comenzar Gratis
              </Link>
            </div>
            <button
              className="md:hidden text-gray-700 hover:text-blue-600"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="px-4 pt-2 pb-4 space-y-2">
              <Link to="/how-it-works" className="block text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg">Cómo funciona</Link>
              <Link to="/verify" className="block text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg">Verificar</Link>
              <Link to="/pricing" className="block text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg">Precios</Link>
              <Link to="/login" className="block text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg">Iniciar Sesión</Link>
              <Link
                to="/login"
                className="block bg-gray-900 hover:bg-gray-800 text-white font-semibold px-4 py-2 rounded-lg text-center mt-2"
              >
                Comenzar Gratis
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <header className="pt-32 pb-20 md:pt-40 md:pb-28 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight text-gray-900 mb-6">
            Firma digital con <span className="text-blue-600">Prueba de Autoría y Tiempo Irrefutable</span>. Protege tu trabajo sin exponerlo.
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto mb-10 leading-relaxed">
            Firma en un paso y genera evidencia verificable para siempre. Tu contenido nunca sale de tu control.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 mb-8">
            <Link
              to="/login"
              className="bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 px-10 rounded-lg transition duration-300"
            >
              Comenzar Gratis Ahora
            </Link>
            <Link
              to="/how-it-works"
              className="bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-900 hover:text-gray-900 font-bold py-4 px-10 rounded-lg transition duration-300"
            >
              Ver Demostración en Vivo
            </Link>
          </div>
          
          <p className="text-sm text-gray-600 max-w-2xl mx-auto italic">
            Tu contenido nunca sale de tu nube. Nosotros solo certificamos, nunca almacenamos.
          </p>
        </div>
      </header>

      {/* Demo Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Firmá en un paso. Probá tu autoría para siempre.</h2>
          <p className="text-lg text-gray-600 mb-12 max-w-3xl mx-auto">
            El formato .ECO te da una evidencia privada, verificable y portable.
          </p>
          
          <div className="bg-white rounded-xl p-8 border border-gray-200 max-w-4xl mx-auto">
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PlayIcon className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-gray-600">Demostración en vivo de EcoSign</p>
                <p className="text-sm text-gray-500 mt-2">Proceso de firma en menos de 30 segundos</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Tu archivo nunca se expone</h3>
              <p className="text-gray-600">Nunca lo vemos. Nunca lo almacenamos. Nunca sale de tu nube.</p>
            </div>
            
            <div className="p-6 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Firmás en un solo paso</h3>
              <p className="text-gray-600">Dibujás tu firma o escribís tu nombre. Hacés clic. Queda legalizada. Listo.</p>
            </div>
            
            <div className="p-6 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Anchor className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Evidencia verificable</h3>
              <p className="text-gray-600">Sello de tiempo legal (RFC 3161), anclaje público en blockchain y verificación universal sin depender de nosotros.</p>
            </div>
            
            <div className="p-6 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Un .ECO = tu verdad digital</h3>
              <p className="text-gray-600">Un certificado ligero, firmado matemáticamente. Si alguien lo toca, se detecta.</p>
            </div>
            
            <div className="p-6 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Independiente de nosotros</h3>
              <p className="text-gray-600">Tu .ECO tiene respaldo público verificable. Un especialista puede confirmar su sello y su fecha sin depender del sistema.</p>
            </div>
            
            <div className="p-6 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Verificación universal</h3>
              <p className="text-gray-600">Cualquier persona puede validar tu .ECO sin cuenta y sin depender de EcoSign.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Certifica tu trabajo en 4 pasos simples</h2>
            <p className="text-lg text-gray-600">Proceso claro, rápido y sin complicaciones</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl text-center bg-white border border-gray-200 shadow-sm">
              <div className="inline-flex mx-auto mb-4 items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Elegís tu archivo</h3>
              <p className="text-sm text-gray-600">Aceptamos todos los formatos. No se sube ni se almacena.</p>
            </div>
            
            <div className="p-6 rounded-2xl text-center bg-white border border-gray-200 shadow-sm">
              <div className="inline-flex mx-auto mb-4 items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Firmás en un solo paso</h3>
              <p className="text-sm text-gray-600">Tu firma queda sellada bajo normas internacionales.</p>
            </div>
            
            <div className="p-6 rounded-2xl text-center bg-white border border-gray-200 shadow-sm">
              <div className="inline-flex mx-auto mb-4 items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Múltiples Firmas, Sin Fricción</h3>
              <p className="text-sm text-gray-600">Si varias personas deben firmar, las coordinamos en orden.</p>
            </div>
            
            <div className="p-6 rounded-2xl text-center bg-white border border-gray-200 shadow-sm">
              <div className="inline-flex mx-auto mb-4 items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 text-2xl font-bold">
                4
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Guardás tus archivos</h3>
              <p className="text-sm text-gray-600">Te llevás tu PDF firmado + tu .ECO para verificar siempre.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Multiple Signatures Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Firmas individuales, en cadena o múltiples. Sin fricción.
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-12">
            ¿Necesitás que varias personas firmen el mismo documento? También podés hacerlo.
          </p>

          <div className="text-left max-w-4xl mx-auto bg-gray-50 rounded-xl p-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Cargá los correos en el orden que necesites.</h3>
                <p className="text-gray-600">Una vez firmado, el sistema se ocupa de enviar al siguiente.</p>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Cada persona recibe:</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-600">
                  <li>su PDF firmado</li>
                  <li>su archivo .ECO</li>
                </ul>
              </div>
              
              <div>
                <p className="text-gray-600 mt-4">y la verificación queda registrada</p>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="font-semibold text-blue-900 mb-2">Sin plantillas raras.</p>
                <p className="text-blue-700">Sin rutas complicadas.</p>
                <p className="text-blue-700">Sin flujos confusos.</p>
                <p className="text-blue-700 mt-2">Solo firmas. En orden. Y bien hechas.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Diseñado para quienes crean y protegen</h2>
          </div>
          
          <div className="space-y-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Creadores & Emprendedores</h3>
                <p className="text-lg text-gray-600">Proba autoría de ideas sin revelar contenido.</p>
              </div>
              <div className="bg-gray-100 p-6 rounded-xl">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <LightbulbIcon className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-gray-600">Protección de ideas sin comprometer su contenido</p>
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="md:order-2">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Legal & Compliance</h3>
                <p className="text-lg text-gray-600">Documentos certificados con validación legal internacional.</p>
              </div>
              <div className="md:order-1 bg-gray-100 p-6 rounded-xl">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ScaleIcon className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-gray-600">Documentos certificados con validación legal</p>
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Científicos & Laboratorios</h3>
                <p className="text-lg text-gray-600">Sellá integridad de datos sin filtrar hallazgos.</p>
              </div>
              <div className="bg-gray-100 p-6 rounded-xl">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TestTubeIcon className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-gray-600">Integridad científica verificable</p>
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="md:order-2">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Desarrolladores & Makers</h3>
                <p className="text-lg text-gray-600">Certificá releases y commits con timestamp legal.</p>
              </div>
              <div className="md:order-1 bg-gray-100 p-6 rounded-xl">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CodeIcon className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-gray-600">Certificación de código y releases</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Close Section */}
      <section className="py-24 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">No vendemos firmas. Vendemos certeza.</h2>
          <p className="text-lg text-gray-300 mb-8 max-w-3xl mx-auto">
            Cada documento certificado y cada .ECO es una prueba verificable que protege tu trabajo sin exponerlo.
          </p>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8">
            <p className="text-xl font-semibold text-cyan-400">
              Por una Justicia Digital Transparente.
            </p>
            <p className="text-gray-300 mt-4">
              La verdad no necesita magia, solo evidencia irrefutable.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            ¿Listo para proteger tu trabajo?
          </h2>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/login"
              className="bg-gray-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors text-lg"
            >
              Probar Gratis
            </Link>
            <Link
              to="/how-it-works"
              className="border border-gray-300 text-gray-700 hover:border-gray-900 hover:text-gray-900 px-8 py-3 rounded-lg font-medium transition-colors text-lg"
            >
              Ver cómo funciona
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <span className="text-2xl font-bold text-gray-900">EcoSign</span>
              <p className="text-sm text-gray-600 mt-3">Infraestructura de Confianza Digital</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Producto</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#how-it-works" className="hover:text-blue-600">Cómo funciona</a></li>
                <li><a href="/pricing" className="hover:text-blue-600">Precios</a></li>
                <li><a href="/verify" className="hover:text-blue-600">Verificar</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/terms" className="hover:text-blue-600">Términos</a></li>
                <li><a href="/privacy" className="hover:text-blue-600">Privacidad</a></li>
                <li><a href="/security" className="hover:text-blue-600">Seguridad</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Soporte</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/help" className="hover:text-blue-600">Ayuda</a></li>
                <li><a href="/contact" className="hover:text-blue-600">Contacto</a></li>
                <li><a href="/status" className="hover:text-blue-600">Estado</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8 space-y-3 text-sm text-gray-600">
            <p>© 2025 EcoSign por Temporal Dynamics LLC. Todos los derechos reservados.</p>
            <p>El formato .ECO y la arquitectura LTC están protegidos por PPA (US).</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Icon components (since lucide react icons are not imported in the actual way)
function PlayIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function LightbulbIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function ScaleIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  );
}

function TestTubeIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  );
}

function CodeIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  );
}

export default LandingPage;