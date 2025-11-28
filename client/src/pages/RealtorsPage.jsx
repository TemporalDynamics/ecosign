import { useState } from 'react';
import { Link } from 'react-router-dom';
import Shield from 'lucide-react/dist/esm/icons/shield';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Lock from 'lucide-react/dist/esm/icons/lock';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Link as LinkIcon from 'lucide-react/dist/esm/icons/link as -link-icon';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Anchor from 'lucide-react/dist/esm/icons/anchor';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Users from 'lucide-react/dist/esm/icons/users';
import Play from 'lucide-react/dist/esm/icons/play';
import { useVideoPlayer } from '../contexts/VideoPlayerContext';
import FooterPublic from '../components/FooterPublic';

const RealtorsPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { playVideo } = useVideoPlayer();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation */}
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
                Verificador
              </Link>
              <Link to="/pricing" className="text-gray-600 hover:text-[#0E4B8B] font-medium text-[17px] transition duration-200">
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
              <Link to="/verify" className="block text-gray-600 hover:text-black px-3 py-2 rounded-lg">Verificador</Link>
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

      {/* Hero Section */}
      <header className="pt-32 pb-24 md:pt-40 md:pb-32 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-[54px] sm:text-6xl lg:text-7xl font-bold leading-tight text-black mb-8">
            EcoSign para Profesionales de Bienes Raíces
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto mb-4 leading-relaxed font-bold">
            De la Reserva a la Escritura: Cerrá operaciones con la velocidad de un clic.
          </p>
          <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto mb-12 leading-relaxed">
            Detené la fricción, eliminá los costos ocultos y documentá cada paso de la operación sin exponer la información más sensible. EcoSign es tu aliado para el 90% de los acuerdos previos a la firma notarial.
          </p>
        </div>
      </header>

      {/* Sección 2: El Costo Real de Usar Plataformas Genéricas */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
            El Costo Real de Usar Plataformas Genéricas
          </h2>

          <div className="space-y-6">
            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Fricción de Cierre</h3>
              <p className="text-gray-700">Firmas que tardan días, esperando que el cliente "imprima, firme y escanee".</p>
            </div>

            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Riesgo y Exposición</h3>
              <p className="text-gray-700">Documentos sensibles (precios, comisiones, datos personales) almacenados en servidores de terceros (donde no tenés control).</p>
            </div>

            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Costo Impredecible</h3>
              <p className="text-gray-700">Límites por "sobres" o "créditos" que se agotan justo antes de una operación clave.</p>
            </div>

            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Pérdida de Foco</h3>
              <p className="text-gray-700">Tareas repetitivas como seguir, reenviar y coordinar la firma de múltiples intervinientes.</p>
            </div>

            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Dependencia Externa</h3>
              <p className="text-gray-700">Necesidad de consultar o pagar a terceros para validar o generar documentos simples.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sección 3: EcoSign Resuelve */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
            EcoSign: Más que una firma, un acelerador de negocios
          </h2>

          <div className="bg-blue-50 rounded-xl p-8">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300 border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 min-w-[200px]">Beneficio Clave</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900">¿Cómo te ayuda EcoSign?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-4 px-4 text-sm font-medium text-gray-900">Cierres en Minutos</td>
                    <td className="py-4 px-4 text-sm text-gray-700">Olvidate de la logística de impresión. Firmá en cualquier dispositivo y asegurá un acuerdo en minutos, no en días.</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="py-4 px-4 text-sm font-medium text-gray-900">Confidencialidad Total</td>
                    <td className="py-4 px-4 text-sm text-gray-700">El archivo nunca sale de tu poder. El proceso de firma ocurre en tu dispositivo. Tu información valiosa no se sube a servidores externos.</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 text-sm font-medium text-gray-900">Costo Cero</td>
                    <td className="py-4 px-4 text-sm text-gray-700">Sin sobres, sin límites. Un solo plan te da firmas ilimitadas. Tu costo es fijo y predecible.</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="py-4 px-4 text-sm font-medium text-gray-900">Evidencia Inmutable</td>
                    <td className="py-4 px-4 text-sm text-gray-700">Cada documento genera un archivo .ECO blindado con Blockchain. La evidencia se valida sola, garantizando la trazabilidad ante cualquier disputa.</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 text-sm font-medium text-gray-900">Ideal para el Flujo Inmobiliario</td>
                    <td className="py-4 px-4 text-sm text-gray-700">Documentá autorizaciones, reservas y acuerdos previos a escritura sin necesidad de intermediarios (notarios/escribanos).</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Sección 4: ¿Por qué EcoSign es tu mejor opción? */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
            EcoSign vs. La Práctica Común del Mercado
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300 border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-center text-sm font-semibold text-gray-900 bg-gray-200">La Práctica Común (Plataformas Estándar)</th>
                  <th className="py-3 px-4 text-center text-sm font-semibold text-gray-900">El Riesgo y el Costo Oculto</th>
                  <th className="py-3 px-4 text-center text-sm font-semibold text-gray-900 bg-blue-100">EcoSign: Nuestra Ventaja Competitiva</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">Almacenan tus documentos</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center">Tus contratos sensibles están en servidores externos. Pierdes el control de tu información.</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">No almacena tus documentos</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">Exigen límites por "créditos"</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center">Costos extras que se acumulan con cada reserva o autorización que firmes.</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">Firmas ilimitadas</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">Dependencia de terceros</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center">Necesitas pagar y rogar a una plataforma para validar un documento simple.</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">Verificación inmediata</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">Requieren capacitación</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center">Procesos complejos para tus clientes no técnicos.</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">No necesitas capacitación técnica</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Sección 5: Cuándo usar cada firma */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
            Guía Rápida para el Profesional Inmobiliario
          </h2>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-blue-50 p-8 rounded-xl">
              <h3 className="text-2xl font-bold text-black mb-4 text-center">¿Cuándo usar EcoSign? (Volumen Diario)</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span><strong>Reservas</strong> - Acuerdos iniciales que no requieren escritura pública</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span><strong>Autorizaciones de Venta</strong> - Documentos que autorizan la comercialización</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span><strong>Señales y Propuestas</strong> - Acuerdos de intención con compromiso formal</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span><strong>Comisiones e Intermediaciones</strong> - Documentos de pago y distribución</span>
                </li>
              </ul>
            </div>

            <div className="bg-gray-100 p-8 rounded-xl">
              <h3 className="text-2xl font-bold text-black mb-4 text-center">¿Cuándo usar LegalSign? (Máximo Riesgo)</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span><strong>Escrituras Públicas</strong> - Donde la ley lo exija</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span><strong>Contratos de Alto Valor/Sensibles</strong> - Donde se necesite una certificación oficial</span>
                </li>
              </ul>
              <p className="mt-4 text-center font-semibold text-black">
                Recordá: EcoSign te permite usar LegalSign en el mismo flujo de trabajo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Sumate a los primeros usuarios y mantené tu plan para siempre.
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            <em>Recibirás por correo tu Batch Founder, indicando tu número de usuario inicial.</em>
          </p>
          <Link
            to="/login"
            className="inline-block bg-black hover:bg-gray-800 text-white font-semibold px-12 py-4 rounded-lg transition duration-300 text-lg"
          >
            Comenzar Gratis
          </Link>
        </div>
      </section>

      <FooterPublic />
    </div>
  );
};

export default RealtorsPage;