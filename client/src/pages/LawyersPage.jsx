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

const LawyersPage = () => {
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
            EcoSign para Abogados y Estudios Jurídicos
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto mb-4 leading-relaxed font-bold">
            La Evidencia Irrefutable. La Firma Electrónica diseñada para Litigio.
          </p>
          <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto mb-12 leading-relaxed">
            Dejá de depender de archivos volátiles y plataformas que exponen la confidencialidad de tu cliente. EcoSign te da la soberanía total sobre la prueba, con un blindaje forense que resiste la impugnación.
          </p>
        </div>
      </header>

      {/* Sección 2: El Riesgo de la Firma Digital Estándar en Tribunales */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
            El Riesgo de la Firma Digital Estándar en Tribunales
          </h2>

          <div className="space-y-6">
            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Carga de la Prueba Innecesaria</h3>
              <p className="text-gray-700">Plataformas que exponen la información en servidores externos, obligándote a defender la custodia y el origen del documento.</p>
            </div>

            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Vulnerabilidad en la Cadena de Custodia</h3>
              <p className="text-gray-700">Confusión sobre cuál es la versión oficial, o riesgo de que la plataforma te deje sin acceso a la evidencia.</p>
            </div>

            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Pérdida de Tiempo No Facturable</h3>
              <p className="text-gray-700">Revisiones, reenvíos y seguimiento manual de firmantes, ralentizando el proceso sin control.</p>
            </div>

            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Fricción con el Cliente</h3>
              <p className="text-gray-700">Tus clientes deben descargar apps o registrarse en procesos complejos para una firma simple.</p>
            </div>

            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Costos de Auditoría Futura</h3>
              <p className="text-gray-700">Dependencia de terceros para verificar documentos, incurriendo en gastos de peritaje adicionales.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sección 3: EcoSign Resuelve */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
            EcoSign: Tu Blindaje Forense y Procesal
          </h2>

          <div className="bg-blue-50 rounded-xl p-8">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300 border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 min-w-[200px]">Beneficio Clave</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900">La Ventaja para tu Estudio Jurídico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-4 px-4 text-sm font-medium text-gray-900">Soberanía Absoluta de la Prueba</td>
                    <td className="py-4 px-4 text-sm text-gray-700">El documento nunca toca servidores externos. La información crítica de tu cliente permanece confidencial y en tu poder.</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="py-4 px-4 text-sm font-medium text-gray-900">Evidencia Inmutable (.ECO)</td>
                    <td className="py-4 px-4 text-sm text-gray-700">Toda la historia del documento, cronología y firmas, encapsulada en un solo archivo verificable para siempre (Hash + Blockchain).</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 text-sm font-medium text-gray-900">Verificación Independiente</td>
                    <td className="py-4 px-4 text-sm text-gray-700">La prueba se valida sin depender de nosotros. Tu evidencia es autosuficiente, un perito puede verificarla localmente sin acceder a servicios web.</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="py-4 px-4 text-sm font-medium text-gray-900">Menos Riesgo de Repudio</td>
                    <td className="py-4 px-4 text-sm text-gray-700">Registros forenses detallados disponibles inmediatamente para respaldar la autenticidad e integridad en cualquier instancia judicial.</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 text-sm font-medium text-gray-900">Cero Fricción para el Cliente</td>
                    <td className="py-4 px-4 text-sm text-gray-700">Proceso simple e intuitivo que tus clientes pueden usar sin necesidad de software o training.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Sección 4: Usos Estratégicos y El Peso de la Prueba */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
            Usos Ideales: Reforzá cada instancia legal
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-blue-50 p-8 rounded-xl">
              <h3 className="text-2xl font-bold text-black mb-4 text-center">Contratos y Acuerdos Privados:</h3>
              <p className="text-gray-700 mb-4 text-center">Documentos entre partes donde la confidencialidad y la fecha cierta son críticas.</p>
            </div>

            <div className="bg-gray-100 p-8 rounded-xl">
              <h3 className="text-2xl font-bold text-black mb-4 text-center">Documentación Preparatoria:</h3>
              <p className="text-gray-700 mb-4 text-center">Documentos previos a demandas, reclamos o procesos formales donde necesitás asegurar la versión y la autoría.</p>
            </div>

            <div className="bg-blue-50 p-8 rounded-xl">
              <h3 className="text-2xl font-bold text-black mb-4 text-center">Renuncias y Consentimientos:</h3>
              <p className="text-gray-700 mb-4 text-center">Documentos que autorizan o renuncian a derechos, exigiendo la trazabilidad completa del proceso.</p>
            </div>

            <div className="bg-gray-100 p-8 rounded-xl">
              <h3 className="text-2xl font-bold text-black mb-4 text-center">NDA y Acuerdos de Confidencialidad:</h3>
              <p className="text-gray-700 mb-4 text-center">Garantizá que la información no sea expuesta, incluso durante el proceso de firma.</p>
            </div>

            <div className="col-span-2 bg-gray-100 p-8 rounded-xl">
              <h3 className="text-2xl font-bold text-black mb-4 text-center">Anexos y Documentos Complementarios:</h3>
              <p className="text-gray-700 mb-4 text-center">Asegurá la integridad de los documentos que se adjuntan a contratos principales.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sección 5: La Elección del Abogado Estratégico */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
            Beneficios Clave para la Profesión
          </h2>

          <div className="grid md:grid-cols-2 gap-12 mb-12">
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-2xl font-bold text-black mb-6 text-center">Riesgo Procesal Reducido</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-6 h-6 flex-shrink-0 mt-1 mr-3" />
                  <span><strong>Menor Exposición de Información:</strong> Privacidad Zero Knowledge</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-6 h-6 flex-shrink-0 mt-1 mr-3" />
                  <span><strong>Más Claridad Procesal:</strong> Cronología de eventos inmutable</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-6 h-6 flex-shrink-0 mt-1 mr-3" />
                  <span><strong>Menor Riesgo de Repudio:</strong> Evidencia Forense Superior</span>
                </li>
              </ul>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-2xl font-bold text-black mb-6 text-center">Gananos Control y Certeza</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-6 h-6 flex-shrink-0 mt-1 mr-3" />
                  <span><strong>Más Confianza del Cliente:</strong> Proceso simple y seguro</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-6 h-6 flex-shrink-0 mt-1 mr-3" />
                  <span><strong>Menor Responsabilidad por Custodia:</strong> El cliente mantiene el control</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-6 h-6 flex-shrink-0 mt-1 mr-3" />
                  <span><strong>Menos Tiempo Administrativo:</strong> Enfocate en el caso, no en coordinar firmas</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm">
            <h3 className="text-2xl font-bold text-black mb-6 text-center">La Doble Opción</h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-xl font-bold text-black mb-3">EcoSign:</h4>
                <p className="text-gray-700">Para la mayoría de tus documentos privados y la máxima confidencialidad.</p>
              </div>
              <div>
                <h4 className="text-xl font-bold text-black mb-3">LegalSign (Vía SignNow):</h4>
                <p className="text-gray-700">Para procesos que exigen la certificación de un Proveedor Acreditado, dándote la presunción de validez legal cuando más lo necesitás.</p>
              </div>
            </div>
            <p className="text-xl font-semibold text-black mt-6 text-center">
              Ambas herramientas están integradas para que vos definas el nivel de armadura legal de cada documento, sin cambiar de plataforma.
            </p>
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

export default LawyersPage;