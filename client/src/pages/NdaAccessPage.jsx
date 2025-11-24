import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Shield, FileText, CheckCircle, AlertTriangle, Download, User, Clock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const NDA_TEXT = `
ACUERDO DE CONFIDENCIALIDAD (NDA)

Al acceder a este documento, usted acepta los siguientes términos:

1. DEFINICIÓN DE INFORMACIÓN CONFIDENCIAL
Toda la información contenida en el documento compartido, incluyendo pero no limitado a: datos técnicos, comerciales, financieros, estratégicos, creativos y cualquier otra información marcada como confidencial.

2. OBLIGACIONES DEL RECEPTOR
- Mantener estricta confidencialidad de la información recibida.
- No divulgar, copiar, distribuir o usar la información para fines distintos a los autorizados.
- No compartir el enlace de acceso con terceros.
- Proteger la información con el mismo cuidado que protege su propia información confidencial.

3. DURACIÓN
Las obligaciones de confidencialidad permanecerán vigentes por un período de 5 años desde la fecha de aceptación.

4. REGISTRO Y TRAZABILIDAD
VerifySign registra: fecha, hora, dirección IP, navegador y país desde donde se acepta este acuerdo. Esta información constituye evidencia digital de la aceptación.

5. JURISDICCIÓN
Este acuerdo se rige por las leyes aplicables y cualquier disputa será resuelta en los tribunales competentes.

Al hacer clic en "Acepto los términos", usted declara que ha leído, entendido y acepta quedar vinculado por los términos de este Acuerdo de Confidencialidad.
`;

function NdaAccessPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [linkData, setLinkData] = useState(null);
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [showNdaText, setShowNdaText] = useState(false);

  // Form state
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (token) {
      verifyAccess();
    }
  }, [token]);

  const verifyAccess = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call verify-access edge function
      const { data, error: funcError } = await supabase.functions.invoke('verify-access', {
        body: { token, event_type: 'view' }
      });

      if (funcError) {
        throw new Error(funcError.message || 'Error verificando acceso');
      }

      if (!data.valid) {
        setError(data.error || 'Enlace inválido o expirado');
        return;
      }

      setLinkData(data);

      // Check if NDA was already accepted
      if (data.nda_accepted) {
        setNdaAccepted(true);
      }

      // Pre-fill email if available
      if (data.recipient?.email) {
        setSignerEmail(data.recipient.email);
      }

    } catch (err) {
      console.error('Error verifying access:', err);
      setError(err.message || 'Error al verificar el enlace');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptNda = async () => {
    if (!signerName.trim() || !signerEmail.trim() || !termsAccepted) {
      setError('Por favor completa todos los campos y acepta los términos');
      return;
    }

    try {
      setAccepting(true);
      setError(null);

      // Call accept-nda edge function
      const { data, error: funcError } = await supabase.functions.invoke('accept-nda', {
        body: {
          recipient_id: linkData.recipient.id,
          signer_name: signerName.trim(),
          signer_email: signerEmail.trim()
        }
      });

      if (funcError) {
        throw new Error(funcError.message || 'Error al aceptar NDA');
      }

      if (!data.success) {
        throw new Error(data.error || 'Error al procesar la aceptación');
      }

      setNdaAccepted(true);

    } catch (err) {
      console.error('Error accepting NDA:', err);
      setError(err.message || 'Error al aceptar el NDA');
    } finally {
      setAccepting(false);
    }
  };

  const handleDownload = () => {
    // Log download event
    supabase.functions.invoke('verify-access', {
      body: { token, event_type: 'download' }
    }).catch(console.error);

    // TODO: Implementar descarga real del documento
    toast.info('Funcionalidad de descarga próximamente. El sistema registró tu acción.', {
      duration: 5000
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black600 mb-4"></div>
          <p className="text-gray-600">Verificando enlace de acceso...</p>
        </div>
      </div>
    );
  }

  if (error && !linkData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Enlace no válido</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            to="/"
            className="text-black hover:text-cyan-700 font-medium"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl font-bold text-gray-900">
              VerifySign
            </Link>
            <div className="text-sm text-gray-500">
              Acceso seguro a documento
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Document Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-black" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                {linkData?.document?.title || 'Documento confidencial'}
              </h1>
              <p className="text-gray-600 text-sm">
                {linkData?.document?.original_filename || 'Archivo certificado'}
              </p>
              {linkData?.expires_at && (
                <p className="text-amber-600 text-xs mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Expira: {new Date(linkData.expires_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* NDA Section */}
        {!ndaAccepted && linkData?.require_nda && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-amber-600" />
              <h2 className="text-lg font-bold text-gray-900">
                Acuerdo de Confidencialidad (NDA)
              </h2>
            </div>

            <p className="text-gray-600 mb-4">
              Para acceder a este documento, debes aceptar los términos de confidencialidad.
            </p>

            {/* NDA Text Toggle */}
            <div className="mb-6">
              <button
                onClick={() => setShowNdaText(!showNdaText)}
                className="text-black hover:text-cyan-700 font-medium text-sm"
              >
                {showNdaText ? 'Ocultar texto del NDA' : 'Leer texto completo del NDA'}
              </button>

              {showNdaText && (
                <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                    {NDA_TEXT}
                  </pre>
                </div>
              )}
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Tu nombre completo"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black500 focus:border-black500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black500 focus:border-black500"
                />
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="accept-terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 text-black border-gray-300 rounded focus:ring-black500"
                />
                <label htmlFor="accept-terms" className="text-sm text-gray-700">
                  He leído y acepto los términos del Acuerdo de Confidencialidad.
                  Entiendo que mi aceptación quedará registrada con mi IP, fecha y hora.
                </label>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                onClick={handleAcceptNda}
                disabled={accepting || !termsAccepted || !signerName || !signerEmail}
                className="w-full bg-black hover:bg-cyan-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {accepting ? 'Procesando...' : 'Acepto los términos del NDA'}
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              🔒 Tu aceptación se registra con firma digital para garantizar no-repudiación.
            </p>
          </div>
        )}

        {/* Access Granted */}
        {(ndaAccepted || !linkData?.require_nda) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Acceso autorizado
                </h2>
                <p className="text-sm text-gray-600">
                  {ndaAccepted ? 'NDA aceptado correctamente' : 'No requiere NDA'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 bg-black hover:bg-cyan-700 text-white font-semibold py-3 rounded-lg transition"
              >
                <Download className="w-5 h-5" />
                Descargar documento
              </button>

              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-50 transition"
              >
                <Shield className="w-5 h-5" />
                Descargar certificado .ECO
              </button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 font-medium mb-1">
                💡 ¿Querés guardar tus .ECO en la nube?
              </p>
              <p className="text-xs text-blue-700 mb-3">
                Creá tu cuenta gratis en VerifySign y tené acceso a tus certificados desde cualquier lugar.
              </p>
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Crear cuenta gratis →
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm">
            © 2025 VerifySign por Temporal Dynamics LLC
          </p>
        </div>
      </footer>
    </div>
  );
}

export default NdaAccessPage;
