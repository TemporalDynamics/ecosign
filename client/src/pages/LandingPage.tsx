import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  CheckCircle,
} from 'lucide-react';
import { useVideoPlayer, videoLibrary } from '../contexts/VideoPlayerContext';
import Header from '../components/Header';
import FooterPublic from '../components/FooterPublic';
import VideoPlayer from '../components/VideoPlayer';
import HuellaDigitalTooltip from '../components/HuellaDigitalTooltip';
import RegistroDigitalInalterableTooltip from '../components/RegistroDigitalInalterableTooltip';
import SelloDeTiempoLegalTooltip from '../components/SelloDeTiempoLegalTooltip';

const LandingPage = () => {
  const { playVideo, videoState } = useVideoPlayer();
  const [floatingRequested, setFloatingRequested] = useState(false);
  const currentVideoKey = 'you-dont-need-to-trust';
  const currentVideo = videoLibrary[currentVideoKey];
  const isLandingVideoPlaying = floatingRequested && videoState.isPlaying && videoState.videoSrc === currentVideo?.src;
  const firmasPoster = '/assets/images/videos/firmas-thumb.jpg';

  useEffect(() => {
    if (!videoState.isPlaying && floatingRequested) {
      setFloatingRequested(false);
    }
  }, [videoState.isPlaying, floatingRequested]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Header variant="public" />

      {/* 1. HERO PRINCIPAL - Directo, minimalista, blanco y negro */}
      <header className="pt-32 pb-24 md:pt-40 md:pb-32 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-[54px] sm:text-6xl lg:text-7xl font-bold leading-tight text-black mb-8">
            Protegé tu trabajo<br />antes de tener que defenderlo.
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto mb-4 leading-relaxed">
            EcoSign te ayuda a compartir, firmar y resguardar trabajo sensible con evidencia verificable, sin exponer el contenido.
          </p>
          <div className="text-lg md:text-xl text-gray-700 max-w-4xl mx-auto mb-8 leading-relaxed bg-blue-50 py-4 px-6 rounded-lg">
            <p className="font-semibold">No exponés tu archivo.</p>
            <p className="mt-1">Todo queda verificable cuando haga falta.</p>
          </div>
          
          <p className="text-[13px] text-gray-500 max-w-2xl mx-auto">
            Empezás gratis en minutos.
          </p>
        </div>
      </header>

      {/* 2. VIDEO - Protección del trabajo */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">
            Cómo protegés tu trabajo
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Entendelo una vez. Usalo cada vez que lo necesites.
          </p>
          <p className="text-sm text-gray-500 max-w-3xl mx-auto mb-8">
            Nota: En este video se utilizan conceptos generales para explicar el modelo de EcoSign.
            Algunos términos técnicos o denominaciones pueden variar según la configuración o evolución del producto.
          </p>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg overflow-hidden relative">
              {isLandingVideoPlaying ? (
                <div className="aspect-video bg-white flex items-center justify-center border border-gray-200">
                  <p className="text-sm text-gray-500">El video está abierto en una ventana flotante.</p>
                </div>
              ) : (
                  <VideoPlayer 
                    src={currentVideo?.src || ''}
                    className="w-full"
                  />
              )}
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600 max-w-4xl mx-auto">
            <p>Podés navegar por todas las páginas, incluso registrarte. El video te acompaña donde quieras.</p>
            <button
              onClick={() => {
                setFloatingRequested(true);
                playVideo(currentVideoKey, [currentVideoKey]);
              }}
              disabled={isLandingVideoPlaying}
              className={`font-semibold px-3 py-2 rounded-lg transition ${
                isLandingVideoPlaying
                  ? 'text-gray-400 border border-gray-200 cursor-not-allowed'
                  : 'text-gray-700 border border-gray-300 hover:border-gray-500 hover:text-black'
              }`}
              title="Abrir en ventana flotante"
            >
              Ver en ventana flotante
            </button>
          </div>

          <div className="mt-10 flex flex-col items-center gap-2">
            <Link
              to="/login?mode=signup"
              className="bg-black hover:bg-gray-800 text-white font-semibold py-4 px-10 rounded-lg transition duration-300 text-lg"
            >
              Proteger mi trabajo
            </Link>
            <p className="text-xs text-gray-500">Sin tarjeta · Plan gratuito · En minutos</p>
          </div>
        </div>
      </section>

      {/* 2. BENEFICIO ÚNICO - Tu diferencia real (privacidad) */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-8 text-center">
            Tu archivo nunca se expone.
          </h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-16 text-center leading-relaxed">
            EcoSign no accede al contenido del documento.<br />
            En su lugar, genera una huella única —como una huella dactilar—<br />
            que identifica el archivo sin revelar su contenido.
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
                <HuellaDigitalTooltip>Huella Digital</HuellaDigitalTooltip> + <SelloDeTiempoLegalTooltip>Sello de tiempo verificable</SelloDeTiempoLegalTooltip> + <RegistroDigitalInalterableTooltip>Registro Digital Inalterable</RegistroDigitalInalterableTooltip>.
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

      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 text-center">
            Todos ganan claridad
          </h2>
          <p className="text-xl text-gray-700 text-center mb-12 max-w-3xl mx-auto">
            EcoSign ordena el proceso para vos, para quien firma y para quien tenga que verificar después.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-3">Para vos</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• Protegés trabajo sensible sin exponer contenido.</li>
                <li>• Dejás respaldo verificable.</li>
                <li>• Ordenás el proceso sin fricción.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-3">Para quien firma</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• Recibe un flujo claro y profesional.</li>
                <li>• Revisa y avanza sin vueltas técnicas.</li>
                <li>• Descarga su respaldo al finalizar.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-3">Para verificar después</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• Validación sin depender de relatos.</li>
                <li>• Evidencia lista para revisar.</li>
                <li>• Más claridad cuando más importa.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3. DEMO EN ACCIÓN - Smart paste */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 text-center">
            Preparar un flujo no debería llevar media hora
          </h2>
          <p className="text-xl text-gray-700 text-center mb-12 leading-relaxed">
            Pegás una lista o cadena de mails y EcoSign reconoce los datos para acelerar la carga.
          </p>
          
          <div className="mb-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <VideoPlayer 
                src="https://uiyojopjbhooxrmamaiw.supabase.co/storage/v1/object/public/videos/firma.mp4"
                poster={firmasPoster}
                className="w-full"
              />
            </div>
          </div>

          <ul className="space-y-3 text-lg text-gray-700 max-w-2xl mx-auto">
            <li>• Menos carga manual</li>
            <li>• Menos errores</li>
            <li>• Más velocidad para empezar</li>
          </ul>
        </div>
      </section>

      {/* 5. Protección individual y colaborativa */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 text-center">
            Protección individual o colaborativa.
          </h2>
          <p className="text-xl text-gray-700 text-center mb-12 leading-relaxed">
            El mismo criterio de evidencia, incluso cuando participan varias personas.
          </p>
          
          <div className="mb-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <VideoPlayer 
                src="https://uiyojopjbhooxrmamaiw.supabase.co/storage/v1/object/public/videos/flujodefirmas.mp4"
                poster={firmasPoster}
                className="w-full"
              />
            </div>
          </div>

          <p className="text-lg text-gray-700 text-center max-w-2xl mx-auto">
            EcoSign gestiona orden, acceso y registro para que puedas enfocarte en tu trabajo.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
            No vendemos solo firmas.
          </h2>
          <p className="text-xl text-gray-700">
            Protegemos trabajo con evidencia verificable.
          </p>
        </div>
      </section>

      {/* 7. CTA FINAL - Cierre emocional */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Protegé tu trabajo. Generá evidencia verificable.
          </h2>
          <p className="text-xl text-gray-700 mb-8 max-w-3xl mx-auto">
            Creá tu cuenta gratuita y empezá a proteger documentos en minutos.
          </p>
          <Link
            to="/login?mode=signup"
            className="inline-block bg-black hover:bg-gray-800 text-white font-semibold px-12 py-4 rounded-lg transition duration-300 text-lg"
          >
            Comenzar gratis
          </Link>
          <p className="text-xs text-gray-500 mt-3">
            Sin tarjeta · Plan gratuito · Creás tu cuenta al continuar
          </p>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">
              Planes para proteger trabajo real
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              Desde profesionales independientes hasta equipos con supervisión
            </p>
            <p className="text-sm text-gray-600 mt-2">Probá sin tarjeta y podés cancelar cuando quieras.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-7 mb-12">
            {/* FREE */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 text-center">
              <h3 className="text-2xl font-bold text-black mb-1">FREE</h3>
              <p className="text-sm text-gray-600 mb-1">Empezá a proteger</p>
              <p className="text-xs text-gray-500 mb-4">Ideal para crear hábito</p>
              <div className="text-4xl font-bold text-black mb-4">$0</div>
              <ul className="space-y-3 text-sm text-gray-600 mb-6 text-left">
                <li>✓ 1 Usuario</li>
                <li>✓ 5 operaciones / mes</li>
                <li>✓ Hasta 2 participantes / operación</li>
                <li>✓ 1 documento / operación</li>
                <li>✓ 1 GB almacenamiento</li>
                <li>✓ Protección incluida</li>
              </ul>
            </div>

            {/* PRO */}
            <div className="bg-white border-2 border-[#0E4B8B] rounded-xl p-6 text-center relative shadow-[0_4px_25px_-5px_rgba(14,75,139,0.2)]">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#0E4B8B] text-white text-xs font-bold px-4 py-1 rounded-full">
                MÁS POPULAR
              </div>
              <h3 className="text-2xl font-bold text-black mb-1">PRO</h3>
              <p className="text-sm text-gray-600 mb-2">Profesional / PyME</p>
              <div className="flex items-baseline justify-center mb-1">
                <span className="text-4xl font-bold text-black">$15</span>
                <span className="text-lg text-gray-600"> USD</span>
              </div>
              <p className="text-xs text-gray-500 mb-4 line-through">Valor real: $40 USD</p>
              <ul className="space-y-3 text-sm text-gray-600 mb-6 text-left">
                <li>✓ 2 Usuarios</li>
                <li>✓ 100 operaciones / mes</li>
                <li>✓ Hasta 10 participantes / operación</li>
                <li>✓ Hasta 5 documentos / operación</li>
                <li>✓ 5 GB almacenamiento</li>
                <li>✓ Protección acelerada</li>
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
              <p className="text-sm text-gray-600 mb-2">Equipos con supervisión</p>
              <div className="flex items-baseline justify-center mb-1">
                <span className="text-4xl font-bold text-black">$49</span>
                <span className="text-lg text-gray-600"> USD</span>
              </div>
              <p className="text-xs text-gray-500 mb-4 line-through">Valor real: $89 USD</p>
              <ul className="space-y-3 text-sm text-gray-600 mb-6 text-left">
                <li>✓ 5 Usuarios</li>
                <li>✓ 300 operaciones / mes</li>
                <li>✓ Hasta 20 participantes / operación</li>
                <li>✓ Hasta 10 documentos / operación</li>
                <li>✓ 25 GB almacenamiento</li>
                <li>✓ Panel supervisor</li>
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
                <li>✓ Operaciones y participantes custom</li>
                <li>✓ Almacenamiento custom</li>
                <li>✓ Flujos y políticas a medida</li>
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
