import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import DocumentList from '../components/DocumentList';
import DashboardNav from '../components/DashboardNav';
import CertificationFlow from '../components/CertificationFlow';

function DashboardPage() {
  const navigate = useNavigate();
  const [showCertificationFlow, setShowCertificationFlow] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'updatedAt', direction: 'desc' });

  const overviewStats = [
    { label: 'Documentos protegidos', value: '12', helper: '+2 esta semana' },
    { label: 'Accesos registrados', value: '47', helper: '+11 esta semana' },
    { label: 'NDA firmados', value: '34', helper: '5 pendientes' },
    { label: 'Legal timestamps', value: '9', helper: 'RFC 3161 activos' }
  ];

  const certificationRows = [
    {
      fileName: 'Contrato NDA - NeoTech.pdf',
      updatedAt: '2025-11-14T12:30:00Z',
      nda: true,
      legal: true,
      concept: 'Pitch confidencial'
    },
    {
      fileName: 'Demo Producto V2.mp4',
      updatedAt: '2025-11-13T09:15:00Z',
      nda: false,
      legal: false,
      concept: 'Entrega beta'
    },
    {
      fileName: 'Informe IP - Laboratorio A.docx',
      updatedAt: '2025-11-12T18:05:00Z',
      nda: true,
      legal: true,
      concept: 'I+D conjunto'
    },
    {
      fileName: 'Manual Usuario 1.3.pdf',
      updatedAt: '2025-11-10T07:55:00Z',
      nda: false,
      legal: false,
      concept: 'Documentación pública'
    }
  ];

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
  }, [sortConfig]);

  const requestSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-cyan-50">
      <DashboardNav onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Section */}
        <section className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl p-8 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Bienvenido a VerifySign</h2>
              <p className="text-cyan-50 text-lg max-w-2xl">
                Sellá tus documentos, controla cada NDA y verifica tus certificados sin salir del panel. Todo queda registrado en tu archivo .ECO.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowCertificationFlow(true)}
                className="bg-white hover:bg-gray-100 text-cyan-700 font-bold py-3 px-8 rounded-xl shadow-md transition duration-300"
              >
                + Certificar documento
              </button>
              <button
                onClick={() => navigate('/dashboard/verify')}
                className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-cyan-700 font-bold py-3 px-8 rounded-xl transition duration-300"
              >
                Verificar un .ECO
              </button>
            </div>
          </div>
        </section>

        {/* Dashboard Stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {overviewStats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col justify-between min-h-[140px]">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{stat.label}</p>
              <div>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-1">{stat.helper}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Certification Overview */}
        <section className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div>
              <p className="text-sm uppercase tracking-widest text-cyan-600 font-semibold">Panel de certificaciones</p>
              <h3 className="text-2xl font-bold text-gray-900">Estado de tus .ECO</h3>
              <p className="text-sm text-gray-500">Se actualiza automáticamente a medida que generás certificados</p>
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
                  <th className="py-3 pr-4">NDA</th>
                  <th className="py-3 pr-4">Concepto</th>
                  <th className="py-3">Legal</th>
                </tr>
              </thead>
              <tbody>
                {sortedCertificationRows.map((row) => (
                  <tr key={row.fileName} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium text-gray-900">{row.fileName}</td>
                    <td className="py-3 pr-4">{new Date(row.updatedAt).toLocaleString()}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${row.nda ? 'bg-cyan-50 text-cyan-700' : 'bg-gray-100 text-gray-600'}`}>
                        {row.nda ? 'Sí, con NDA' : 'No requiere'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{row.concept}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${row.legal ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        {row.legal ? 'RFC 3161' : 'Timestamp estándar'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>


        {/* Recent Activity */}
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Actividad Reciente</h2>
          <div className="space-y-4">
            <div className="border border-gray-200 p-4 rounded-lg hover:bg-gray-50 transition duration-200">
              <div className="text-sm text-cyan-600 font-medium mb-1">Hoy, 10:30 AM</div>
              <p className="text-gray-700">Documento "Proyecto Alpha" firmado por juan@empresa.com</p>
            </div>
            <div className="border border-gray-200 p-4 rounded-lg hover:bg-gray-50 transition duration-200">
              <div className="text-sm text-cyan-600 font-medium mb-1">Ayer, 3:45 PM</div>
              <p className="text-gray-700">Enlace seguro creado para "Informe Confidencial"</p>
            </div>
            <div className="border border-gray-200 p-4 rounded-lg hover:bg-gray-50 transition duration-200">
              <div className="text-sm text-cyan-600 font-medium mb-1">12 Nov, 9:15 AM</div>
              <p className="text-gray-700">Nuevo certificado .ECO generado para contrato</p>
            </div>
          </div>
        </section>

        {/* Document List */}
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Documentos Recientes</h2>
            <button className="text-cyan-600 hover:text-cyan-700 font-medium text-sm">
              Ver todos →
            </button>
          </div>
          <DocumentList />
        </section>
      </main>

      <footer className="bg-gray-50 border-t border-gray-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 text-sm">© 2025 VerifySign por Temporal Dynamics LLC. Todos los derechos reservados.</p>
        </div>
      </footer>

      {showCertificationFlow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <CertificationFlow onClose={() => setShowCertificationFlow(false)} />
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
