import { getSupabase } from './supabaseClient';

type StartPresentialSessionInput = {
  operationId: string;
  witnessEmails?: string[];
};

export type StartPresentialSessionResult = {
  sessionId: string;
  qrCode: string | null;
  snapshotHash: string;
  expiresAt: string;
  signersNotified: number;
  witnessesNotified: number;
  participantsNotified: number;
};

type ConfirmPresentialInput = {
  sessionId: string;
  snapshotHash: string;
  otp: string;
  participantId?: string;
  participantToken?: string;
};

export type ConfirmPresentialResult = {
  success: boolean;
  status: string;
  sessionId: string;
  participantId?: string;
  role?: string;
  signerId?: string | null;
  confirmedAt?: string;
  attestationHash?: string;
};

type SupabaseFunctionErrorPayload = {
  error?: string;
  details?: unknown;
  message?: string;
};

function normalizeWitnessEmails(input?: string[]): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of input) {
    const email = String(item || '').trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

function resolveFunctionErrorMessage(
  invocationError: { message?: string } | null,
  payload: unknown,
  fallback: string,
) {
  const body = (payload ?? {}) as SupabaseFunctionErrorPayload;
  return String(body.error || body.message || invocationError?.message || fallback);
}

export async function startPresentialVerificationSession(
  input: StartPresentialSessionInput,
): Promise<StartPresentialSessionResult> {
  const supabase = getSupabase();
  const witnessEmails = normalizeWitnessEmails(input.witnessEmails);

  const { data, error } = await supabase.functions.invoke(
    'presential-verification-start-session',
    {
      body: {
        operation_id: input.operationId,
        ...(witnessEmails.length > 0 ? { witness_emails: witnessEmails } : {}),
      },
    },
  );

  const payload = (data ?? {}) as Record<string, unknown>;
  if (error || payload.success !== true) {
    throw new Error(
      resolveFunctionErrorMessage(error, payload, 'No se pudo iniciar la sesión presencial.'),
    );
  }

  return {
    sessionId: String(payload.sessionId ?? ''),
    qrCode: typeof payload.qrCode === 'string' ? payload.qrCode : null,
    snapshotHash: String(payload.snapshotHash ?? ''),
    expiresAt: String(payload.expiresAt ?? ''),
    signersNotified: Number(payload.signersNotified ?? 0),
    witnessesNotified: Number(payload.witnessesNotified ?? 0),
    participantsNotified: Number(payload.participantsNotified ?? 0),
  };
}

export async function confirmPresentialVerificationPresence(
  input: ConfirmPresentialInput,
): Promise<ConfirmPresentialResult> {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke(
    'presential-verification-confirm-presence',
    {
      body: {
        session_id: input.sessionId,
        snapshot_hash: input.snapshotHash,
        participant_id: input.participantId,
        participant_token: input.participantToken,
        otp: input.otp,
        confirmation_method: 'otp',
      },
    },
  );

  const payload = (data ?? {}) as Record<string, unknown>;
  if (error || payload.success !== true) {
    throw new Error(
      resolveFunctionErrorMessage(error, payload, 'No se pudo confirmar la presencia.'),
    );
  }

  return {
    success: true,
    status: String(payload.status ?? 'confirmed'),
    sessionId: String(payload.sessionId ?? ''),
    participantId:
      typeof payload.participantId === 'string'
        ? payload.participantId
        : undefined,
    role: typeof payload.role === 'string' ? payload.role : undefined,
    signerId: typeof payload.signerId === 'string' ? payload.signerId : null,
    confirmedAt:
      typeof payload.confirmedAt === 'string'
        ? payload.confirmedAt
        : undefined,
    attestationHash:
      typeof payload.attestationHash === 'string'
        ? payload.attestationHash
        : undefined,
  };
}
