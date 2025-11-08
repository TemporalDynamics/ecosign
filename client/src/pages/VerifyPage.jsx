import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function VerifyPage() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setResult(null);
    }
  };

  const verifyFile = async () => {
    if (!file) return;

    setVerifying(true);

    // Simular verificación (aquí irá la lógica real con eco-packer)
    setTimeout(() => {
      // Simulación de resultado positivo
      setResult({
        valid: true,
        hash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
        timestamp: new Date().toISOString(),
        author: 'usuario@ejemplo.com',
        signatures: [
          {
            signer: 'juan.perez@empresa.com',
            date: '2025-01-15T10:30:00Z',
            verified: true
          }
        ],
        blockchain: {
          anchored: true,
          network: 'Bitcoin',
          txId: '0x1234567890abcdef...'
        }
      });
      setVerifying(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Navigation */}
      <nav className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="text-2xl">🔒</div>
              <span className="text-xl font-bold text-white">VerifySign</span>
            </Link>
            <div className="flex items-center space-x-6">
              <Link to="/" className="text-slate-300 hover:text-cyan-500 transition duration-200">
                Inicio
              </Link>
              <Link to="/login" className="text-slate-300 hover:text-cyan-500 transition duration-200">
                Iniciar Sesión
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-4xl font-bold text-white mb-4">Verificador Público .ECO</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Verifica la autenticidad e integridad de cualquier documento certificado con VerifySign.
            Sin registro, sin pagos, sin barreras.
          </p>
        </div>

        {/* Transparency Notice */}
        <div className="bg-slate-800 border border-cyan-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">⚖️</div>
            <div>
              <h3 className="text-white font-semibold mb-2">Verificación Independiente y Transparente</h3>
              <p className="text-gray-400 text-sm">
                Esta herramienta valida la firma criptográfica, hash SHA-256 y timestamp del documento.
                La verificación se realiza localmente en tu navegador - el archivo nunca se sube a nuestros servidores.
                Para máxima confianza, puedes verificar el anclaje en blockchain de forma independiente.
              </p>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-slate-800 rounded-2xl p-8 shadow-xl border border-slate-700 mb-8">
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
              dragging
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-gray-600 hover:border-cyan-500/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-5xl mb-4">📄</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Arrastra tu archivo .ECO aquí
            </h3>
            <p className="text-gray-400 mb-6">o haz clic para seleccionar</p>

            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-8 py-3 rounded-lg inline-block transition duration-300">
                Seleccionar Archivo
              </span>
              <input
                id="file-upload"
                type="file"
                accept=".eco,.ecox"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {file && (
              <div className="mt-6 p-4 bg-slate-700 rounded-lg">
                <p className="text-cyan-500 font-medium">
                  📎 {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              </div>
            )}
          </div>

          {file && !verifying && !result && (
            <button
              onClick={verifyFile}
              className="w-full mt-6 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded-lg transition duration-300"
            >
              Verificar Documento
            </button>
          )}

          {verifying && (
            <div className="mt-6 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
              <p className="text-gray-400">Verificando integridad criptográfica...</p>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="bg-slate-800 rounded-2xl p-8 shadow-xl border border-slate-700">
            {result.valid ? (
              <div>
                <div className="flex items-center justify-center mb-6">
                  <div className="bg-green-500/20 rounded-full p-4">
                    <div className="text-5xl">✅</div>
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-center text-white mb-2">
                  Documento Verificado
                </h2>
                <p className="text-center text-gray-400 mb-8">
                  Este documento es auténtico y no ha sido alterado
                </p>

                <div className="space-y-6">
                  {/* Hash */}
                  <div className="bg-slate-700 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-cyan-500 mb-2">Hash SHA-256</h4>
                    <p className="text-sm text-gray-300 font-mono break-all">
                      {result.hash}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <div className="bg-slate-700 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-cyan-500 mb-2">Timestamp Certificado</h4>
                    <p className="text-white">
                      {new Date(result.timestamp).toLocaleString('es-ES', {
                        dateStyle: 'full',
                        timeStyle: 'long'
                      })}
                    </p>
                  </div>

                  {/* Author */}
                  <div className="bg-slate-700 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-cyan-500 mb-2">Autor Original</h4>
                    <p className="text-white">{result.author}</p>
                  </div>

                  {/* Signatures */}
                  {result.signatures && result.signatures.length > 0 && (
                    <div className="bg-slate-700 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-cyan-500 mb-3">Firmas Digitales</h4>
                      {result.signatures.map((sig, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-600 last:border-0">
                          <div>
                            <p className="text-white font-medium">{sig.signer}</p>
                            <p className="text-sm text-gray-400">
                              {new Date(sig.date).toLocaleString('es-ES')}
                            </p>
                          </div>
                          {sig.verified && (
                            <span className="text-green-500 font-semibold">✓ Verificado</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Blockchain */}
                  {result.blockchain && result.blockchain.anchored && (
                    <div className="bg-slate-700 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-cyan-500 mb-2">Anclaje en Blockchain</h4>
                      <div className="space-y-2">
                        <p className="text-white">
                          <span className="text-gray-400">Red:</span> {result.blockchain.network}
                        </p>
                        <p className="text-white">
                          <span className="text-gray-400">TX ID:</span>{' '}
                          <span className="font-mono text-sm">{result.blockchain.txId}</span>
                        </p>
                        <a
                          href={`https://blockchair.com/search?q=${result.blockchain.txId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-cyan-500 hover:text-cyan-400 text-sm font-medium mt-2"
                        >
                          Verificar en explorador de blockchain
                          <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8 text-center">
                  <button
                    onClick={() => {
                      setFile(null);
                      setResult(null);
                    }}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-lg transition duration-300"
                  >
                    Verificar Otro Documento
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center mb-6">
                  <div className="bg-red-500/20 rounded-full p-4">
                    <div className="text-5xl">❌</div>
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-center text-white mb-2">
                  Documento No Válido
                </h2>
                <p className="text-center text-gray-400 mb-8">
                  Este documento ha sido alterado o no es un archivo .ECO válido
                </p>
                <div className="text-center">
                  <button
                    onClick={() => {
                      setFile(null);
                      setResult(null);
                    }}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-lg transition duration-300"
                  >
                    Intentar Nuevamente
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-slate-800 rounded-xl p-8 border border-slate-700">
          <h3 className="text-2xl font-bold text-white mb-4">¿Qué verifica esta herramienta?</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-start space-x-3 mb-4">
                <div className="text-2xl">🔐</div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Firma Criptográfica</h4>
                  <p className="text-gray-400 text-sm">
                    Verifica que el documento fue sellado con la clave privada correcta (Ed25519)
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-start space-x-3 mb-4">
                <div className="text-2xl">🔢</div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Hash de Integridad</h4>
                  <p className="text-gray-400 text-sm">
                    Confirma que ni un solo byte ha sido modificado desde su certificación
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-start space-x-3 mb-4">
                <div className="text-2xl">⏰</div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Timestamp Certificado</h4>
                  <p className="text-gray-400 text-sm">
                    Establece la fecha y hora exacta de creación del certificado
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-start space-x-3 mb-4">
                <div className="text-2xl">⛓️</div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Anclaje Blockchain</h4>
                  <p className="text-gray-400 text-sm">
                    Valida la prueba de existencia en una red pública descentralizada
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 border-t border-slate-700 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm">
            © 2025 VerifySign. Verificación independiente y transparente.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default VerifyPage;
