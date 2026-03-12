import { Link } from 'react-router-dom';
import Header from '../components/Header';
import FooterPublic from '../components/FooterPublic';
import PageTitle from '../components/PageTitle';
import { Shield, EyeOff, CheckCircle, FileCode2, Github } from 'lucide-react';

export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header variant="public" />
      
      <main className="flex-grow pt-16">
        <div className="max-w-3xl mx-auto px-4 pb-24">
          <PageTitle subtitle="Superficie tecnica publica para auditar privacidad, evidencia y verificacion. Mostramos lo necesario para validar el sistema sin exponer componentes internos sensibles.">
            Whitepaper Tecnico Publico
          </PageTitle>

          <section className="mt-8 mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-[#0A66C2]" />
              <h2 className="text-2xl font-bold text-black">Transparencia tecnica con limites claros</h2>
            </div>
            <p className="text-lg text-gray-700 mb-4">
              Este espacio esta pensado para equipos tecnicos, auditores y seguridad.
              El objetivo es simple: permitir verificacion independiente sin regalar
              detalles internos que comprometan seguridad operativa.
            </p>
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div className="rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-black mb-3">Lo que si publicamos</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Estructura publica de ECO y ECOX.</li>
                  <li>• Contratos de salida y estados observables.</li>
                  <li>• Modelo publico de verificacion.</li>
                  <li>• Integraciones publicas de referencia.</li>
                </ul>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                <h3 className="text-lg font-semibold text-black mb-3">Lo que no publicamos</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Algoritmos internos sensibles.</li>
                  <li>• Heuristicas y parametros privados.</li>
                  <li>• Componentes internos de seguridad en evolucion.</li>
                  <li>• Detalles que afecten seguridad operativa.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <EyeOff className="w-8 h-8 text-[#0A66C2]" />
              <h2 className="text-3xl font-bold text-black">Que puede validar un tecnico hoy</h2>
            </div>
            <ul className="space-y-3 text-gray-700">
              <li>• Que el modelo trabaja sobre huella del documento y evidencia, no sobre lectura de contenido.</li>
              <li>• Que la evidencia mantiene continuidad observable durante el flujo.</li>
              <li>• Que el resultado puede verificarse de forma independiente.</li>
              <li>• Que la estructura ECO/ECOX expone campos publicos auditables.</li>
              <li>• Que existen rutas publicas para integracion y consumo de contratos.</li>
            </ul>
          </section>

          <section className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <FileCode2 className="w-8 h-8 text-[#0A66C2]" />
              <h2 className="text-3xl font-bold text-black">Repositorio tecnico publico</h2>
            </div>
            <div className="space-y-4">
              <a
                href="https://github.com/TemporalDynamics/ecosign/blob/main/docs/public/HOW_IT_WORKS_TECHNICAL.md"
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-gray-200 p-5 hover:border-gray-400 transition"
              >
                <p className="font-semibold text-black">How it works (technical)</p>
                <p className="text-gray-700 text-sm mt-1">
                  Narrativa tecnica completa con referencias de codigo publico.
                </p>
              </a>
              <a
                href="https://github.com/TemporalDynamics/ecosign/tree/main/docs/public"
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-gray-200 p-5 hover:border-gray-400 transition"
              >
                <p className="font-semibold text-black">docs/public</p>
                <p className="text-gray-700 text-sm mt-1">
                  Hub principal de documentacion tecnica publica y contratos no sensibles.
                </p>
              </a>
              <a
                href="https://github.com/TemporalDynamics/ecosign/blob/main/docs/public/EPI_PUBLIC_SPEC.md"
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-gray-200 p-5 hover:border-gray-400 transition"
              >
                <p className="font-semibold text-black">EPI Public Spec</p>
                <p className="text-gray-700 text-sm mt-1">
                  Garantias publicas de estados deterministas y consistencia verificable.
                </p>
              </a>
              <a
                href="https://github.com/TemporalDynamics/ecosign/tree/main/packages/eco-packer-public"
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-gray-200 p-5 hover:border-gray-400 transition"
              >
                <p className="font-semibold text-black">eco-packer-public</p>
                <p className="text-gray-700 text-sm mt-1">
                  Superficie publica para integracion: tipos, contratos y stubs auditables.
                </p>
              </a>
            </div>
          </section>

          <section className="mb-8 rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-[#0A66C2]" />
              <p className="font-semibold text-black">Resumen operativo</p>
            </div>
            <p className="text-gray-700">
              EcoSign publica una superficie tecnica suficiente para auditar promesas de privacidad y verificacion.
              La implementacion interna del motor permanece reservada por seguridad.
            </p>
          </section>

          <section className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-6">
            <p className="text-sm text-gray-700">
              Nota: algunos componentes del sistema estan en proceso de registro de derechos intelectuales.
              Durante ese proceso, publicamos solo la superficie tecnica necesaria para auditoria externa.
            </p>
          </section>

          <div className="text-center pt-8 border-t border-gray-200">
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href="https://github.com/TemporalDynamics/ecosign/tree/main/docs/public"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-lg font-semibold hover:bg-gray-800 transition"
              >
                <Github className="w-4 h-4" />
                Abrir GitHub tecnico
              </a>
              <Link
                to="/how-it-works"
                className="inline-block border border-gray-300 text-gray-800 px-8 py-4 rounded-lg font-semibold hover:border-black hover:text-black transition"
              >
                Volver a Como funciona
              </Link>
            </div>
          </div>
        </div>
      </main>

      <FooterPublic />
    </div>
  );
}
