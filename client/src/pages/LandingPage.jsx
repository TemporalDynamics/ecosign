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
      <nav className="bg-white fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center space-x-3">
              <span className="text-2xl font-bold text-black">VerifySign</span>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/how-it-works" className="text-gray-600 hover:text-black font-medium transition duration-200">
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
              <Link to="/how-it-works" className="block text-gray-600 hover:text-black px-3 py-2 rounded-lg">Cómo funciona</Link>
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

      {/* 1. HERO PRINCIPAL - Directo, minimalista, blanco y negro */}
      <header className="pt-32 pb-24 md:pt-40 md:pb-32 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight text-black mb-8">
            No vendemos firmas.<br />Vendemos certeza.
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto mb-12 leading-relaxed">
            Cada documento firmado o certificado genera evidencia verificable, sin exponer tu archivo y sin depender de nosotros.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 mb-8">
            <Link
              to="/login"
              className="bg-black hover:bg-gray-800 text-white font-semibold py-4 px-10 rounded-lg transition duration-300 text-lg"
            >
              Comenzar Gratis
            </Link>
            <Link
              to="/how-it-works"
              className="bg-white border-2 border-black text-black hover:bg-black hover:text-white font-semibold py-4 px-10 rounded-lg transition duration-300 text-lg"
            >
              Ver cómo funciona
            </Link>
          </div>
          
          <p className="text-sm text-gray-500 max-w-2xl mx-auto">
            Tu contenido nunca se sube. Solo generamos la evidencia.
          </p>
        </div>
      </header>

      {/* 2. BENEFICIO ÚNICO - Tu diferencia real (privacidad) */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-8 text-center">
            Tu archivo nunca se expone.
          </h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-16 text-center leading-relaxed">
            Firmás y certificás sin subir tu documento.<br />
            Solo generamos su hash, un código matemático imposible de reconstruir.<br />
            Lo importante queda privado. Lo verificable queda público.
          </p>

          <div className="grid md:grid-cols-3 gap-16 text-center">
            <div>
              <Lock className="w-10 h-10 text-black mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-black mb-3">Privacidad total</h3>
              <p className="text-gray-600">No vemos tu archivo, no lo guardamos.</p>
            </div>
            
            <div>
              <Shield className="w-10 h-10 text-black mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-black mb-3">Evidencia infalsificable</h3>
              <p className="text-gray-600">Hash + timestamp legal + blockchain.</p>
            </div>
            
            <div>
              <CheckCircle className="w-10 h-10 text-black mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-black mb-3">Verificación universal</h3>
              <p className="text-gray-600">Cualquiera puede validar el sello sin una cuenta.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CÓMO FUNCIONA - Solo 3 pasos, sin bloques */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-16 text-center">
            Certificá o firmá en solo 3 pasos.
          </h2>
          
          <div className="space-y-12">
            <div className="text-center md:text-left">
              <div className="inline-block bg-black text-white text-3xl font-bold w-14 h-14 rounded-full flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="text-2xl font-semibold text-black mb-2">Subí tu archivo (o arrastralo)</h3>
              <p className="text-lg text-gray-600">Nunca se almacena. Solo se calcula el hash.</p>
            </div>
            
            <div className="text-center md:text-left">
              <div className="inline-block bg-black text-white text-3xl font-bold w-14 h-14 rounded-full flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="text-2xl font-semibold text-black mb-2">Elegí el tipo de firma</h3>
              <p className="text-lg text-gray-600">EcoSign (ilimitada) o LegalSign (validez eIDAS/UETA).</p>
            </div>
            
            <div className="text-center md:text-left">
              <div className="inline-block bg-black text-white text-3xl font-bold w-14 h-14 rounded-full flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="text-2xl font-semibold text-black mb-2">Descargá tu PDF + .ECO</h3>
              <p className="text-lg text-gray-600">Evidencia completa: hash, timestamps, blockchain y Hoja de Auditoría.</p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              to="/login"
              className="inline-block bg-black hover:bg-gray-800 text-white font-semibold py-4 px-10 rounded-lg transition duration-300 text-lg"
            >
              Probar Gratis
            </Link>
          </div>
        </div>
      </section>

      {/* 4. PARA QUIÉN ES - Editorial, sin cajas */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-16 text-center">
            Hecho para quienes necesitan evidencia real.
          </h2>

          <div className="grid md:grid-cols-2 gap-x-12 gap-y-8 text-lg text-gray-700">
            <div>
              <h3 className="font-semibold text-black mb-2">Creadores y emprendedores</h3>
              <p>que quieren probar autoría sin revelar contenido.</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-black mb-2">Equipos legales</h3>
              <p>que necesitan contratos con validez internacional.</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-black mb-2">Científicos y laboratorios</h3>
              <p>que deben sellar fechas exactas.</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-black mb-2">Equipos de RRHH o Compliance</h3>
              <p>que necesitan cadenas de aprobación claras.</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-black mb-2">Desarrolladores</h3>
              <p>que quieren certificar código, commits o releases.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FIRMAS INDIVIDUALES/MÚLTIPLES - Unificado */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-8 text-center">
            Firmas individuales, múltiples o en cadena. Sin fricción.
          </h2>
          <p className="text-xl text-gray-700 text-center mb-12 leading-relaxed">
            Agregás los correos en el orden que quieras.<br />
            EcoSign se encarga de enviar, registrar, auditar y entregar cada documento firmado sin que tengas que mover un dedo.
          </p>
        </div>
      </section>

      {/* 6. DEMO - Una sola vez */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">
            Ver EcoSign en acción
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Firma real en menos de 30 segundos.
          </p>
          
          <div className="bg-gray-100 rounded-xl p-8 max-w-4xl mx-auto">
            <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <PlayIcon className="w-10 h-10 text-white" />
                </div>
                <p className="text-gray-700 font-medium">Video de demostración</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CTA FINAL - Cierre emocional */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Protegé tu trabajo. Guardá tu verdad.
          </h2>
          <p className="text-xl text-gray-700 mb-12 max-w-3xl mx-auto">
            El formato .ECO transforma tu firma en evidencia matemática verificable para siempre.
          </p>
          <Link
            to="/login"
            className="inline-block bg-black hover:bg-gray-800 text-white font-semibold px-12 py-4 rounded-lg transition duration-300 text-lg"
          >
            Comenzar Gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <span className="text-2xl font-bold text-black">VerifySign</span>
              <p className="text-sm text-gray-600 mt-3">Infraestructura de Confianza Digital</p>
            </div>
            <div>
              <h4 className="font-semibold text-black mb-3">Producto</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#how-it-works" className="hover:text-black">Cómo funciona</a></li>
                <li><a href="/pricing" className="hover:text-black">Precios</a></li>
                <li><a href="/verify" className="hover:text-black">Verificar</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-black mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/terms" className="hover:text-black">Términos</a></li>
                <li><a href="/privacy" className="hover:text-black">Privacidad</a></li>
                <li><a href="/security" className="hover:text-black">Seguridad</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-black mb-3">Soporte</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/help" className="hover:text-black">Ayuda</a></li>
                <li><a href="/contact" className="hover:text-black">Contacto</a></li>
                <li><a href="/status" className="hover:text-black">Estado</a></li>
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
};

// Icon components (since lucide react icons are not imported in the actual way)
function PlayIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default LandingPage;