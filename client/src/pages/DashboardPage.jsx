import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Upload, X, Info } from 'lucide-react';
import { certifyAndDownload } from '../lib/basicCertificationBrowser';
import DashboardNav from '../components/DashboardNav';

function DashboardPage() {
  const navigate = useNavigate();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [file, setFile] = useState(null);
  const [ndaRequired, setNdaRequired] = useState(true);
  const [useLegalTimestamp, setUseLegalTimestamp] = useState(false);
  const [certifying, setCertifying] = useState(false);
  const [certificationResult, setCertificationResult] = useState(null);
  const [error, setError] = useState(null);
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

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setCertificationResult(null);
    }
  };

  const handleCreateLink = async () => {
    if (!file) return;

    setCertifying(true);
    setError(null);
    setCertificationResult(null);

    try {
      console.log('🚀 Starting certification process...');

      // Get user email from Supabase if available
      // For now, we'll use a placeholder
      const options = {
        userEmail: 'user@verifysign.pro',
        userId: 'user-' + Date.now(),
        useLegalTimestamp: useLegalTimestamp // RFC 3161 if enabled
      };

      const result = await certifyAndDownload(file, options);

      console.log('✅ Certification complete!', result);

      setCertificationResult({
        fileName: result.fileName,
        hash: result.hash,
        timestamp: result.timestamp,
        ecoxFileName: result.downloadedFileName,
        fileSize: result.fileSize,
        ecoxSize: result.ecoxSize,
        publicKey: result.publicKey,
        legalTimestamp: result.legalTimestamp // Include legal timestamp info
      });

      // Don't close modal - show success message
    } catch (err) {
      console.error('❌ Certification failed:', err);
      setError(err.message || 'Error al certificar el documento');
    } finally {
      setCertifying(false);
    }
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
                onClick={() => setShowUploadModal(true)}
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
      </main>

      <footer className="bg-gray-50 border-t border-gray-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 text-sm">© 2025 VerifySign por Temporal Dynamics LLC. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Crear Certificado .ECO</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setFile(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition duration-200"
              >
                <X className="w-6 h-6" strokeWidth={2.5} />
              </button>
            </div>

            <div className="space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Documento a Certificar *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-cyan-500 transition duration-300 bg-gray-50">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-8 h-8 text-cyan-600" strokeWidth={2.5} />
                  </div>
                  <label htmlFor="file-input" className="cursor-pointer">
                    <span className="text-cyan-600 hover:text-cyan-700 font-semibold">
                      Haz clic para seleccionar
                    </span>
                    <span className="text-gray-600"> o arrastra tu archivo aquí</span>
                    <input
                      id="file-input"
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {file && (
                    <div className="mt-4 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                      <p className="text-cyan-700 font-medium">
                        ✓ {file.name} ({(file.size / 1024).toFixed(2)} KB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* NDA Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <h4 className="text-gray-900 font-semibold">Requiere NDA para acceso</h4>
                  <p className="text-sm text-gray-600">
                    Los receptores deberán firmar un acuerdo de confidencialidad
                  </p>
                </div>
                <button
                  onClick={() => setNdaRequired(!ndaRequired)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    ndaRequired ? 'bg-cyan-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      ndaRequired ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Legal Timestamp Toggle */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                <div>
                  <h4 className="text-gray-900 font-semibold flex items-center">
                    ⚖️ Timestamp con Validez Legal (RFC 3161)
                    <span className="ml-2 px-2 py-0.5 bg-green-600 text-white text-xs rounded-full font-bold">LEGAL</span>
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Timestamp certificado por Time Stamp Authority (TSA)
                  </p>
                  <p className="text-xs text-green-700 font-medium mt-1">
                    ✅ Validez legal en +100 países • Cumple estándar RFC 3161
                  </p>
                </div>
                <button
                  onClick={() => setUseLegalTimestamp(!useLegalTimestamp)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    useLegalTimestamp ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useLegalTimestamp ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 font-medium">⚠️ {error}</p>
                </div>
              )}

              {/* Success Message */}
              {certificationResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" strokeWidth={2.5} />
                    <h4 className="text-green-800 font-bold">✅ Certificado generado exitosamente!</h4>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Archivo:</span>
                      <span className="font-mono text-gray-900">{certificationResult.fileName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tamaño original:</span>
                      <span className="font-mono text-gray-900">{(certificationResult.fileSize / 1024).toFixed(2)} KB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tamaño .ecox:</span>
                      <span className="font-mono text-gray-900">{(certificationResult.ecoxSize / 1024).toFixed(2)} KB</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-gray-600">Hash SHA-256:</span>
                      <span className="font-mono text-xs text-gray-900 break-all max-w-[60%] text-right">{certificationResult.hash}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Timestamp:</span>
                      <span className="font-mono text-xs text-gray-900">{new Date(certificationResult.timestamp).toLocaleString()}</span>
                    </div>
                    {/* Legal Timestamp Info */}
                    {certificationResult.legalTimestamp && certificationResult.legalTimestamp.enabled && (
                      <div className="flex justify-between items-start bg-green-50 -mx-2 px-2 py-2 rounded">
                        <span className="text-green-700 font-semibold flex items-center">
                          ⚖️ Validez Legal:
                        </span>
                        <div className="text-right">
                          <span className="font-mono text-xs text-green-800 font-bold block">{certificationResult.legalTimestamp.standard}</span>
                          <span className="text-xs text-green-600">{certificationResult.legalTimestamp.tsa}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-start">
                      <span className="text-gray-600">Clave pública:</span>
                      <span className="font-mono text-xs text-gray-900 break-all max-w-[60%] text-right">{certificationResult.publicKey.substring(0, 40)}...</span>
                    </div>
                  </div>

                  {/* Legal timestamp badge */}
                  {certificationResult.legalTimestamp && certificationResult.legalTimestamp.enabled && (
                    <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded p-3 mt-3">
                      <p className="text-green-800 text-sm font-bold flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        ✅ Este certificado tiene VALIDEZ LEGAL internacional (RFC 3161)
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Timestamp certificado por TSA • Aceptado en +100 países
                      </p>
                    </div>
                  )}

                  <div className="bg-green-100 rounded p-3 mt-3">
                    <p className="text-green-800 text-sm font-medium">
                      📥 Descargado: <span className="font-mono">{certificationResult.ecoxFileName}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={handleCreateLink}
                  disabled={!file || certifying}
                  className={`flex-1 font-bold py-3 px-6 rounded-lg transition duration-300 ${
                    file && !certifying
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {certifying ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generando certificado...
                    </span>
                  ) : (
                    'Generar Certificado'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setFile(null);
                    setCertificationResult(null);
                    setError(null);
                  }}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition duration-300"
                >
                  {certificationResult ? 'Cerrar' : 'Cancelar'}
                </button>
              </div>

              {/* Info */}
              {!certificationResult && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 flex items-start">
                  <Info className="w-5 h-5 text-cyan-600 mr-3 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                  <p className="text-sm text-cyan-800">
                    <strong>Información:</strong> El documento se procesará localmente. Generaremos un hash SHA-256,
                    timestamp certificado y firma digital Ed25519. Opcionalmente, podemos anclar el hash en blockchain.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
