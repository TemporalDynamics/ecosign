import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Shield from 'lucide-react/dist/esm/icons/shield';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';

export default function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNDA, setShowNDA] = useState(false);
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [ndaCheckbox, setNdaCheckbox] = useState(false);
  const [invite, setInvite] = useState(null);
  const [document, setDocument] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuthAndInvite();
  }, [token]);

  async function checkAuthAndInvite() {
    try {
      // Check if user is logged in
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (!currentUser) {
        // Not logged in - show NDA first, then redirect to login
        setShowNDA(true);
        setLoading(false);
        return;
      }

      // User is logged in - verify access
      const { data: accessData, error: accessError } = await supabase.functions.invoke(
        'verify-invite-access',
        {
          body: { inviteToken: token }
        }
      );

      if (accessError) {
        if (accessError.message?.includes('NDA')) {
          setShowNDA(true);
          setLoading(false);
          return;
        }
        throw accessError;
      }

      if (!accessData.success) {
        if (accessData.needsNDA) {
          setShowNDA(true);
        } else if (accessData.needsLogin) {
          // Redirect to login with return URL
          navigate(`/login?returnTo=/invite/${token}`);
        } else {
          setError(accessData.error || 'Access denied');
        }
        setLoading(false);
        return;
      }

      // Access granted!
      setDocument(accessData.access.document);
      setInvite(accessData.access);
      setNdaAccepted(true);
      setLoading(false);

    } catch (err) {
      console.error('Error checking invite:', err);
      setError(err.message || 'Failed to verify invite');
      setLoading(false);
    }
  }

  async function handleAcceptNDA() {
    if (!ndaCheckbox) {
      toast.error('Debes aceptar los términos del NDA para continuar');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('accept-invite-nda', {
        body: {
          token,
          accepted: true
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to accept NDA');

      setNdaAccepted(true);
      setShowNDA(false);

      // Check if user is logged in
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        // Redirect to login
        navigate(`/login?returnTo=/invite/${token}`);
      } else {
        // Already logged in, verify access
        await checkAuthAndInvite();
      }

    } catch (err) {
      console.error('Error accepting NDA:', err);
      toast.error(err.message || 'Error al aceptar el NDA');
    } finally {
      setLoading(false);
    }
  }

  function downloadPDF() {
    if (document?.pdfUrl) {
      window.open(document.pdfUrl, '_blank');
    }
  }

  // Loading state
  if (loading && !showNDA) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-12 w-12 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verificando invitación...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invitación Inválida</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // NDA Modal
  if (showNDA && !ndaAccepted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-6">
            <Shield className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Acuerdo de Confidencialidad (NDA)
            </h2>
            <p className="text-gray-600">
              Debes aceptar este acuerdo antes de acceder al documento
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6 max-h-64 overflow-y-auto border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">ACUERDO DE NO DIVULGACIÓN</h3>

            <p className="text-sm text-gray-700 mb-3">
              Este Acuerdo de No Divulgación (el "Acuerdo") se celebra entre la parte que
              comparte el documento (el "Divulgador") y usted (el "Receptor").
            </p>

            <h4 className="font-semibold text-gray-900 text-sm mb-2">1. Información Confidencial</h4>
            <p className="text-sm text-gray-700 mb-3">
              El Receptor reconoce que toda la información contenida en el documento compartido,
              incluyendo pero no limitado a textos, imágenes, datos, análisis y cualquier otro
              material, constituye información confidencial y propietaria del Divulgador.
            </p>

            <h4 className="font-semibold text-gray-900 text-sm mb-2">2. Obligaciones del Receptor</h4>
            <p className="text-sm text-gray-700 mb-3">
              El Receptor se compromete a:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-700 mb-3 space-y-1">
              <li>Mantener la información en estricta confidencialidad</li>
              <li>No divulgar, copiar o distribuir el documento sin autorización expresa</li>
              <li>Utilizar la información únicamente para los fines autorizados</li>
              <li>No realizar ingeniería inversa ni análisis técnico no autorizado</li>
              <li>Proteger la información con el mismo grado de cuidado que protege su propia información confidencial</li>
            </ul>

            <h4 className="font-semibold text-gray-900 text-sm mb-2">3. Exclusiones</h4>
            <p className="text-sm text-gray-700 mb-3">
              Este acuerdo no aplica a información que: (a) es o se vuelve pública sin culpa del Receptor,
              (b) el Receptor puede demostrar que era de su conocimiento previo, o (c) se obtiene legalmente
              de terceros sin restricciones de confidencialidad.
            </p>

            <h4 className="font-semibold text-gray-900 text-sm mb-2">4. Duración</h4>
            <p className="text-sm text-gray-700 mb-3">
              Las obligaciones de confidencialidad permanecerán vigentes durante 5 años desde la
              fecha de aceptación de este acuerdo.
            </p>

            <h4 className="font-semibold text-gray-900 text-sm mb-2">5. Registro de Aceptación</h4>
            <p className="text-sm text-gray-700">
              Su aceptación quedará registrada junto con su dirección IP, fecha, hora y agente de usuario
              como evidencia legal vinculante de este acuerdo.
            </p>
          </div>

          <div className="mb-6">
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={ndaCheckbox}
                onChange={(e) => setNdaCheckbox(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-gray-300 text-black focus:ring-black"
              />
              <span className="ml-3 text-sm text-gray-700">
                He leído y acepto los términos del Acuerdo de No Divulgación. Entiendo que este acuerdo
                es legalmente vinculante y que mi aceptación quedará registrada con mi información de acceso.
              </span>
            </label>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleAcceptNDA}
              disabled={!ndaCheckbox || loading}
              className={`flex-1 px-6 py-3 rounded-lg text-white font-medium ${
                ndaCheckbox && !loading
                  ? 'bg-black hover:bg-gray-800'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {loading ? 'Procesando...' : 'Aceptar y Continuar'}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            Al aceptar, tu IP y datos de acceso serán registrados como evidencia de este acuerdo
          </p>
        </div>
      </div>
    );
  }

  // Document view (after NDA accepted and logged in)
  if (document && invite) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {/* Success header */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <div className="flex items-start">
              <CheckCircle className="h-12 w-12 text-green-500 mr-4 flex-shrink-0" />
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Acceso Autorizado
                </h1>
                <p className="text-gray-600 mb-4">
                  Has sido invitado como <strong>{invite.role === 'viewer' ? 'visualizador' : 'firmante'}</strong> de este documento.
                </p>
                {invite.role === 'viewer' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <AlertCircle className="h-4 w-4 inline mr-2" />
                      Tienes permiso de solo lectura. No puedes firmar este documento.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Document info */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center mb-6">
              <FileText className="h-8 w-8 text-gray-400 mr-3" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{document.name}</h2>
                <p className="text-sm text-gray-500">
                  Hash: <code className="text-xs">{document.hash?.substring(0, 16)}...</code>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Estado</label>
                <p className="text-gray-900">{document.overallStatus || document.status}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Fecha de creación</label>
                <p className="text-gray-900">
                  {new Date(document.createdAt).toLocaleDateString('es-AR')}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={downloadPDF}
                className="flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center justify-center"
              >
                <FileText className="h-5 w-5 mr-2" />
                Ver Documento PDF
              </button>

              {invite.role === 'signer' && invite.invite?.signerLinkId && (
                <button
                  onClick={() => navigate(`/sign/${invite.invite.signerLinkId}`)}
                  className="flex-1 px-6 py-3 border border-black text-black rounded-lg hover:bg-gray-50 flex items-center justify-center"
                >
                  <Shield className="h-5 w-5 mr-2" />
                  Firmar Documento
                </button>
              )}
            </div>
          </div>

          {/* NDA info */}
          <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Información del NDA</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p>NDA aceptado: {new Date(invite.invite.ndaAcceptedAt).toLocaleString('es-AR')}</p>
              <p>Acceso aceptado: {new Date(invite.invite.acceptedAt).toLocaleString('es-AR')}</p>
              <p>Expira: {new Date(invite.invite.expiresAt).toLocaleString('es-AR')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
