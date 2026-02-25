import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { appendEvent } from '../_shared/eventHelper.ts';
import { canonicalize, sha256Hex } from '../_shared/canonicalHash.ts';

interface ConfirmPresenceRequest {
  session_id: string;
  snapshot_hash: string;
  signer_id?: string;
  participant_id?: string;
  confirmation_method?: 'otp' | 'selfie' | 'dni';
  otp?: string;
}

type AuthUser = {
  id: string;
  email: string | null;
};

type SessionParticipantRole = 'signer' | 'witness';

type SnapshotParticipant = {
  participantId: string;
  signerId: string | null;
  email: string;
  role: SessionParticipantRole;
};

type TrenzaAttestation = {
  version: 'ecosign.nonrep.attestation.v1';
  attestation_hash: string;
  session_id: string;
  snapshot_hash: string;
  participant: {
    id: string;
    role: SessionParticipantRole;
    signer_id: string | null;
    email: string;
  };
  method: string;
  attested_at: string;
  proof: {
    otp_record_id: string;
    otp_attempt: number;
    auth_mode: 'supabase_user';
    auth_user_id: string;
    auth_email: string;
    user_agent: string | null;
  };
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MAX_OTP_ATTEMPTS = 5;

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRole(value: unknown): SessionParticipantRole {
  return value === 'witness' ? 'witness' : 'signer';
}

async function verifyAuthUser(authHeader: string | null): Promise<AuthUser | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}

