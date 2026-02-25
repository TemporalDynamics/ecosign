import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { confirmPresentialVerificationPresence } from '../lib/presentialVerificationService';

const inputClassName =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black';

export default function PresentialConfirmPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSessionId = searchParams.get('session_id') ?? '';
  const initialSnapshotHash = searchParams.get('snapshot_hash') ?? '';
  const initialParticipantId = searchParams.get('participant_id') ?? '';
  const initialParticipantToken = searchParams.get('participant_token') ?? '';

  const [sessionId, setSessionId] = useState(initialSessionId);
  const [snapshotHash, setSnapshotHash] = useState(initialSnapshotHash);
  const [participantId, setParticipantId] = useState(initialParticipantId);
  const [participantToken, setParticipantToken] = useState(initialParticipantToken);
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [attestationHash, setAttestationHash] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const roleLabel = useMemo(() => {
    if (role === 'witness') return 'Testigo';
    if (role === 'signer') return 'Firmante';
    return 'Participante';
  }, [role]);

  const canSubmit = Boolean(
    sessionId.trim() &&
      snapshotHash.trim() &&
      otp.trim(),
  );

  const handleConfirm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await confirmPresentialVerificationPresence({
        sessionId: sessionId.trim(),
        snapshotHash: snapshotHash.trim(),
        participantId: participantId.trim() || undefined,
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
        <h1 className="text-2xl font-semibold text-gray-900">Confirmar sesión probatoria</h1>
        <p className="mt-2 text-sm text-gray-600">
          Ingresá el OTP recibido por email para confirmar tu presencia.
        </p>

        <form onSubmit={handleConfirm} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
              Session ID
            </label>
            <input
              className={inputClassName}
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="PSV-XXXXXX"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
              Snapshot Hash
            </label>
            <input
              className={inputClassName}
              value={snapshotHash}
              onChange={(e) => setSnapshotHash(e.target.value)}
              placeholder="hash de sesión"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
              Participant ID
            </label>
            <input
              className={inputClassName}
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              placeholder="participant_id (del link)"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
              Participant Token
            </label>
            <input
              className={inputClassName}
              value={participantToken}
              onChange={(e) => setParticipantToken(e.target.value)}
              placeholder="token seguro (del link)"
            />
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
            disabled={!canSubmit || submitting}
            className="w-full rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {submitting ? 'Confirmando...' : 'Confirmar presencia'}
          </button>
        </form>
      </div>
    </div>
  );
}
