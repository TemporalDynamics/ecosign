import Header from '../components/Header';
import FooterPublic from '../components/FooterPublic';
import PageTitle from '../components/PageTitle';
import { Upload, FileCheck, Download, Shield } from 'lucide-react';

export default function QuickGuidePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header variant="public" />

      <main className="flex-grow pt-16">
        <div className="max-w-3xl mx-auto px-4 pb-24">
          <PageTitle subtitle="Cuatro pasos simples, sin vueltas tecnicas. Tu archivo nunca se expone.">
            Protege tu primer documento en 2 minutos
          </PageTitle>

          <div className="space-y-8 mt-8">
            <section className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-[#0A66C2] rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <div className="flex-grow">
                <h2 className="text-xl font-bold text-black mb-3">1. Subi tu archivo (sin subirlo realmente)</h2>
                <ul className="space-y-2 text-base text-gray-700">
                  <li>• Solo arrastras tu documento.</li>
                  <li>• Tu navegador genera una identificacion unica.</li>
                  <li>• La plataforma nunca ve tu archivo.</li>
                </ul>
              </div>
            </section>

            <section className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-[#0A66C2] rounded-full flex items-center justify-center">
                <FileCheck className="w-6 h-6 text-white" />
              </div>
              <div className="flex-grow">
                <h2 className="text-xl font-bold text-black mb-3">2. Elegi como queres firmar</h2>
                <ul className="space-y-2 text-base text-gray-700">
                  <li>• <strong>Firma Legal (ilimitada):</strong> ideal para flujos internos, NDAs y RRHH.</li>
                  <li>• <strong>Firma Certificada (pago por uso):</strong> para contratos que exigen certificacion oficial.</li>
                  <li>• <strong>Proteccion reforzada:</strong> suma sello de tiempo y registro inalterable.</li>
                </ul>
              </div>
            </section>

            <section className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-[#0A66C2] rounded-full flex items-center justify-center">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div className="flex-grow">
                <h2 className="text-xl font-bold text-black mb-3">3. Descarga tu PDF firmado + archivo .ECO</h2>
                <ul className="space-y-2 text-base text-gray-700">
                  <li>• El PDF queda firmado y listo para usar.</li>
                  <li>• El .ECO es tu respaldo con toda la evidencia.</li>
                  <li>• Guarda ambos y validalos cuando haga falta.</li>
                </ul>
              </div>
            </section>

            <section className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-[#0A66C2] rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="flex-grow">
                <h2 className="text-xl font-bold text-black mb-3">4. Verificacion universal</h2>
                <p className="text-base text-gray-700">
                  Carga el .ECO en el verificador publico y valida integridad y fecha en segundos.
                  <br />
                  Sin depender de nosotros. Sin costos extras.
                </p>
              </div>
            </section>
          </div>

          <div className="text-center mt-12 pt-8 border-t border-gray-200">
            <a href="/login" className="inline-block bg-black text-white px-8 py-4 rounded-lg font-semibold hover:bg-gray-800 transition">
              Proteger mi primer documento
            </a>
          </div>
        </div>
      </main>

      <FooterPublic />
    </div>
  );
}
