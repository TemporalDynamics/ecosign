import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardNav from '../components/DashboardNav';
import FooterInternal from '../components/FooterInternal';
import { useLegalCenter } from '../contexts/LegalCenterContext';

function DashboardStartPage() {
  const navigate = useNavigate();
  const { open: openLegalCenter } = useLegalCenter();
  const handleLogout = () => navigate('/');

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-cyan-50 to-blue-50 flex flex-col">
      <DashboardNav onLogout={handleLogout} />
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 pb-24 space-y-12">
        <section className="text-center bg-white/80 rounded-3xl p-10 shadow-lg border border-black100">
          <p className="text-black font-semibold tracking-[0.2em] uppercase mb-4">workspace</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">Tu centro de firma y certificación</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-8">
            Desde acá podés firmar, certificar, compartir bajo NDA y verificar tus documentos de forma segura. Elegí una acción para continuar.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-12">
            <button
              onClick={() => openLegalCenter('certify')}
              className="bg-gradient-to-r from-black to-gray-800 text-white font-semibold px-8 py-3 rounded-xl shadow hover:shadow-lg transition text-center"
            >
              Certificar Documento
            </button>
            <button
              onClick={() => openLegalCenter('sign')}
              className="bg-white border-2 border-gray-200 text-gray-700 hover:border-black600 hover:text-black font-semibold px-8 py-3 rounded-xl shadow-sm transition text-center"
            >
              Firmar un Documento
            </button>
            <button
              onClick={() => openLegalCenter('workflow')}
              className="bg-white border-2 border-gray-200 text-gray-700 hover:border-black600 hover:text-black font-semibold px-8 py-3 rounded-xl shadow-sm transition text-center"
            >
              Crear Flujo de Firmas
            </button>
            <button
              onClick={() => openLegalCenter('nda')}
              className="bg-white border-2 border-gray-200 text-gray-700 hover:border-black600 hover:text-black font-semibold px-8 py-3 rounded-xl shadow-sm transition text-center"
            >
              Enviar NDA
            </button>
          </div>
        </section>

        {/* Explicaciones centradas (fuera del panel blanco) */}
        <section className="max-w-2xl mx-auto space-y-8 text-center">
          <p className="text-sm text-gray-500 font-medium mb-6">
            ¿No estás seguro por dónde empezar?
          </p>

            {/* Certificar */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-gray-400 text-sm">🛡️</span>
                <h3 className="text-base font-semibold text-gray-900">Certificar documento</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Protegé la integridad y trazabilidad legal de un archivo, incluso sin firmarlo.
              </p>
            </div>

            {/* Firmar */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-gray-400 text-sm">✍️</span>
                <h3 className="text-base font-semibold text-gray-900">Firmar documento</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Firmá un documento y dejá constancia verificable de quién firmó, cuándo y cómo.
              </p>
            </div>

            {/* Flujo de firmas */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-gray-400 text-sm">👥</span>
                <h3 className="text-base font-semibold text-gray-900">Crear flujo de firmas</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Enviá un documento a una o más personas y registrá todo el proceso de firma.
              </p>
            </div>

            {/* NDA */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-gray-400 text-sm">📄</span>
                <h3 className="text-base font-semibold text-gray-900">Enviar NDA</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Compartí un documento bajo acuerdo de confidencialidad, con evidencia verificable.
              </p>
            </div>

          {/* Mensaje de cierre (variante corta) */}
          <div className="pt-6 border-t border-gray-200 mt-10">
            <p className="text-sm text-gray-700 leading-relaxed">
              <strong className="font-semibold text-gray-900">No son caminos separados.</strong><br />
              Todas las acciones se pueden combinar en un mismo proceso.
            </p>
          </div>
        </section>
      </main>

      <FooterInternal />
    </div>
  );
}

export default DashboardStartPage;
