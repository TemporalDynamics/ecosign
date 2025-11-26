import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, Lock, CheckCircle, Upload, Link as LinkIcon, Eye, Anchor, Clock, Users, Play } from 'lucide-react';
import { useVideoPlayer } from '../contexts/VideoPlayerContext';
import FooterPublic from '../components/FooterPublic';

const BusinessPage = () => {
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
            EcoSign para Empresas
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto mb-4 leading-relaxed font-bold">
            Firma, Certificación y Control Corporativo sin Límites ni Exposición.
          </p>
          <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto mb-12 leading-relaxed">
            Detené los sobrecostos y la fricción operacional. EcoSign te permite certificar el 95% de tus documentos internos y B2B con una seguridad forense superior y un modelo de costo predecible.
          </p>
        </div>
      </header>

      {/* Sección 2: Los Riesgos Ocultos del E-Signing Tradicional */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
            Los Riesgos Ocultos del E-Signing Tradicional
          </h2>

          <div className="space-y-6">
            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Riesgo de Exposición de Datos (Ciberseguridad)</h3>
              <p className="text-gray-700">Información sensible (acuerdos con proveedores, RR.HH.) alojada en nubes de terceros, fuera de tu control de compliance.</p>
            </div>

            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Costos Operacionales Disparados</h3>
              <p className="text-gray-700">Sobrecostos que se acumulan con cada uso o límite de "sobres", interrumpiendo el flujo de trabajo justo cuando más lo necesitás.</p>
            </div>

            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Cuellos de Botella en Procesos</h3>
              <p className="text-gray-700">Documentos internos clave (Órdenes de Compra, Autorizaciones) que demoran días en ser firmados y auditados.</p>
            </div>

            <div className="p-6 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-xl font-semibold text-black mb-3">Auditorías Complejas y Dependientes</h3>
              <p className="text-gray-700">Procesos engorrosos para verificar documentos cuya validez depende del acceso constante a la plataforma del proveedor.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sección 3: EcoSign Resuelve */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
            EcoSign: Control, Privacidad y Eficiencia Inigualable
          </h2>

          <div className="bg-blue-50 rounded-xl p-8">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300 border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 min-w-[200px]">Beneficio Corporativo</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900">¿Cómo lo logramos?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-4 px-4 text-sm font-medium text-gray-900">Privacidad Total (Zero Knowledge)</td>
                    <td className="py-4 px-4 text-sm text-gray-700">Tu documento NUNCA toca nuestros servidores. Mantené el control absoluto de tus archivos más sensibles dentro de tu entorno.</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="py-4 px-4 text-sm font-medium text-gray-900">Costo Fijo y Crecimiento Ilimitado</td>
                    <td className="py-4 px-4 text-sm text-gray-700">Costo casi Cero. Firmas ilimitadas sin límites ni costos extras. Tu presupuesto es fijo, tu productividad no.</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 text-sm font-medium text-gray-900">Auditoría Simple y Portable</td>
                    <td className="py-4 px-4 text-sm text-gray-700">Registros forenses claros (.ECO) que contienen toda la evidencia. Verificable para siempre, sin depender de nosotros.</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="py-4 px-4 text-sm font-medium text-gray-900">Certificación Instantánea</td>
                    <td className="py-4 px-4 text-sm text-gray-700">Procesos internos (órdenes, autorizaciones) validados y sellados con Hash y Sello de Tiempo en segundos, no días.</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 text-sm font-medium text-gray-900">Menos Riesgo, Más Control</td>
                    <td className="py-4 px-4 text-sm text-gray-700">Blindamos tus documentos con tecnología Blockchain y te damos la certeza de que tu evidencia es inmutable y tuya.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Sección 4: Usos Estratégicos dentro de la Empresa */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
            Usos Ideales: De RR.HH. a Supply Chain
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-blue-50 p-8 rounded-xl">
              <h3 className="text-2xl font-bold text-black mb-4 text-center">Recursos Humanos (RR.HH.):</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span>Contratos, autorizaciones de vacaciones</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span>Documentos laborales</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span>Políticas internas firmadas</span>
                </li>
              </ul>
            </div>

            <div className="bg-gray-100 p-8 rounded-xl">
              <h3 className="text-2xl font-bold text-black mb-4 text-center">Compras y Finanzas:</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span>Órdenes de compra</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span>Documentos comerciales con validación inmediata</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span>Acuerdos de distribución</span>
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 p-8 rounded-xl">
              <h3 className="text-2xl font-bold text-black mb-4 text-center">Compliance y Legal:</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span>Políticas internas firmadas</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span>NDAs de equipo y terceros (con confidencialidad garantizada)</span>
                </li>
              </ul>
            </div>

            <div className="bg-gray-100 p-8 rounded-xl">
              <h3 className="text-2xl font-bold text-black mb-4 text-center">Acuerdos con Proveedores:</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span>Documentos de colaboración y contratación</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5 mr-2" />
                  <span>Donde la trazabilidad es vital</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Sección 5: La Dualidad de la Seguridad Legal */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
            Ambas opciones en tu flujo de trabajo
          </h2>

          <div className="bg-white p-8 rounded-xl shadow-sm">
            <p className="text-xl text-gray-700 mb-4 text-center">
              <strong>EcoSign</strong> es ideal para la inmensa mayoría de documentos donde necesitás eficiencia, costo fijo y privacidad.
            </p>
            <p className="text-xl text-gray-700 mb-6 text-center">
              <strong>¿Cuándo usar LegalSign (API SignNow)?</strong>
            </p>
            <p className="text-xl text-gray-700 mb-4 text-center">
              Para aquellos procesos críticos que legalmente requieren una firma legal corporativa certificada por un proveedor externo, como acuerdos de alta exposición o licitaciones que exigen ese nivel.
            </p>
            <p className="text-xl font-semibold text-black text-center">
              EcoSign te ofrece ambas opciones en el mismo flujo de trabajo, para que nunca tengas que cambiar de herramienta.
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

export default BusinessPage;