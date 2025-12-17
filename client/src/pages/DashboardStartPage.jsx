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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      </main>

      <FooterInternal />
    </div>
  );
}

export default DashboardStartPage;