async function getOrCreateIdentityBinding(supabase: any, email: string): Promise<string> {
  const normalizedEmail = normalizeEmail(email);

  const { data: existing } = await supabase
    .from('identity_bindings')
    .select('id')
    .eq('email', normalizedEmail)
    .single()
    .catch(() => ({ data: null }));

  if (existing?.id) {
    await supabase
      .from('identity_bindings')
      .update({ verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from('identity_bindings')
    .insert({ email: normalizedEmail, verified_at: new Date().toISOString() })
    .select('id')
    .single();

  if (error || !created?.id) {
    throw new Error(`Failed to create identity binding: ${error?.message ?? 'unknown'}`);
  }

  return created.id;
}

function buildSnapshotParticipants(snapshotData: any): SnapshotParticipant[] {
  const participantsRaw = Array.isArray(snapshotData?.participants)
    ? snapshotData.participants
    : [];

  if (participantsRaw.length > 0) {
    return participantsRaw
      .map((item: any) => {
        const email = normalizeEmail(item?.email);
        const participantId = String(item?.participantId ?? item?.signerId ?? '').trim();
        const signerId = item?.signerId ? String(item.signerId).trim() : null;
        return {
          participantId,
          signerId: signerId || null,
          email,
          role: normalizeRole(item?.role),
        } as SnapshotParticipant;
      })
      .filter((p: SnapshotParticipant) => Boolean(p.participantId) && Boolean(p.email));
  }

  const signersRaw = Array.isArray(snapshotData?.signers) ? snapshotData.signers : [];
  return signersRaw
    .map((item: any) => {
      const signerId = String(item?.signerId ?? '').trim();
      const email = normalizeEmail(item?.email);
      return {
        participantId: signerId,
        signerId: signerId || null,
        email,
        role: 'signer' as const,
      };
    })
    .filter((p: SnapshotParticipant) => Boolean(p.participantId) && Boolean(p.email));
}

function resolveParticipantFromSnapshot(
  participants: SnapshotParticipant[],
  authEmail: string,
  requestedParticipantId?: string,
  requestedSignerId?: string,
): SnapshotParticipant | null {
  const requested = (requestedParticipantId || requestedSignerId || '').trim();

  if (requested) {
    const byId = participants.find((p) => p.participantId === requested || p.signerId === requested);
    if (!byId) return null;
    if (normalizeEmail(byId.email) !== authEmail) return null;
    return byId;
  }

  return participants.find((p) => normalizeEmail(p.email) === authEmail) ?? null;
}

async function buildTrenzaAttestation(input: {
  sessionId: string;
  snapshotHash: string;
  participant: SnapshotParticipant;
  confirmationMethod: string;
  otpRecordId: string;
  otpAttempt: number;
  authUser: AuthUser;
  userAgent: string | null;
  attestedAt: string;
}): Promise<TrenzaAttestation> {
  const payload = {
    version: 'ecosign.nonrep.attestation.v1' as const,
    session_id: input.sessionId,
    snapshot_hash: input.snapshotHash,
    participant: {
      id: input.participant.participantId,
      role: input.participant.role,
      signer_id: input.participant.signerId,
      email: normalizeEmail(input.participant.email),
    },
    method: input.confirmationMethod,
    attested_at: input.attestedAt,
    proof: {
      otp_record_id: input.otpRecordId,
      otp_attempt: input.otpAttempt,
      auth_mode: 'supabase_user' as const,
      auth_user_id: input.authUser.id,
      auth_email: normalizeEmail(input.authUser.email),
      user_agent: input.userAgent,
    },
  };

  const attestationHash = await sha256Hex(canonicalize(payload));

  return {
    ...payload,
    attestation_hash: attestationHash,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204 });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const authUser = await verifyAuthUser(authHeader);

    if (!authUser) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const authEmail = normalizeEmail(authUser.email);
    if (!authEmail) {
      return jsonResponse({ error: 'Authenticated user has no email' }, 403);
    }

    const body = (await req.json().catch(() => ({}))) as Partial<ConfirmPresenceRequest>;
    const sessionId = String(body.session_id ?? '').trim();
    const snapshotHash = String(body.snapshot_hash ?? '').trim();
    const participantIdFromBody = body.participant_id?.trim();
    const signerIdFromBody = body.signer_id?.trim();
    const confirmationMethod = body.confirmation_method ?? 'otp';
    const otp = String(body.otp ?? '').trim();

    if (!sessionId || !snapshotHash) {
      return jsonResponse({ error: 'session_id and snapshot_hash required' }, 400);
    }

    if (confirmationMethod === 'otp' && !otp) {
      return jsonResponse({ error: 'OTP required' }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: session, error: sessionError } = await supabase
      .from('presential_verification_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (sessionError || !session) {
      return jsonResponse({ error: 'Session not found' }, 404);
    }

    const now = Date.now();
    const sessionExpiresAtMs = parseTimestamp(session.expires_at);

    if (session.status !== 'active') {
      return jsonResponse({ error: 'Session not active' }, 400);
    }

    if (sessionExpiresAtMs !== null && sessionExpiresAtMs < now) {
      await supabase
        .from('presential_verification_sessions')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', session.id);
      return jsonResponse({ error: 'Session expired' }, 409);
    }

    if (session.snapshot_hash !== snapshotHash) {
      return jsonResponse({ error: 'Snapshot mismatch - state changed' }, 409);
    }

    const snapshotParticipants = buildSnapshotParticipants(session?.snapshot_data);
    const participant = resolveParticipantFromSnapshot(
      snapshotParticipants,
      authEmail,
      participantIdFromBody,
      signerIdFromBody,
    );

    if (!participant) {
      return jsonResponse({ error: 'Participant identity mismatch for authenticated user' }, 403);
    }

    const participantId = participant.participantId;
    const participantEmail = normalizeEmail(participant.email);

    const existingConfirmation = session.confirmations?.[participantId];
    if (existingConfirmation?.confirmedAt) {
      return jsonResponse({
        success: true,
        status: 'already_confirmed',
        participantId,
        role: participant.role,
        sessionId,
        confirmedAt: existingConfirmation.confirmedAt,
      });
    }

    const { data: otpRecord, error: otpFetchError } = await supabase
      .from('presential_verification_otps')
      .select('id, otp_hash, expires_at, attempts, verified_at')
      .eq('session_id', session.id)
      .eq('signer_email', participantEmail)
      .single();

    if (otpFetchError || !otpRecord) {
      return jsonResponse({ error: 'OTP challenge not found for participant' }, 404);
    }

    if (otpRecord.verified_at) {
      return jsonResponse({ error: 'OTP already used for this participant' }, 409);
    }

    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      return jsonResponse({ error: 'Too many OTP attempts' }, 429);
    }

    const otpExpiresAtMs = parseTimestamp(otpRecord.expires_at);
    if (otpExpiresAtMs !== null && otpExpiresAtMs < now) {
      return jsonResponse({ error: 'OTP expired' }, 409);
    }

    const otpHash = await sha256Hex(otp);
    const isValidOtp = otpHash === String(otpRecord.otp_hash ?? '').toLowerCase();

    await supabase
      .from('presential_verification_otps')
      .update({
        attempts: otpRecord.attempts + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', otpRecord.id);

    if (!isValidOtp) {
      return jsonResponse({ error: 'Invalid OTP' }, 401);
    }

    const identityBindingId = await getOrCreateIdentityBinding(supabase, participantEmail);
    const confirmedAt = new Date().toISOString();
    const attestation = await buildTrenzaAttestation({
      sessionId: session.session_id,
      snapshotHash: session.snapshot_hash,
      participant,
      confirmationMethod,
      otpRecordId: String(otpRecord.id),
      otpAttempt: Number(otpRecord.attempts ?? 0) + 1,
      authUser,
      userAgent: req.headers.get('user-agent') ?? null,
      attestedAt: confirmedAt,
    });

    const confirmEvent = {
      kind:
        participant.role === 'witness'
          ? 'identity.session.presence.witnessed'
          : 'identity.session.presence.confirmed',
      at: confirmedAt,
      actor: participant.role,
      payload: {
        session_id: session.session_id,
        participant_id: participantId,
        participant_role: participant.role,
        signer_id: participant.signerId,
        participant_email: participantEmail,
        snapshot_hash: session.snapshot_hash,
        confirmation_method: confirmationMethod,
        identity_binding_id: identityBindingId,
        attestation_hash: attestation.attestation_hash,
        timestamp_confirmed: confirmedAt,
        user_agent: req.headers.get('user-agent') ?? null,
      },
    };

    const documentIds = Array.isArray(session?.snapshot_data?.documents)
      ? session.snapshot_data.documents
        .map((d: any) => String(d?.entityId ?? '').trim())
        .filter((id: string) => id.length > 0)
      : [];

    const appendErrors: string[] = [];
    for (const docId of documentIds) {
      const result = await appendEvent(
        supabase,
        docId,
        confirmEvent,
        'presential-verification-confirm-presence',
      );
      if (!result.success) {
        appendErrors.push(`${docId}: ${result.error ?? 'unknown append error'}`);
      }
    }

    if (appendErrors.length > 0) {
      return jsonResponse({ error: 'Failed to append canonical events', details: appendErrors }, 500);
    }

    const updatedConfirmations = {
      ...(session.confirmations ?? {}),
      [participantId]: {
        confirmedAt,
        role: participant.role,
        method: confirmationMethod,
        identityBindingId,
        participantEmail,
        signerId: participant.signerId,
        attestationHash: attestation.attestation_hash,
      },
    };

    const currentAttestations = Array.isArray(session.trenza_attestations)
      ? session.trenza_attestations
      : [];

    const nextAttestations = currentAttestations.some((item: any) =>
      String(item?.attestation_hash ?? '') === attestation.attestation_hash
    )
      ? currentAttestations
      : [...currentAttestations, attestation];

    const { error: updateError } = await supabase
      .from('presential_verification_sessions')
      .update({
        confirmations: updatedConfirmations,
        trenza_attestations: nextAttestations,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    if (updateError) {
      return jsonResponse({ error: 'Failed to record confirmation' }, 500);
    }

    const { error: otpFinalizeError } = await supabase
      .from('presential_verification_otps')
      .update({ verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', otpRecord.id);

    if (otpFinalizeError) {
      return jsonResponse({ error: 'Failed to finalize OTP verification' }, 500);
    }

    return jsonResponse({
      success: true,
      status: 'confirmed',
      participantId,
      role: participant.role,
      signerId: participant.signerId,
      sessionId,
      confirmedAt,
      attestationHash: attestation.attestation_hash,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});
