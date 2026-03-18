import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, CheckCircle, Lock, Anchor } from 'lucide-react';
import { useVideoPlayer } from '../contexts/VideoPlayerContext';
import FooterPublic from '../components/FooterPublic';
import Header from '../components/Header';
import SEO from '../components/SEO';
import InhackeableTooltip from '../components/InhackeableTooltip';

const ComparisonPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { playVideo } = useVideoPlayer();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SEO title="Comparativa" description="EcoSign vs firma electrónica tradicional. Compará protección, evidencia y privacidad." path="/comparison" />
      <Header variant="public" />

      {/* Hero Section */}
      <header className="pt-32 pb-24 md:pt-40 md:pb-32 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-[54px] sm:text-6xl lg:text-7xl font-bold leading-tight text-black mb-8">
            Dos niveles de protección.<br />Una misma evidencia verificable.
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto mb-12 leading-relaxed">
            La Firma Legal de EcoSign es sólida, verificable y tuya para siempre. Para casos críticos, sumá un proveedor externo acreditado.
          </p>
        </div>
      </header>

      {/* Main Content: Two Options */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <p className="text-xl text-gray-700 mb-16 text-center leading-relaxed">
            Ambas opciones te dan evidencia verificable. La diferencia está en el nivel de validez legal que necesitás.
          </p>

          {/* Firma Legal Section */}
          <div className="bg-gray-50 p-8 md:p-12 rounded-xl mb-20">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-black mb-2">Firma Legal de EcoSign</h2>
              <p className="text-xl text-gray-700 mb-4">Ideal para: 95% de los casos reales. RRHH, contratos comerciales, acuerdos con clientes, operaciones diarias.</p>
              <div className="w-16 h-1 bg-black mx-auto"></div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-black mb-4 flex items-center">
                  <Shield className="w-5 h-5 text-[#0E4B8B] mr-3" />
                  La opción sólida para tu día a día
                </h3>
                <p className="text-gray-700 mb-6">
                  Nuestra firma legal es robusta, verificable y tuya para siempre. Diseñada para eliminar fricción sin sacrificar seguridad técnica.
                </p>

                <h4 className="font-semibold text-black mb-3">Por qué es muy buena:</h4>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Costos predecibles:</strong> Firmas ilimitadas. Sin pagar por "sobre". Tu negocio nunca se detiene.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Más que una firma básica:</strong> A diferencia de plataformas genéricas, capturamos rastro de auditoría completo y protegemos tu documento con registro inalterable.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Verificable por peritos:</strong> Huella digital única, sello de tiempo y registro inalterable en cada documento. Cualquier perito puede validarlo.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Tu evidencia es tuya:</strong> Recibís un archivo .ECO verificable independientemente. Si EcoSign desaparece, tu prueba sigue siendo válida.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Privacidad total:</strong> Tu documento se cifra en tu dispositivo antes de subirse y almacenarse. EcoSign no puede leer el contenido. Ideal para secretos comerciales y patentes.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Validez legal sólida:</strong> Firma Electrónica Avanzada. Perfecta para demostrar identidad e integridad en la mayoría de los casos comerciales y laborales.</span>
                  </li>
                </ul>
              </div>
              <div className="flex items-center justify-center">
                <div className="bg-white p-6 rounded-lg border-2 border-gray-200 text-center max-w-sm">
                  <div className="text-4xl font-bold text-black mb-2">Firma Legal</div>
                  <div className="text-gray-700 mb-4">Sólida • Verificable • Tuya</div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700">Documentos privados • Evidencia verificable • Sin límites</p>
                  </div>
                  <div className="mt-4 bg-green-50 p-3 rounded-lg border border-green-200">
                    <p className="text-xs text-green-800 font-semibold">✓ La opción recomendada para el 95% de los casos</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Firma Certificada Section */}
          <div className="bg-blue-50 p-8 md:p-12 rounded-xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-black mb-2">Firma Certificada con Proveedor Externo</h2>
              <p className="text-xl text-gray-700 mb-4">Ideal para: Contratos de muy alto valor, disputas legales probables, regulaciones que exigen certificado externo.</p>
              <div className="w-16 h-1 bg-black mx-auto"></div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-black mb-4 flex items-center">
                  <Shield className="w-5 h-5 text-[#0E4B8B] mr-3" />
                  Máxima validez legal + nuestra evidencia
                </h3>
                <p className="text-gray-700 mb-6">
                  Combinamos un proveedor acreditado global (SignNow) con nuestra tecnología de evidencia verificable. La máxima protección para casos donde el riesgo no es una opción.
                </p>

                <h4 className="font-semibold text-black mb-3">Por qué elegirla:</h4>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Certificado externo acreditado:</strong> Proveedor global reconocido. Validez jurídica según normativas internacionales.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Máximo no-repudio:</strong> Presunción de validez legal. Extremadamente difícil que una contraparte niegue su firma en tribunal.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Doble capa de evidencia:</strong> Certificado del proveedor + nuestra evidencia técnica (huella, sello de tiempo, registro inalterable).</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Auditoría completa:</strong> Historial técnico que vincula identidad regulada con registro público verificable.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Verificación en dos frentes:</strong> Se puede validar tanto con el proveedor externo como con nuestra evidencia independiente.</span>
                  </li>
                </ul>
              </div>
              <div className="flex items-center justify-center">
                <div className="bg-white p-6 rounded-lg border-2 border-gray-200 text-center max-w-sm">
                  <div className="text-4xl font-bold text-black mb-2">Firma Certificada</div>
                  <div className="text-gray-700 mb-4">Proveedor Acreditado + Evidencia</div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700">Certificado externo • Presunción legal • Doble validación</p>
                  </div>
                  <div className="mt-4 bg-blue-100 p-3 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-800 font-semibold">✓ Para casos donde el riesgo no es opción</p>
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
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-6 text-center">No todas las firmas son iguales</h2>
          <p className="text-lg text-gray-700 mb-12 text-center max-w-4xl mx-auto">
            Esta tabla te muestra qué necesitás para reducir el riesgo de repudio. Así es como nuestras opciones se comparan con el estándar de la industria.
          </p>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300 border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 min-w-[220px]">Requisito Técnico Clave</th>
                  <th className="py-3 px-4 text-center text-sm font-semibold text-gray-900 bg-gray-50">Firma Simple</th>
                  <th className="py-3 px-4 text-center text-sm font-semibold text-gray-900 bg-gray-50">Plataformas Genéricas</th>
                  <th className="py-3 px-4 text-center text-sm font-semibold text-gray-900 bg-blue-100">Firma Legal EcoSign</th>
                  <th className="py-3 px-4 text-center text-sm font-semibold text-gray-900 bg-blue-100">Firma Certificada EcoSign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">Identificación reforzada del firmante</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">No</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">Básica</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">2FA + evidencia ampliada</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">Certificado digital oficial</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">Integridad del documento</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">No</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">Básica</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">Hash criptográfico verificable</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">Hash + certificado externo</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">Trazabilidad y no repudio</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">No</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">Básica</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">Audit trail + blockchain</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">Proveedor + blockchain</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">Evidencia técnica verificable</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">No</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">No</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">Incluida (hash + tiempo + registro)</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">Incluida (hash + tiempo + registro)</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">Verificación independiente</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">No</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">No</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">Verificable offline sin la plataforma</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">Verificable offline + proveedor</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">Privacidad del contenido</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">No</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">No</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">No accede al contenido</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">Requiere envío al proveedor</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">Ideal para</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">Formularios internos</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-gray-50">Contratos estándar</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">Confidencialidad y agilidad</td>
                  <td className="py-4 px-4 text-sm text-gray-700 text-center bg-blue-50">Alto riesgo / sensibles</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-12 bg-blue-50 p-6 rounded-xl">
            <h3 className="text-xl font-bold text-black mb-3">Privacidad: la diferencia clave</h3>
            <div className="mt-4">
              <h4 className="font-semibold text-black mb-2">🛡️ Firma Legal: Tu documento es solo tuyo</h4>
              <p className="text-gray-700 mb-2">
                <strong>Privacidad real:</strong> EcoSign no accede al contenido de tu documento. El archivo se sube y se almacena cifrado, de forma que EcoSign no puede leerlo.
              </p>
              <p className="text-gray-700">
                Ideal para secretos comerciales, patentes o cualquier documento donde la confidencialidad es la prioridad.
              </p>
            </div>
            <div className="mt-4">
              <h4 className="font-semibold text-black mb-2">⚖️ Firma Certificada: Procesamiento externo necesario</h4>
              <p className="text-gray-700 mb-2">
                <strong>El documento se procesa en el proveedor:</strong> Para usar firma certificada, el archivo se envía al proveedor acreditado (SignNow).
              </p>
              <p className="text-gray-700 mb-2">
                <strong>Nuestra protección adicional:</strong> Registramos la huella digital en un registro verificable antes de enviarlo.
              </p>
              <p className="text-gray-700">
                <strong>Seguridad extra:</strong> Si alguien intenta alterar el archivo (incluso el proveedor), nuestro registro público lo detecta inmediatamente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Block */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">¿Por qué nuestra tecnología es única?</h2>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto">
              Lo que nos hace diferentes
            </p>
          </div>

          <div className="space-y-12">
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-2xl font-bold text-black mb-4 flex items-center">
                <Lock className="w-6 h-6 text-[#0E4B8B] mr-3" />
                1. Tu evidencia es tuya para siempre
              </h3>
              <p className="text-gray-700 mb-4">
                La mayoría de las plataformas te atrapan: si dejás de pagar, perdés la forma de validar tus firmas.
                Con nosotros, recibís contenedores de protección (.ECO y .ECOX) autocontenidos. Podés verificarlos en nuestra web o con herramientas de código abierto, hoy y dentro de 10 años, sin depender de nuestros servidores.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-2xl font-bold text-black mb-4 flex items-center">
                <Anchor className="w-6 h-6 text-[#0E4B8B] mr-3" />
                2. Tres capas de protección
              </h3>
              <p className="text-gray-700 mb-4">
                Mientras otros solo ponen una firma digital, nosotros protegemos tu documento en tres capas:
              </p>
              <ul className="space-y-2 ml-6 text-gray-700">
                <li className="flex items-start">
                  <span className="font-semibold mr-2">• Criptografía:</span>
                  <span>Huella digital única verificable.</span>
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-2">• Tiempo:</span>
                  <span>Sello de tiempo verificable independiente.</span>
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-2">• Registro Público:</span>
                  <span>Registro público inalterable verificable.</span>
                </li>
              </ul>
              <p className="text-gray-700 mt-4">
                Tenés evidencia técnica sólida y verificable para demostrar quién firmó, cuándo y qué se firmó.
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
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Ambas te dan evidencia verificable. La diferencia está en el nivel de validez legal que necesitás.
          </p>
          <Link
            to="/login"
            className="inline-block bg-black hover:bg-gray-800 text-white font-semibold px-12 py-4 rounded-lg transition duration-300 text-lg"
          >
            Empezar Gratis
          </Link>
          <p className="text-xs text-gray-500 mt-3">
            Sin tarjeta · Plan gratuito · En minutos
          </p>
        </div>
      </section>

      <FooterPublic />
    </div>
  );
};

export default ComparisonPage;
