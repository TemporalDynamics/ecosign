import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  confirmPresentialVerificationPresence,
  getPresentialSessionPreview,
  type PresentialSessionPreviewResult,
} from '../lib/presentialVerificationService';

const inputClassName =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black';

export default function PresentialConfirmPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSessionId = searchParams.get('session_id') ?? '';
  const initialSnapshotHash = searchParams.get('snapshot_hash') ?? '';
  const initialParticipantToken = searchParams.get('participant_token') ?? '';

  const [sessionId, setSessionId] = useState(initialSessionId);
  const [snapshotHash, setSnapshotHash] = useState(initialSnapshotHash);
  const [participantToken, setParticipantToken] = useState(initialParticipantToken);
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PresentialSessionPreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [attestationHash, setAttestationHash] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const roleLabel = useMemo(() => {
    if (role === 'witness') return 'Testigo';
    if (role === 'signer') return 'Firmante';
    return 'Participante';
  }, [role]);

  const canSubmit = Boolean(sessionId.trim() && snapshotHash.trim() && otp.trim());

  useEffect(() => {
    const loadPreview = async () => {
      if (!sessionId || !snapshotHash || !participantToken) {
        setPreview(null);
        setPreviewError('Link incompleto. Usá el acceso que recibiste por email.');
        return;
      }
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const result = await getPresentialSessionPreview({
          sessionId: sessionId.trim(),
          snapshotHash: snapshotHash.trim(),
          participantToken: participantToken.trim(),
        });
        setPreview(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo cargar el contexto.';
        setPreviewError(message);
      } finally {
        setPreviewLoading(false);
      }
    };

    loadPreview();
  }, [sessionId, snapshotHash, participantToken]);

  const participantLabel = useMemo(() => {
    if (!preview?.participant?.email) return null;
    const roleText = preview.participant.role === 'witness' ? 'Testigo' : 'Firmante';
    return `${preview.participant.email} (${roleText})`;
  }, [preview]);

  const roleStatement = useMemo(() => {
    if (!preview?.participant?.role) return null;
    if (preview.participant.role === 'witness') {
      return {
        title: 'Tu rol: Testigo de sesion',
        copy:
          'No firmas el documento ni asumis obligaciones. Confirmas que reconoces al participante y que esta confirmacion corresponde a esta operacion.',
      };
    }
    return {
      title: 'Tu rol: Firmante',
      copy:
        'Confirmas tu presencia en esta sesion. Este paso refuerza la atribucion de tu firma sin cambiar el contenido del documento.',
    };
  }, [preview]);

  const legalCopy =
    'Este refuerzo mejora la atribucion de la firma, pero no sustituye formalidades especiales que puedan requerirse por ley.';

  const documentPreviewList = useMemo(() => {
    if (!preview?.documents?.length) return [];
    return preview.documents.map((doc) => ({
      name: doc.name || 'Documento',
      hash: doc.hash,
      shortHash: doc.hash && doc.hash.length > 10 ? `${doc.hash.slice(0, 6)}...${doc.hash.slice(-4)}` : doc.hash,
    }));
  }, [preview]);

  const handleConfirm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await confirmPresentialVerificationPresence({
        sessionId: sessionId.trim(),
        snapshotHash: snapshotHash.trim(),
        participantToken: participantToken.trim() || undefined,
        otp: otp.trim(),
      });

      setConfirmedAt(result.confirmedAt || new Date().toISOString());
      setAttestationHash(result.attestationHash || null);
      setRole(result.role || null);
      toast.success('Presencia confirmada correctamente.', { position: 'top-right' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo confirmar la presencia.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedAt) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">Presencia confirmada</h1>
          <p className="mt-2 text-sm text-gray-600">
            {roleLabel} validado en la sesión <span className="font-mono">{sessionId}</span>.
          </p>
          <div className="mt-4 space-y-1 rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
            <div>
              Fecha: <span className="font-medium">{new Date(confirmedAt).toLocaleString()}</span>
            </div>
            {attestationHash && (
              <div className="break-all">
                Attestation: <span className="font-mono">{attestationHash}</span>
              </div>
            )}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Ir al inicio
            </button>
            <Link
              to="/verify"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-black hover:text-black"
            >
              Verificador
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Respaldo de Firma</h1>
        <p className="mt-2 text-sm text-gray-600">
          Ingresá el OTP recibido por email para confirmar tu presencia.
        </p>

        <form onSubmit={handleConfirm} className="mt-6 space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            {previewLoading && <div>Cargando contexto...</div>}
            {!previewLoading && previewError && (
              <div className="text-red-600">{previewError}</div>
            )}
            {!previewLoading && !previewError && preview && (
              <div className="space-y-2">
                {participantLabel && (
                  <div>
                    <span className="font-semibold">Vos sos:</span> {participantLabel}
                  </div>
                )}
                <div>
                  <span className="font-semibold">Operacion:</span>{' '}
                  {preview.operationName ?? 'Operacion sin nombre'}
                </div>
                <div>
                  <span className="font-semibold">Documentos:</span>
                  <ul className="mt-2 space-y-1 text-xs text-gray-700">
                    {documentPreviewList.map((doc) => (
                      <li key={`${doc.name}-${doc.shortHash}`} className="flex items-center justify-between gap-2">
                        <span className="truncate">{doc.name}</span>
                        <span className="font-mono text-[11px] text-gray-500">{doc.shortHash}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {roleStatement && (
                  <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700">
                    <div className="font-semibold text-gray-900">{roleStatement.title}</div>
                    <div className="mt-1 text-gray-600">{roleStatement.copy}</div>
                    <div className="mt-2 text-[11px] text-gray-500">{legalCopy}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
              OTP
            </label>
            <input
              className={inputClassName}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Código de 6 dígitos"
              inputMode="numeric"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit || submitting || Boolean(previewError)}
            className="w-full rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {submitting ? 'Confirmando...' : 'Confirmar presencia'}
          </button>
        </form>
      </div>
    </div>
  );
}
