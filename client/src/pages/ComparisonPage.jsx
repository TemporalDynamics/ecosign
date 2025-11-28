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

const ComparisonPage = () => {
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
            EcoSign y LegalSign
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto mb-12 leading-relaxed">
            Dos niveles de protección. Una misma tecnología de verdad inmutable.
          </p>
        </div>
      </header>

      {/* Main Content: Two Options */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <p className="text-xl text-gray-700 mb-16 text-center leading-relaxed">
            Elegí la agilidad de EcoSign para tu día a día o la potencia certificada de LegalSign para tus acuerdos más críticos. En ambos casos, tu evidencia te pertenece.
          </p>

          {/* EcoSign Section */}
          <div className="bg-gray-50 p-8 md:p-12 rounded-xl mb-20">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-black mb-2">EcoSign (El "Caballo de Batalla")</h2>
              <p className="text-xl text-gray-700 mb-4">Ideal para: RRHH, Operaciones, Aprobaciones Internas, Acuerdos Comerciales Ágiles.</p>
              <div className="w-16 h-1 bg-black mx-auto"></div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-black mb-4 flex items-center">
                  <Shield className="w-5 h-5 text-[#0E4B8B] mr-3" />
                  Productividad Ilimitada con Blindaje Forense
                </h3>
                <p className="text-gray-700 mb-6">
                  La firma electrónica avanzada diseñada para eliminar la fricción y los costos ocultos, sin sacrificar la seguridad técnica.
                </p>

                <h4 className="font-semibold text-black mb-3">Por qué elegirla:</h4>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Costos Predecibles:</strong> Olvídate de pagar por "sobre". Firmas ilimitadas para que tu negocio nunca se detenga.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Más que una Firma Simple:</strong> A diferencia de las firmas básicas del mercado, EcoSign captura un rastro de auditoría forense completo (IP, dispositivo, geolocalización) y protege tu documento con tecnología Blockchain.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Integridad Garantizada:</strong> Cada documento se sella con un Hash SHA-256 y un Sello de Tiempo (RFC 3161), alineándose técnicamente con los principios de conservación de datos más estrictos (similares a NOM-151).</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Tu Evidencia es Tuya:</strong> Recibes un archivo .ECO verificable independientemente. Si nosotros desaparecemos, tu prueba sigue siendo válida y verificable por cualquier perito.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Nivel Legal:</strong> Firma Electrónica Avanzada (AES) Reforzada. Perfecta para demostrar identidad e integridad en el 90% de los casos comerciales.</span>
                  </li>
                </ul>
              </div>
              <div className="flex items-center justify-center">
                <div className="bg-white p-6 rounded-lg border-2 border-gray-200 text-center max-w-sm">
                  <div className="text-4xl font-bold text-black mb-2">EcoSign</div>
                  <div className="text-gray-700 mb-4">Firma Electrónica Avanzada Reforzada</div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700">Documentos privados • Evidencia verificable • Sin límites</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* LegalSign Section */}
          <div className="bg-blue-50 p-8 md:p-12 rounded-xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-black mb-2">LegalSign (El "Tanque Legal")</h2>
              <p className="text-xl text-gray-700 mb-4">Ideal para: Contratos de Alto Valor, Disputas Legales Potenciales, Cumplimiento Normativo Estricto.</p>
              <div className="w-16 h-1 bg-black mx-auto"></div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-black mb-4 flex items-center">
                  <Shield className="w-5 h-5 text-[#0E4B8B] mr-3" />
                  La Potencia de un Proveedor Certificado + Triple Anclaje
                </h3>
                <p className="text-gray-700 mb-6">
                  Combinamos la validez normativa de SignNow (proveedor global acreditado) con nuestra tecnología de inmutabilidad para crear la firma más robusta del mercado.
                </p>

                <h4 className="font-semibold text-black mb-3">Por qué elegirla:</h4>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Certificación Global:</strong> Utilizamos la API de SignNow para emitir firmas que cumplen con estándares eIDAS (UE), ESIGN y UETA (EE.UU.).</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Máximo No-Repudio:</strong> Al sumar un certificado de proveedor acreditado, obtienes la presunción de validez legal. Es extremadamente difícil para una contraparte negar su firma en un tribunal.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Triple Blindaje (SmartHash):</strong> No nos conformamos con el certificado estándar. Encapsulamos la firma en nuestro contenedor forense, añadiendo anclaje en Bitcoin y Polygon + Sello de Tiempo independiente.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Auditoría de Lujo:</strong> Entregamos un historial "claro como el agua" donde se vincula la identidad certificada con la inmutabilidad de la Blockchain.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Nivel Legal:</strong> Firma Certificada (QES/AES vía Proveedor) + Blindaje Forense. La máxima protección posible para transacciones donde el riesgo no es una opción.</span>
                  </li>
                </ul>
              </div>
              <div className="flex items-center justify-center">
                <div className="bg-white p-6 rounded-lg border-2 border-gray-200 text-center max-w-sm">
                  <div className="text-4xl font-bold text-black mb-2">LegalSign</div>
                  <div className="text-gray-700 mb-4">Firma Certificada + Blindaje Forense</div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700">Validación global • Presunción legal • Máxima protección</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-6 text-center">El Ranking de Seguridad Legal: No todas las firmas son iguales.</h2>
          <p className="text-lg text-gray-700 mb-12 text-center max-w-4xl mx-auto">
            Comprendé qué requisitos técnicos y legales son necesarios para garantizar el no repudio. Así es cómo nuestras firmas EcoSign y LegalSign superan el estándar de la industria.
          </p>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300 border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 min-w-[220px]">Requisito Legal Clave (Prueba en Juicio)</th>
                  <th className="py-3 px-4 text-center text-sm font-semibold text-gray-900 bg-gray-50">Firma Simple (SES)</th>
                  <th className="py-3 px-4 text-center text-sm font-semibold text-gray-900 bg-gray-50">Firma Avanzada (AES Estándar)</th>
                  <th className="py-3 px-4 text-center text-sm font-semibold text-gray-900 bg-blue-100">EcoSign (Firma Avanzada Blindada)</th>
                  <th className="py-3 px-4 text-center text-sm font-semibold text-gray-900 bg-blue-100">LegalSign (Firma Certificada + Blindaje)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">Identificación Reforzada del Firmante</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">-</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">✓</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">✓ ✓ ✓ (2FA + Evidencia Ampliada)</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">✓ ✓ ✓ ✓ (Certificado Digital Oficial)</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">Integridad del Documento (Evidencia Técnica)</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">-</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">✓</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">✓ ✓ ✓ (Hash Criptográfico)</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">✓ ✓ ✓ ✓ (Hash + Certificado)</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">Trazabilidad y No Repudio</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">-</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">✓</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">✓ ✓ ✓ (Audit Trail + Blockchain)</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">✓ ✓ ✓ ✓ (Proveedor + Blockchain)</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">Sello de Tiempo Oficial (RFC 3161)</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">-</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">✓</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">✓ ✓ ✓ (Siempre Incluido)</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">✓ ✓ ✓ ✓ (Siempre Incluido)</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">Verificación Independiente</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">-</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">-</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">✓ ✓ ✓ (Verificable Offline sin la plataforma)</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">✓ ✓ (Verificable Offline + Proveedor)</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">Privacidad del Contenido (Zero Knowledge)</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">-</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">-</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">✓ ✓ ✓ (El documento no abandona tu dispositivo)</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">- (Se requiere el envío al Certificador)</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">Plataformas Típicas</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">Free-Tiers genéricos</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">DocuSign, Adobe Sign, etc.</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">EcoSign</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">LegalSign</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">Ideal para...</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">Formularios internos</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">Contratos Estándar</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">Confidencialidad y Agilidad</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">Contratos de Alto Riesgo/Sensibles</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-12 bg-blue-50 p-6 rounded-xl">
            <h3 className="text-xl font-bold text-black mb-3">Máxima Transparencia</h3>
            <p className="text-gray-700 mb-3">
              <strong>El Compromiso con la Privacidad: La Diferencia entre EcoSign y LegalSign</strong>
            </p>
            <p className="text-gray-700 mb-3">
              Somos la única plataforma que te ofrece dos caminos de máxima seguridad, manteniendo siempre la transparencia sobre el manejo de tus archivos:
            </p>
            <div className="mt-4">
              <h4 className="font-semibold text-black mb-2">🛡️ EcoSign: Tu documento es solo tuyo (Zero Knowledge)</h4>
              <p className="text-gray-700 mb-2">
                <strong>Privacidad:</strong> Absoluta. Cuando firmas con EcoSign, tu documento jamás se carga a nuestros servidores.
              </p>
              <p className="text-gray-700 mb-2">
                El proceso criptográfico que genera el Hash (la huella digital inmutable) se realiza completamente en tu dispositivo.
              </p>
              <p className="text-gray-700">
                Esta es la opción ideal para secretos comerciales, patentes o cualquier documento donde la confidencialidad es la prioridad N° 1.
              </p>
            </div>
            <div className="mt-4">
              <h4 className="font-semibold text-black mb-2">⚖️ LegalSign: Certificación Oficial Auditada</h4>
              <p className="text-gray-700 mb-2">
                <strong>Privacidad:</strong> Procesamiento Externo Necesario. Para darte una firma de nivel Certificado/QES que te brinde la máxima validez en la mayoría de las jurisdicciones, el documento debe ser procesado por nuestro proveedor certificado (SignNow).
              </p>
              <p className="text-gray-700 mb-2">
                <strong>Nuestro blindaje extra:</strong> Aunque el archivo sube a los servidores del proveedor, nosotros registramos su huella (Hash) en la Blockchain antes de enviarlo.
              </p>
              <p className="text-gray-700">
                <strong>Tu Garantía:</strong> Si alguien (incluso el proveedor) intentara alterar el archivo, nuestro registro inmutable lo detectaría inmediatamente. Este mecanismo nos convierte en el "Auditor del Auditor", ofreciéndote una capa de seguridad superior a un QES tradicional.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Block */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">¿Qué hace única a nuestra tecnología?</h2>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto">
              Bloque de "Cierre de Confianza" (El "Secret Sauce")
            </p>
          </div>

          <div className="space-y-12">
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-2xl font-bold text-black mb-4 flex items-center">
                <Lock className="w-6 h-6 text-[#0E4B8B] mr-3" />
                1. Independencia del Proveedor (Soberanía de Datos)
              </h3>
              <p className="text-gray-700 mb-4">
                La mayoría de las plataformas te "secuestran": si dejas de pagarles, pierdes la forma de validar tus firmas.
                Con nosotros, generamos archivos .ECO y .ECOX que son autocontenidos. Puedes verificarlos en nuestra web o con
                herramientas de código abierto, hoy y dentro de 10 años, sin depender de nuestros servidores.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-2xl font-bold text-black mb-4 flex items-center">
                <Anchor className="w-6 h-6 text-[#0E4B8B] mr-3" />
                2. El Poder del Triple Anclaje
              </h3>
              <p className="text-gray-700 mb-4">
                Mientras otros solo ponen una firma digital, nosotros "anclamos" la existencia de tu documento en tres capas:
              </p>
              <ul className="space-y-2 ml-6 text-gray-700">
                <li className="flex items-start">
                  <span className="font-semibold mr-2">• Criptografía:</span>
                  <span>Hash SHA-256 inalterable.</span>
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-2">• Tiempo:</span>
                  <span>Sello de tiempo oficial (RFC 3161).</span>
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-2">• Eternidad:</span>
                  <span>Registro público en Blockchain (Polygon/Bitcoin).</span>
                </li>
              </ul>
              <p className="text-gray-700 mt-4">
                Esto significa que, ante un tribunal, tienes la evidencia técnica más sólida posible para demostrar
                quién firmó, cuándo y qué se firmó, sin lugar a dudas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Elegí la opción que mejor se adapte a tus necesidades.
          </h2>
          <p className="text-xl text-gray-700 mb-2 max-w-2xl mx-auto">
            Sumate a los primeros usuarios y mantené tu plan para siempre.
          </p>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
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

export default ComparisonPage;