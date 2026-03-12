import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Mail, ShieldCheck } from 'lucide-react';
import { getSupabase } from '../lib/supabaseClient';

const RecoveryPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signerInfo, setSignerInfo] = useState<{
    signer_id: string;
    signer_email: string | null;
    signer_name: string | null;
    workflow_id: string;
    workflow_title: string | null;
    document_name: string;
  } | null>(null);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [claimStatus, setClaimStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [userReady, setUserReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const accessToken = token ?? '';

  const loadSigner = useCallback(async () => {
    if (!accessToken) {
      setError('Link inválido o incompleto.');
      setLoading(false);
      return;
    }
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.functions.invoke('signer-recovery-access', {
        body: { token: accessToken },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'No pudimos validar este link.');
      }

      setSignerInfo({
        signer_id: data.signer_id,
        signer_email: data.signer_email ?? null,
        signer_name: data.signer_name ?? null,
        workflow_id: data.workflow_id,
        workflow_title: data.workflow_title ?? null,
        document_name: data.document_name || 'Documento',
      });
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'No pudimos validar este link.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const sendOtp = useCallback(async () => {
    if (!signerInfo || !accessToken) return;
    setOtpSending(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.functions.invoke('send-signer-recovery-otp', {
        body: {
          signerId: signerInfo.signer_id,
          accessToken,
        },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'No pudimos enviar el OTP.');
      }
      setOtpSent(true);
    } catch (err: any) {
      setError(err?.message || 'No pudimos enviar el OTP.');
    } finally {
      setOtpSending(false);
    }
  }, [accessToken, signerInfo]);

  const verifyOtp = useCallback(async () => {
    if (!signerInfo || !accessToken || !otp.trim()) return;
    setOtpVerifying(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.functions.invoke('verify-signer-otp', {
        body: {
          signerId: signerInfo.signer_id,
          accessToken,
          otp: otp.trim(),
        },
      });
      if (error || !data?.success) {
        throw new Error(data?.message || data?.error || 'OTP inválido');
      }
      setOtpVerified(true);
    } catch (err: any) {
      setError(err?.message || 'OTP inválido');
    } finally {
      setOtpVerifying(false);
    }
  }, [accessToken, otp, signerInfo]);

  const downloadResource = useCallback(async (resource: 'pdf' | 'eco') => {
    if (!signerInfo || !accessToken) return;
    setDownloadError(null);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.functions.invoke('get-signer-recovery-url', {
        body: {
          signerId: signerInfo.signer_id,
          accessToken,
          resource,
        },
      });
      if (error || !data?.success || !data?.signed_url) {
        throw new Error(data?.error || error?.message || 'No se pudo generar la descarga');
      }
      const resp = await fetch(String(data.signed_url));
      if (!resp.ok) throw new Error('No se pudo descargar el archivo');
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const baseName = signerInfo.document_name || 'documento';
      if (resource === 'pdf') {
        link.download = baseName.toLowerCase().endsWith('.pdf') ? baseName : `${baseName}.pdf`;
      } else {
        link.download = baseName.toLowerCase().endsWith('.eco') ? baseName : `${baseName}.eco`;
      }
      link.target = '_self';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      setDownloadError(err?.message || 'No se pudo descargar el archivo.');
    }
  }, [accessToken, signerInfo]);

  const claimToAccount = useCallback(async () => {
    if (!signerInfo || !accessToken) return;
    setClaimStatus('saving');
    setClaimMessage(null);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.functions.invoke('claim-signer-package-recovery', {
        body: { signerId: signerInfo.signer_id, accessToken },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'No pudimos guardar la evidencia.');
      }
      setClaimStatus('saved');
      setClaimMessage('Evidencia guardada en tu cuenta.');
    } catch (err: any) {
      setClaimStatus('error');
      setClaimMessage(err?.message || 'No pudimos guardar la evidencia.');
    }
  }, [accessToken, signerInfo]);

  useEffect(() => {
    loadSigner();
  }, [loadSigner]);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = getSupabase();
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserReady(true);
        setUserEmail(data.user.email || null);
      } else {
        setUserReady(false);
        setUserEmail(null);
      }
    };
    checkUser();
  }, []);

  useEffect(() => {
    if (signerInfo && !otpSent) {
      sendOtp();
    }
  }, [signerInfo, otpSent, sendOtp]);

  const headerTitle = useMemo(() => signerInfo?.document_name || 'Documento', [signerInfo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-700">Cargando recuperación…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md bg-white border border-gray-200 rounded-xl p-6 text-center">
          <div className="text-red-600 font-semibold">No pudimos acceder a esta recuperación</div>
          <p className="text-sm text-gray-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-black text-white flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Recuperación de evidencia</h1>
            <p className="text-sm text-gray-600">Documento: {headerTitle}</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <Mail className="h-4 w-4" />
            Ingresá el código enviado a {signerInfo?.signer_email || 'tu correo'}
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Este acceso permite descargar tu PDF y la evidencia ECO de esta etapa.
          </p>
        </div>

        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Código OTP"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={verifyOtp}
            disabled={otpVerifying || !otp.trim()}
            className="rounded-lg bg-black text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {otpVerifying ? 'Verificando…' : 'Validar'}
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
          <span>{otpSent ? 'Código enviado' : 'Enviando código…'}</span>
          <button
            onClick={sendOtp}
            disabled={otpSending}
            className="text-gray-700 hover:text-gray-900 underline"
          >
            {otpSending ? 'Reenviando…' : 'Reenviar código'}
          </button>
        </div>

        {otpVerified && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-green-700 font-semibold">
              <CheckCircle className="h-4 w-4" />
              Acceso verificado
            </div>
            <button
              onClick={() => downloadResource('pdf')}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Descargar PDF de esta etapa
            </button>
            <button
              onClick={() => downloadResource('eco')}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Descargar evidencia ECO
            </button>
            {downloadError && <p className="text-xs text-red-600">{downloadError}</p>}

            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
              {userReady ? (
                <>
                  <div className="font-semibold">Guardar en tu cuenta</div>
                  <p className="mt-1">Esta evidencia quedará disponible en {userEmail || 'tu cuenta'}.</p>
                  <button
                    onClick={claimToAccount}
                    disabled={claimStatus === 'saving' || claimStatus === 'saved'}
                    className="mt-2 rounded-md bg-black text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  >
                    {claimStatus === 'saved' ? 'Guardado' : claimStatus === 'saving' ? 'Guardando…' : 'Guardar en mi cuenta'}
                  </button>
                  {claimMessage && <p className="mt-1 text-xs text-gray-600">{claimMessage}</p>}
                </>
              ) : (
                <>
                  <div className="font-semibold">Guardar en tu cuenta</div>
                  <p className="mt-1">Iniciá sesión o creá una cuenta gratuita para conservar esta evidencia.</p>
                  <div className="mt-2 flex gap-2">
                    <a href="/login?mode=login" className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                      Iniciar sesión
                    </a>
                    <a href="/login?mode=signup" className="rounded-md bg-black px-3 py-1.5 text-xs font-semibold text-white">
                      Crear cuenta
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecoveryPage;
