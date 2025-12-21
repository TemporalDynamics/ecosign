import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Shield, Clock, FileText, AlertTriangle, CheckCircle, Download, User, Mail, Building2, Briefcase, Lock } from 'lucide-react';
import { getSupabase } from '../lib/supabaseClient';
import { trackEvent } from '../lib/analytics';

type RecipientInfo = {
  id: string;
  email?: string;
  name?: string;
  company?: string;
  role?: string;
};

type LinkData = {
  valid?: boolean;
  error?: string;
  nda_accepted?: boolean;
  require_nda?: boolean;
  expires_at?: string;
  pdf_signed_url?: string | null;
  eco_signed_url?: string | null;
  nda_text?: string | null;
  recipient?: RecipientInfo;
  document?: {
    title?: string;
    original_filename?: string;
  };
};

const DEFAULT_NDA_TEXT = `
ACUERDO DE CONFIDENCIALIDAD (NDA)

Este documento fue compartido de forma privada a través de EcoSign.

Al continuar, aceptás mantener su contenido confidencial y no divulgarlo a terceros sin autorización del remitente.

Este acceso quedará registrado con fines de auditoría.
`.trim();

function NdaAccessPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [ecoUrl, setEcoUrl] = useState<string | null>(null);
  const [loadingAccess, setLoadingAccess] = useState(false);

  // Form state
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (token) {
      verifyAccess();
    }
  }, [token]);

  const applyAccessUrls = (data: LinkData) => {
    setPdfUrl(data.pdf_signed_url || null);
    setEcoUrl(data.eco_signed_url || null);
  };

  const verifyAccess = async () => {
    try {
      const supabase = getSupabase();
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

      setLinkData(data as LinkData);

      // Check if NDA was already accepted
      if (data.nda_accepted) {
        setNdaAccepted(true);
      }

      if (!data.require_nda || data.nda_accepted) {
        applyAccessUrls(data as LinkData);
      }

    } catch (err) {
      console.error('Error verifying access:', err);
      const message = err instanceof Error ? err.message : 'Error al verificar el enlace';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const refreshAccessUrls = async (eventType: 'view' | 'download') => {
    if (!token) return;
    try {
      const supabase = getSupabase();
      setLoadingAccess(true);
      const { data, error: funcError } = await supabase.functions.invoke('verify-access', {
        body: { token, event_type: eventType }
      });

      if (funcError) {
        throw new Error(funcError.message || 'Error verificando acceso');
      }

      if (!data.valid) {
        throw new Error(data.error || 'Enlace inválido o expirado');
      }

      applyAccessUrls(data as LinkData);
      setLinkData((prev) => (prev ? { ...prev, ...data } : data));
    } catch (err) {
      console.error('Error refreshing access URLs:', err);
    } finally {
      setLoadingAccess(false);
    }
  };

  const handleAcceptNda = async () => {
    if (!signerName.trim() || !signerEmail.trim() || !termsAccepted) {
      setError('Por favor completa todos los campos y acepta los términos');
      return;
    }

    if (!linkData?.recipient?.id) {
      setError("No se encontró el destinatario del enlace.");
      return;
    }

    try {
      const supabase = getSupabase();
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
      setLinkData((prev) => (prev ? { ...prev, nda_accepted: true } : prev));

      await refreshAccessUrls('view');

      // Track analytics
      trackEvent('nda_accepted', {
        recipientId: linkData.recipient.id,
        documentId: linkData.document?.id,
        documentTitle: linkData.document?.title,
        acceptanceId: data.acceptance_id,
        ndaHash: data.nda_hash
      });

    } catch (err) {
      console.error('Error accepting NDA:', err);
      const message = err instanceof Error ? err.message : 'Error al aceptar el NDA';
      setError(message);
    } finally {
      setAccepting(false);
    }
  };

  const handleDownload = async (kind: 'pdf' | 'eco') => {
    try {
      const supabase = getSupabase();
      setLoadingAccess(true);
      const { data, error: funcError } = await supabase.functions.invoke('verify-access', {
        body: { token, event_type: 'download' }
      });

      if (funcError) {
        throw new Error(funcError.message || 'Error verificando acceso');
      }

      if (!data.valid) {
        throw new Error(data.error || 'Enlace inválido o expirado');
      }

      const url = kind === 'pdf' ? data.pdf_signed_url : data.eco_signed_url;
      if (!url) {
        toast.error(kind === 'pdf' ? 'El PDF no está disponible para este enlace.' : 'El certificado no está disponible.');
        return;
      }

      const link = document.createElement('a');
      link.href = url;
      link.target = '_self';
      link.rel = 'noopener';
      if (kind === 'eco') {
        link.download = `${linkData?.document?.original_filename || 'documento'}`.replace(/\.[^/.]+$/, '.eco');
      }
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error logging download:', error);
      const message = error instanceof Error ? error.message : 'Error al registrar la descarga';
      toast.error(message);
    } finally {
      setLoadingAccess(false);
    }
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
              EcoSign
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
              Para acceder, aceptá el acuerdo de confidencialidad visible a continuación.
            </p>

            <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-72 overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {linkData?.nda_text || DEFAULT_NDA_TEXT}
              </pre>
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
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                />
                <label htmlFor="accept-terms" className="text-xs text-gray-700">
                  Acepto los términos del Acuerdo de Confidencialidad. Mi aceptación quedará registrada con fines de auditoría.
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
              🔒 Tu aceptación queda registrada con firma digital para no-repudiación.
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

            {pdfUrl ? (
              <div className="rounded-lg border border-gray-200 overflow-hidden mb-4">
                <iframe
                  title="Documento"
                  src={pdfUrl}
                  className="w-full h-96"
                />
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 mb-4">
                El documento no está disponible en este enlace. Podés descargar el certificado si está disponible.
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => handleDownload('pdf')}
                disabled={!pdfUrl || loadingAccess}
                className="w-full flex items-center justify-center gap-2 bg-black hover:bg-cyan-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                Descargar documento
              </button>

              <button
                onClick={() => handleDownload('eco')}
                disabled={!ecoUrl || loadingAccess}
                className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                Creá tu cuenta gratis en EcoSign. Los documentos quedan cifrados y ni nosotros ni los proveedores de nube pueden ver tu contenido.
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
            © 2025 EcoSign por Temporal Dynamics LLC
          </p>
        </div>
      </footer>
    </div>
  );
}

export default NdaAccessPage;
