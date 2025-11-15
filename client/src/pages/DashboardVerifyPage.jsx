import React, { useRef, useState } from 'react';
import { RefreshCw, FileCheck, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardNav from '../components/DashboardNav';
import { verifyEcoxFile } from '../lib/verificationService';
import VerificationSummary from '../components/VerificationSummary';

function DashboardVerifyPage() {
  const navigate = useNavigate();
  const handleLogout = () => navigate('/');
  const [certFile, setCertFile] = useState(null);
  const [originalFile, setOriginalFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const certInputRef = useRef(null);
  const originalInputRef = useRef(null);

  const handleVerify = async () => {
    if (!certFile) {
      setError('Selecciona un archivo .ECO para verificar');
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      const verification = await verifyEcoxFile(certFile, originalFile);
      setResult(verification);
    } catch (err) {
      setError(err.message || 'Error al verificar el certificado');
      setResult(null);
    } finally {
      setVerifying(false);
    }
  };

  const reset = () => {
    setCertFile(null);
    setOriginalFile(null);
    setResult(null);
    setError(null);
    if (certInputRef.current) certInputRef.current.value = '';
    if (originalInputRef.current) originalInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-cyan-50">
      <DashboardNav onLogout={handleLogout} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-200 flex items-center justify-center">
              <Search className="w-7 h-7 text-cyan-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Verificador interno</h1>
              <p className="text-sm text-gray-500">Tus certificados se procesan localmente; nada sale del navegador.</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Todo se procesa localmente en tu navegador, los archivos nunca salen de tu sesión.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Certificado .ECO *</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center bg-gray-50">
                <input ref={certInputRef} type="file" accept=".eco,.ecox,.json" onChange={(e) => { setCertFile(e.target.files[0] || null); setResult(null); setError(null); }} className="hidden" id="dashboard-page-eco" />
                <label htmlFor="dashboard-page-eco" className="cursor-pointer text-cyan-600 font-semibold">
                  {certFile ? certFile.name : 'Seleccionar archivo .ECO'}
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Archivo original (opcional)</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center bg-gray-50">
                <input ref={originalInputRef} type="file" onChange={(e) => { setOriginalFile(e.target.files[0] || null); setResult(null); setError(null); }} className="hidden" id="dashboard-page-original" />
                <label htmlFor="dashboard-page-original" className="cursor-pointer text-cyan-600 font-semibold">
                  {originalFile ? originalFile.name : 'Agregar archivo original'}
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={handleVerify} disabled={!certFile || verifying} className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold px-6 py-3 rounded-xl shadow-md disabled:opacity-50">
              {verifying ? <><RefreshCw className="w-4 h-4 animate-spin" /> Verificando...</> : <><FileCheck className="w-4 h-4" /> Verificar ahora</>}
            </button>
            <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-700">Limpiar campos</button>
          </div>

          {error && <div className="mt-4 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>}

          {result && (
            <VerificationSummary result={result} originalProvided={!!originalFile} />
          )}
        </section>
      </main>
    </div>
  );
}

export default DashboardVerifyPage;
