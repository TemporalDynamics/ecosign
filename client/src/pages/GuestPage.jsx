import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Info, Lock, Video } from 'lucide-react';
import { GuestProvider, useGuest } from '../contexts/GuestContext';
import { useVideoPlayer } from '../contexts/VideoPlayerContext';
import TooltipWrapper from '../components/TooltipWrapper';
import FooterInternal from '../components/FooterInternal';
import HeaderPublic from '../components/HeaderPublic'; // Usamos el header público

// --- Componente principal del Dashboard de Invitado ---
function GuestDashboard() {
  const navigate = useNavigate();
  const { documents } = useGuest();
  const { playVideo } = useVideoPlayer();
  const [sortConfig, setSortConfig] = useState({ key: 'updatedAt', direction: 'desc' });

  // Trigger para el video de demostración
  useEffect(() => {
    playVideo('/videos/ecosign_demo_tour.mp4', 'Tour de EcoSign');
  }, [playVideo]);

  // --- Datos y Lógica del Dashboard (simulados) ---
  const overviewStats = useMemo(() => [
    { label: 'Documentos en demo', value: documents.length.toString(), helper: 'Ejemplos precargados' },
    { label: 'Firmados legalmente', value: documents.filter(d => d.signnow_document_id).length.toString(), helper: 'Con SignNow' },
    { label: 'Legal timestamps', value: documents.filter(d => d.has_legal_timestamp).length.toString(), helper: 'RFC 3161' },
    { label: 'Anclajes Bitcoin', value: documents.filter(d => d.has_bitcoin_anchor).length.toString(), helper: 'En blockchain' }
  ], [documents]);

  const certificationRows = useMemo(() => documents.map(doc => ({
    id: doc.id,
    fileName: doc.document_name,
    updatedAt: doc.updated_at || doc.certified_at,
    hasSignNow: !!doc.signnow_document_id,
    concept: doc.notes || 'Documento certificado',
    legal: doc.has_legal_timestamp,
  })), [documents]);

  const sortedCertificationRows = useMemo(() => {
    const rows = [...certificationRows];
    rows.sort((a, b) => {
      if (sortConfig.key === 'fileName') {
        return sortConfig.direction === 'asc'
          ? a.fileName.localeCompare(b.fileName)
          : b.fileName.localeCompare(a.fileName);
      }
      if (sortConfig.key === 'updatedAt') {
        return sortConfig.direction === 'asc'
          ? new Date(a.updatedAt) - new Date(b.updatedAt)
          : new Date(b.updatedAt) - new Date(a.updatedAt);
      }
      return 0;
    });
    return rows;
  }, [certificationRows, sortConfig]);

  const requestSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // --- Renderizado del Componente ---
  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderPublic />

      {/* Banner de Modo Invitado */}
      <div className="bg-yellow-400 text-yellow-900 text-center py-2 px-4 font-semibold shadow-md">
        Estás en modo invitado – acceso de solo lectura.
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Sección de Bienvenida */}
        <section className="bg-gray-900 rounded-2xl p-8 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Explora EcoSign</h2>
              <p className="text-gray-300 text-lg max-w-2xl">
                Interactúa con datos de demostración para entender el poder de la certificación digital. Para certificar tus propios documentos, necesitas una cuenta.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <TooltipWrapper content="Regístrate para certificar tus propios documentos">
                <button
                  disabled
                  className="bg-white text-gray-900 font-bold py-3 px-8 rounded-xl shadow-md transition duration-300 opacity-50 cursor-not-allowed flex items-center gap-2"
                >
                  <Lock size={16} /> Certificar documento
                </button>
              </TooltipWrapper>
              <button
                onClick={() => navigate('/verify')}
                className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-gray-900 font-bold py-3 px-8 rounded-xl transition duration-300"
              >
                Verificar un .ECO
              </button>
            </div>
          </div>
        </section>

        {/* Estadísticas del Dashboard */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {overviewStats.map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col justify-between min-h-[140px]">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{stat.label}</p>
              <div>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-1">{stat.helper}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Vista General de Certificaciones */}
        <section className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Panel de Demostración</h3>
              <p className="text-sm text-gray-500">Estos son documentos de ejemplo. Puedes ordenarlos y explorarlos.</p>
            </div>
             <div className="flex items-center gap-2 text-sm text-gray-500">
              <Info className="w-4 h-4" />
              Haz clic en los encabezados para ordenar
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-gray-500 border-b">
                  <th className="py-3 pr-4">
                    <button onClick={() => requestSort('fileName')} className="inline-flex items-center gap-1 font-semibold text-gray-700">
                      Documento
                      <span className="text-xs text-gray-400">{sortConfig.key === 'fileName' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span>
                    </button>
                  </th>
                  <th className="py-3 pr-4">
                    <button onClick={() => requestSort('updatedAt')} className="inline-flex items-center gap-1 font-semibold text-gray-700">
                      Timestamp
                      <span className="text-xs text-gray-400">{sortConfig.key === 'updatedAt' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span>
                    </button>
                  </th>
                  <th className="py-3 pr-4">Firma</th>
                  <th className="py-3 pr-4">Concepto</th>
                  <th className="py-3">Legal</th>
                </tr>
              </thead>
              <tbody>
                {sortedCertificationRows.map(row => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium text-gray-900">{row.fileName}</td>
                    <td className="py-3 pr-4">{new Date(row.updatedAt).toLocaleString()}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${row.hasSignNow ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {row.hasSignNow ? 'SignNow' : 'Sin firma'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{row.concept}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${row.legal ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {row.legal ? 'RFC 3161' : 'Estándar'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CTA para Registrarse */}
        <section className="text-center bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">¿Listo para certificar tus propios documentos?</h3>
          <p className="text-gray-600 mb-6 max-w-xl mx-auto">Crea una cuenta gratuita para obtener acceso completo, certificar documentos ilimitados y asegurar tu propiedad intelectual.</p>
          <Link
            to="/login"
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition duration-300"
          >
            Crear Cuenta Gratuita
          </Link>
        </section>
      </main>

      <FooterInternal />
    </div>
  );
}

// --- Wrapper del Provider ---
function GuestPage() {
  return (
    <GuestProvider>
      <GuestDashboard />
    </GuestProvider>
  );
}

export default GuestPage;
