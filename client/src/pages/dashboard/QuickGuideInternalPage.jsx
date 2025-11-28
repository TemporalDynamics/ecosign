import React from 'react';
import DashboardNav from '../../components/DashboardNav';
import FooterInternal from '../../components/FooterInternal';
import PageTitle from '../../components/PageTitle';
import Upload from 'lucide-react/dist/esm/icons/upload';
import FileCheck from 'lucide-react/dist/esm/icons/file-check';
import Download from 'lucide-react/dist/esm/icons/download';
import Shield from 'lucide-react/dist/esm/icons/shield';

export default function QuickGuideInternalPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <DashboardNav />
      
      <main className="flex-grow pt-16">
        <div className="max-w-3xl mx-auto px-4 pb-24">
          <PageTitle subtitle="Empezá en menos de un minuto. Certificar y firmar documentos con EcoSign es simple, privado y sin fricción.">
            Guía Rápida de EcoSign
          </PageTitle>

          {/* Steps */}
          <div className="space-y-8 mt-8">
            {/* Step 1 */}
            <section className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-[#0A66C2] rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <div className="flex-grow">
                <h2 className="text-xl font-bold text-black mb-3">Cargá tu archivo (sin subirlo realmente)</h2>
                <ul className="space-y-2 text-base text-gray-700">
                  <li className="flex items-start gap-3">
                    <span className="text-[#0A66C2] mt-1">•</span>
                    <span>Solo arrastrás tu documento.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#0A66C2] mt-1">•</span>
                    <span>El hash (SHA-256) se calcula en tu navegador.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#0A66C2] mt-1">•</span>
                    <span>EcoSign nunca ve tu archivo.</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Step 2 */}
            <section className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-[#0A66C2] rounded-full flex items-center justify-center">
                <FileCheck className="w-6 h-6 text-white" />
              </div>
              <div className="flex-grow">
                <h2 className="text-xl font-bold text-black mb-3">Elegí cómo querés firmar</h2>
                <ul className="space-y-2 text-base text-gray-700">
                  <li className="flex items-start gap-3">
                    <span className="text-[#0A66C2] mt-1">•</span>
                    <span><strong>EcoSign Ilimitada:</strong> ideal para flujos internos, NDAs, RRHH y aprobaciones.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#0A66C2] mt-1">•</span>
                    <span><strong>Firma Legal (LegalSign):</strong> validez jurídica completa (eIDAS/ESIGN/UETA).</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#0A66C2] mt-1">•</span>
                    <span>Podés activar el <strong>Blindaje Forense</strong> para sumar timestamp legal + blockchain.</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Step 3 */}
            <section className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-[#0A66C2] rounded-full flex items-center justify-center">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div className="flex-grow">
                <h2 className="text-xl font-bold text-black mb-3">Descargá tu PDF firmado + archivo .ECO</h2>
                <ul className="space-y-2 text-base text-gray-700">
                  <li className="flex items-start gap-3">
                    <span className="text-[#0A66C2] mt-1">•</span>
                    <span>El PDF queda firmado.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#0A66C2] mt-1">•</span>
                    <span>El .ECO contiene toda la evidencia criptográfica.</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Step 4 */}
            <section className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-[#0A66C2] rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="flex-grow">
                <h2 className="text-xl font-bold text-black mb-3">Verificación universal</h2>
                <p className="text-base text-gray-700">
                  Cargá el .ECO en el verificador público y validá integridad y fecha en segundos.
                </p>
              </div>
            </section>
          </div>

          {/* CTA */}
          <div className="text-center mt-12 pt-8 border-t border-gray-200">
            <a
              href="/login"
              className="inline-block bg-black text-white px-8 py-4 rounded-lg font-semibold hover:bg-gray-800 transition"
            >
              Comenzar Ahora
            </a>
          </div>
        </div>
      </main>

      <FooterInternal />
    </div>
  );
}
