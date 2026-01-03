import { Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  CheckCircle,
  Play
} from 'lucide-react';
import { useVideoPlayer } from '../contexts/VideoPlayerContext';
import Header from '../components/Header';
import FooterPublic from '../components/FooterPublic';
import HuellaDigitalTooltip from '../components/HuellaDigitalTooltip';
import SelloDeIntegridadTooltip from '../components/SelloDeIntegridadTooltip';
import RegistroDigitalInalterableTooltip from '../components/RegistroDigitalInalterableTooltip';
import PolygonTooltip from '../components/PolygonTooltip';
import BitcoinTooltip from '../components/BitcoinTooltip';
import InhackeableTooltip from '../components/InhackeableTooltip';
import SelloDeTiempoLegalTooltip from '../components/SelloDeTiempoLegalTooltip';

const LandingPage = () => {
  const { playVideo } = useVideoPlayer();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Header variant="public" />

      {/* 1. HERO PRINCIPAL - Directo, minimalista, blanco y negro */}
      <header className="pt-32 pb-24 md:pt-40 md:pb-32 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-[54px] sm:text-6xl lg:text-7xl font-bold leading-tight text-black mb-8">
            Protección legal para<br />documentos digitales.
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto mb-4 leading-relaxed">
            EcoSign protege documentos digitales mediante evidencia técnica verificable, sin acceder a su contenido.
          </p>
          <div className="text-lg md:text-xl text-gray-700 max-w-4xl mx-auto mb-8 leading-relaxed bg-blue-50 py-4 px-6 rounded-lg">
            <p className="font-semibold">Firmá sin exponer tu archivo.</p>
            <p className="mt-1">Cerrá acuerdos en minutos, no días.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 mb-8">
            <div className="flex flex-col items-center gap-2">
              <Link
                to="/login?mode=signup"
                className="bg-black hover:bg-gray-800 text-white font-semibold py-4 px-10 rounded-lg transition duration-300 text-lg"
              >
                Comenzar Gratis
              </Link>
              <p className="text-xs text-gray-500">Sin tarjeta · Plan gratuito · En minutos</p>
            </div>
            <button
              onClick={() => playVideo('you-dont-need-to-trust')}
              className="bg-transparent border-2 border-[#0E4B8B] text-[#0E4B8B] hover:bg-[#0E4B8B] hover:text-white font-semibold py-4 px-10 rounded-lg transition duration-300 text-lg inline-flex items-center justify-center gap-2"
              title="Entendelo con calma. Usalo cuando lo necesites."
            >
              <Play className="w-5 h-5" />
              Ver cómo funciona
            </button>
          </div>
          <p className="text-sm text-gray-600 max-w-3xl mx-auto mb-4">
            Entendelo con calma. Usalo cuando lo necesites.
          </p>
          
          <p className="text-[13px] text-gray-500 max-w-2xl mx-auto">
            Evidencia técnica verificable, sin acceder al contenido.
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
            EcoSign no accede al contenido del documento.<br />
            Solo genera una huella matemática única del archivo. No se puede reconstruir el contenido.<br />
            La protección se realiza sin leer ni almacenar el contenido.
            <span className="text-sm text-gray-500 block mt-1">(A esto lo llamamos <HuellaDigitalTooltip>Huella Digital</HuellaDigitalTooltip> o Sello de Integridad).</span>
          </p>

          <div className="grid md:grid-cols-3 gap-16 text-center">
            <div>
              <Lock className="w-10 h-10 text-[#0E4B8B] mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-xl font-semibold text-black mb-3">Privacidad total</h3>
              <p className="text-gray-600">No vemos tu archivo, no lo guardamos.</p>
            </div>
            
            <div>
              <Shield className="w-10 h-10 text-[#0E4B8B] mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-xl font-semibold text-black mb-3">Evidencia técnica verificable</h3>
              <p className="text-gray-600">Generada automáticamente, verificable por cualquiera.</p>
              <p className="text-xs text-gray-500 mt-2">
                <HuellaDigitalTooltip>Huella Digital</HuellaDigitalTooltip> + <SelloDeTiempoLegalTooltip>Sello de Tiempo Legal</SelloDeTiempoLegalTooltip> + <RegistroDigitalInalterableTooltip>Registro Digital Inalterable</RegistroDigitalInalterableTooltip>.
              </p>
            </div>
            
            <div>
              <CheckCircle className="w-10 h-10 text-[#0E4B8B] mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-xl font-semibold text-black mb-3">Verificación universal</h3>
              <p className="text-gray-600">Cualquiera puede validar el sello sin una cuenta.</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 text-center mt-10">
            Si querés, podés seguir sin leer el detalle técnico. EcoSign se encarga.
          </p>
        </div>
      </section>

      {/* 3. CÓMO FUNCIONA - Solo 3 pasos, sin bloques */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-16 text-center">
            Protegé o firmá en solo 3 pasos.
          </h2>
          <p className="text-sm text-gray-600 text-center -mt-10 mb-8">
            Todo lo que sigue es opcional: sirve para entender, no para usar.
          </p>
          
          <div className="space-y-12">
            <div className="text-center md:text-left">
              <div className="inline-block bg-black text-white text-3xl font-bold w-14 h-14 rounded-full flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="text-2xl font-semibold text-black mb-2">Subí tu archivo (o arrastralo)</h3>
              <p className="text-lg text-gray-600">Nunca se almacena. Solo se calcula la <HuellaDigitalTooltip>Huella Digital</HuellaDigitalTooltip>.</p>
            </div>
            
            <div className="text-center md:text-left">
              <div className="inline-block bg-black text-white text-3xl font-bold w-14 h-14 rounded-full flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="text-2xl font-semibold text-black mb-2">Elegí el tipo de protección</h3>
              <p className="text-lg text-gray-600">Firma técnica de integridad y autoría, o firma legal regulada mediante proveedores externos.</p>
            </div>
            
            <div className="text-center md:text-left">
              <div className="inline-block bg-black text-white text-3xl font-bold w-14 h-14 rounded-full flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="text-2xl font-semibold text-black mb-2">Descargá tu PDF + Contenedor .ECO</h3>
              <p className="text-lg text-gray-600">Contenedor de protección legal (.ECO) con evidencia técnica completa y Hoja de Auditoría.</p>
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
            Mirá cómo funciona en la práctica.
          </p>
          
          <div className="bg-gray-100 rounded-xl p-8 max-w-4xl mx-auto">
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
              <video 
                controls 
                className="w-full h-full"
                poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1920 1080'%3E%3Crect fill='%23000' width='1920' height='1080'/%3E%3C/svg%3E"
              >
                <source 
                  src="https://uiyojopjbhooxrmamaiw.supabase.co/storage/v1/object/public/videos/demo22s.mp4" 
                  type="video/mp4" 
                />
                Tu navegador no soporta video HTML5.
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CTA FINAL - Cierre emocional */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Protegé tu trabajo. Generá evidencia verificable.
          </h2>
          <p className="text-xl text-gray-700 mb-12 max-w-3xl mx-auto">
            EcoSign genera evidencia técnica que permite demostrar que un documento existía, no fue modificado y pertenece a una acción específica en el tiempo.
          </p>
          <Link
            to="/login"
            className="inline-block bg-black hover:bg-gray-800 text-white font-semibold px-12 py-4 rounded-lg transition duration-300 text-lg"
          >
            Comenzar Gratis
          </Link>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">
              Planes diseñados para cada necesidad
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              Desde prueba gratuita hasta soluciones empresariales
            </p>
            <p className="text-sm text-gray-600 mt-2">Probá sin tarjeta y podés cancelar cuando quieras.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-7 mb-12">
            {/* FREE */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 text-center">
              <h3 className="text-2xl font-bold text-black mb-1">FREE</h3>
              <p className="text-sm text-gray-600 mb-1">Probá la plataforma</p>
              <p className="text-xs text-gray-500 mb-4">Pagás solo lo que necesitás</p>
              <div className="text-4xl font-bold text-black mb-4">$0</div>
              <ul className="space-y-3 text-sm text-gray-600 mb-6 text-left">
                <li>✓ 1 Usuario</li>
                <li>✓ Firmantes ilimitados</li>
                <li>✓ 1 GB almacenamiento</li>
                <li>✓ 3 Firmas Legales/mes</li>
                <li>✓ Firma Certificada (por uso)</li>
              </ul>
            </div>

            {/* PRO */}
            <div className="bg-white border-2 border-[#0E4B8B] rounded-xl p-6 text-center relative shadow-[0_4px_25px_-5px_rgba(14,75,139,0.2)]">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#0E4B8B] text-white text-xs font-bold px-4 py-1 rounded-full">
                MÁS POPULAR
              </div>
              <h3 className="text-2xl font-bold text-black mb-1">PRO</h3>
              <p className="text-sm text-gray-600 mb-2">Profesional/Pyme</p>
              <div className="flex items-baseline justify-center mb-1">
                <span className="text-4xl font-bold text-black">$15</span>
                <span className="text-lg text-gray-600"> USD</span>
              </div>
              <p className="text-xs text-gray-500 mb-4 line-through">Valor real: $40 USD</p>
              <ul className="space-y-3 text-sm text-gray-600 mb-6 text-left">
                <li>✓ 2 Usuarios</li>
                <li>✓ Firmantes ilimitados</li>
                <li>✓ 5 GB almacenamiento</li>
                <li>✓ 100 Firmas Legales/mes</li>
                <li>✓ Firma Certificada (por uso)</li>
              </ul>
              <div className="text-center pt-4 mt-auto">
                <div className="inline-block bg-[#0E4B8B]/[0.12] text-[#0E4B8B] font-medium text-xs px-3 py-1 rounded-md">
                  Tu tarifa queda protegida para siempre
                </div>
              </div>
            </div>

            {/* BUSINESS */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 text-center">
              <h3 className="text-2xl font-bold text-black mb-1">BUSINESS</h3>
              <p className="text-sm text-gray-600 mb-2">Alto Volumen</p>
              <div className="flex items-baseline justify-center mb-1">
                <span className="text-4xl font-bold text-black">$49</span>
                <span className="text-lg text-gray-600"> USD</span>
              </div>
              <p className="text-xs text-gray-500 mb-4 line-through">Valor real: $89 USD</p>
              <ul className="space-y-3 text-sm text-gray-600 mb-6 text-left">
                <li>✓ 5 Usuarios</li>
                <li>✓ Firmantes ilimitados</li>
                <li>✓ 25 GB almacenamiento</li>
                <li>✓ Firmas Legales ILIMITADAS</li>
                <li>✓ Firma Certificada (por uso)</li>
                <li>✓ Panel de Auditoría</li>
                <li>✓ API Limitado</li>
              </ul>
              <div className="text-center pt-2">
                <div className="inline-block bg-gray-100 text-gray-800 font-medium text-xs px-3 py-1 rounded-md">
                  Tu tarifa queda protegida para siempre
                </div>
              </div>
            </div>

            {/* ENTERPRISE */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 text-center">
              <h3 className="text-2xl font-bold text-black mb-1">ENTERPRISE</h3>
              <p className="text-sm text-gray-600 mb-4">A medida</p>
              <div className="text-3xl font-bold text-black mb-4">Custom</div>
              <ul className="space-y-3 text-sm text-gray-600 mb-6 text-left">
                <li>✓ Usuarios ilimitados</li>
                <li>✓ Firmantes ilimitados</li>
                <li>✓ Almacenamiento custom</li>
                <li>✓ Firmas Legales ILIMITADAS</li>
                <li>✓ Firmas Certificadas (plan a medida)</li>
                <li>✓ Panel de Auditoría</li>
                <li>✓ API Completo</li>
              </ul>
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/pricing"
              className="inline-block bg-black hover:bg-gray-800 text-white font-semibold px-8 py-3 rounded-lg transition duration-300"
            >
              Ver Comparación Completa
            </Link>
          </div>
        </div>
      </section>

      <FooterPublic />
    </div>
  );
};

export default LandingPage;
