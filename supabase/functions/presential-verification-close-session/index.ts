import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { appendEvent } from '../_shared/eventHelper.ts';
import { canonicalize, sha256Hex } from '../_shared/canonicalHash.ts';
import { signFinalEcoInstitutionally } from '../_shared/ecoInstitutionalSignature.ts';

interface CloseSessionRequest {
  session_id: string;
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

type TrenzaParticipantSummary = {
  participants_expected: number;
  signers_expected: number;
  witnesses_expected: number;
  participants_confirmed: number;
  signers_confirmed: number;
  witnesses_confirmed: number;
  attestations_recorded: number;
  witness_required: boolean;
};

type TrenzaStatus = {
  summary: TrenzaParticipantSummary;
  strands: {
    signer: { required: true; ok: boolean };
    witness: { required: boolean; ok: boolean };
    ecosign: { required: true; ok: boolean; reason: string | null };
  };
  required_strands: number;
  confirmed_strands: number;
  status: 'strong' | 'partial' | 'weak';
};

type ActaTimestampEvidence = {
  kind: 'local' | 'tsa.rfc3161';
  status: 'recorded' | 'confirmed' | 'failed';
  at: string;
  hash_hex: string;
  provider: string;
  token_hash: string | null;
  token_b64: string | null;
  elapsed_ms: number | null;
  error: string | null;
  retryable: boolean;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FUNCTIONS_URL = `${SUPABASE_URL.replace(/\/+$/, '')}/functions/v1`;

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
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

function normalizeRole(value: unknown): SessionParticipantRole {
  return value === 'witness' ? 'witness' : 'signer';
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

function buildTrenzaParticipantSummary(input: {
  participants: SnapshotParticipant[];
  confirmations: Record<string, any> | null | undefined;
  attestationsRecorded: number;
}): TrenzaParticipantSummary {
  const participants = input.participants;
  const confirmations = input.confirmations ?? {};
  const expectedSigners = participants.filter((p) => p.role === 'signer');
  const expectedWitnesses = participants.filter((p) => p.role === 'witness');

  const confirmedIds = Object.entries(confirmations)
    .filter(([, value]) => Boolean((value as { confirmedAt?: string })?.confirmedAt))
    .map(([participantId]) => participantId);

  const confirmedSet = new Set(confirmedIds);
  const confirmedParticipants = participants.filter((p) => confirmedSet.has(p.participantId));

  const fallbackSignerCount = Object.entries(confirmations).filter(([, value]) => {
    if (!(value as { confirmedAt?: string })?.confirmedAt) return false;
    return normalizeRole((value as { role?: unknown })?.role) === 'signer';
  }).length;

  const fallbackWitnessCount = Object.entries(confirmations).filter(([, value]) => {
    if (!(value as { confirmedAt?: string })?.confirmedAt) return false;
    return normalizeRole((value as { role?: unknown })?.role) === 'witness';
  }).length;

  const confirmedSignersFromSnapshot = confirmedParticipants.filter((p) => p.role === 'signer').length;
  const confirmedWitnessesFromSnapshot = confirmedParticipants.filter((p) => p.role === 'witness').length;

  const confirmedSigners =
    participants.length > 0
      ? confirmedSignersFromSnapshot
      : fallbackSignerCount;
  const confirmedWitnesses =
    participants.length > 0
      ? confirmedWitnessesFromSnapshot
      : fallbackWitnessCount;

  const confirmedParticipantsCount =
    participants.length > 0
      ? confirmedParticipants.length
      : Object.values(confirmations).filter((value) =>
        Boolean((value as { confirmedAt?: string })?.confirmedAt)
      ).length;

  return {
    participants_expected: participants.length,
    signers_expected: expectedSigners.length,
    witnesses_expected: expectedWitnesses.length,
    participants_confirmed: confirmedParticipantsCount,
    signers_confirmed: confirmedSigners,
    witnesses_confirmed: confirmedWitnesses,
    attestations_recorded: input.attestationsRecorded,
    witness_required: expectedWitnesses.length > 0,
  };
}

function buildTrenzaStatus(
  summary: TrenzaParticipantSummary,
  ecosignSealed: boolean,
  ecosignReason: string | null,
): TrenzaStatus {
  const signerOk = summary.signers_confirmed > 0;
  const witnessOk = summary.witness_required ? summary.witnesses_confirmed > 0 : true;
  const requiredStrands = summary.witness_required ? 3 : 2;
  const confirmedStrands =
    (signerOk ? 1 : 0) +
    (summary.witness_required && witnessOk ? 1 : 0) +
    (ecosignSealed ? 1 : 0);

  const status: 'strong' | 'partial' | 'weak' =
    confirmedStrands === requiredStrands
      ? 'strong'
      : confirmedStrands > 0
      ? 'partial'
      : 'weak';

  return {
    summary,
    strands: {
      signer: { required: true, ok: signerOk },
      witness: { required: summary.witness_required, ok: witnessOk },
      ecosign: { required: true, ok: ecosignSealed, reason: ecosignReason },
    },
    required_strands: requiredStrands,
    confirmed_strands: confirmedStrands,
    status,
  };
}

function buildCanonicalActaEnvelope(input: {
  session: any;
  closedBy: string;
  closedAt: string;
  effectiveStatus: string;
  summary: TrenzaParticipantSummary;
  attestations: unknown[];
}) {
  return {
    version: 'ecosign.nonrep.acta.v1',
    issued_at: input.closedAt,
    session: {
      session_id: input.session.session_id,
      operation_id: input.session.operation_id,
      status_before_close: input.effectiveStatus,
      snapshot_hash: input.session.snapshot_hash,
      created_at: input.session.created_at,
      expires_at: input.session.expires_at,
      closed_at: input.closedAt,
      closed_by: input.closedBy,
    },
    trenza: {
      summary: input.summary,
      attestations: input.attestations,
    },
    snapshot: input.session.snapshot_data ?? {},
    legal_notice:
      'This non-repudiation session captures incremental identity evidence. It complements, and does not replace, the independent cryptographic validity of document signatures.',
  };
}

async function attemptActaTimestamp(hashHex: string): Promise<ActaTimestampEvidence> {
  const attemptedAt = new Date().toISOString();
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(`${FUNCTIONS_URL}/legal-timestamp`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ hash_hex: hashHex }),
    });

    const payload = await response.json().catch(() => ({} as Record<string, unknown>));
    const elapsedMs = Date.now() - startedAt;

    if (
      response.ok &&
      Boolean((payload as { success?: boolean }).success) &&
      typeof (payload as { token?: unknown }).token === 'string'
    ) {
      const tokenB64 = String((payload as { token: string }).token);
      const tokenHash = await sha256Hex(tokenB64);
      return {
        kind: 'tsa.rfc3161',
        status: 'confirmed',
        at: attemptedAt,
        hash_hex: hashHex,
        provider:
          typeof (payload as { tsa_url?: unknown }).tsa_url === 'string'
            ? String((payload as { tsa_url: string }).tsa_url)
            : 'freetsa',
        token_hash: tokenHash,
        token_b64: tokenB64,
        elapsed_ms: elapsedMs,
        error: null,
        retryable: false,
      };
    }

    const error =
      typeof (payload as { error?: unknown }).error === 'string'
        ? String((payload as { error: string }).error)
        : `HTTP ${response.status}`;

    return {
      kind: 'tsa.rfc3161',
      status: 'failed',
      at: attemptedAt,
      hash_hex: hashHex,
      provider: 'freetsa',
      token_hash: null,
      token_b64: null,
      elapsed_ms: elapsedMs,
      error,
      retryable: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      kind: 'tsa.rfc3161',
      status: 'failed',
      at: attemptedAt,
      hash_hex: hashHex,
      provider: 'freetsa',
      token_hash: null,
      token_b64: null,
      elapsed_ms: Date.now() - startedAt,
      error: message,
      retryable: true,
    };
  } finally {
    clearTimeout(timeout);
  }
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

    const body = (await req.json().catch(() => ({}))) as Partial<CloseSessionRequest>;
    const sessionId = String(body.session_id ?? '').trim();

    if (!sessionId) {
      return jsonResponse({ error: 'session_id required' }, 400);
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

    if (session.created_by !== authUser.id) {
      return jsonResponse({ error: 'Not authorized to close this session' }, 403);
    }

    if (session.status === 'closed') {
      return jsonResponse({
        success: true,
        status: 'closed',
        sessionId: session.session_id,
        actaHash: session.acta_hash ?? null,
        acta: session.acta_payload ?? null,
        timestamps: Array.isArray(session.acta_timestamps) ? session.acta_timestamps : [],
      });
    }

    const now = Date.now();
    const sessionExpiresAtMs = parseTimestamp(session.expires_at);
    const effectiveStatus = sessionExpiresAtMs !== null && sessionExpiresAtMs < now ? 'expired' : session.status;

    if (effectiveStatus !== 'active' && effectiveStatus !== 'expired') {
      return jsonResponse({ error: 'Session not closable' }, 409);
    }

    const closedAt = new Date().toISOString();
    const snapshotParticipants = buildSnapshotParticipants(session.snapshot_data);
    const attestations = Array.isArray(session.trenza_attestations) ? session.trenza_attestations : [];
    const participantSummary = buildTrenzaParticipantSummary({
      participants: snapshotParticipants,
      confirmations: session.confirmations ?? {},
      attestationsRecorded: attestations.length,
    });

    const unsignedActa = buildCanonicalActaEnvelope({
      session,
      closedBy: authUser.id,
      closedAt,
      effectiveStatus,
      summary: participantSummary,
      attestations,
    });
    const signedActaResult = await signFinalEcoInstitutionally(unsignedActa as Record<string, unknown>);
    const trenzaStatus = buildTrenzaStatus(
      participantSummary,
      signedActaResult.signed,
      signedActaResult.reason ?? null,
    );
    const actaPayload = signedActaResult.eco;
    const actaHash = await sha256Hex(canonicalize(actaPayload));
    const localTimestamp: ActaTimestampEvidence = {
      kind: 'local',
      status: 'recorded',
      at: closedAt,
      hash_hex: actaHash,
      provider: 'ecosign.local',
      token_hash: null,
      token_b64: null,
      elapsed_ms: 0,
      error: null,
      retryable: false,
    };
    const externalTimestamp = await attemptActaTimestamp(actaHash);
    const timestampEvidence = [localTimestamp, externalTimestamp];

    const closeEvent = {
      kind: 'identity.session.presence.closed',
      at: closedAt,
      actor: 'owner',
      payload: {
        session_id: session.session_id,
        acta_hash: actaHash,
        confirmations_count: Object.keys(session.confirmations || {}).length,
        closed_by: authUser.id,
        closed_at: closedAt,
        session_status_before_close: effectiveStatus,
        trenza: trenzaStatus,
        timestamp_evidence: {
          local: localTimestamp.status,
          tsa: externalTimestamp.status,
          tsa_provider: externalTimestamp.provider,
          tsa_token_hash: externalTimestamp.token_hash,
          tsa_error: externalTimestamp.error,
        },
        ecosign_signature: {
          present: signedActaResult.signed,
          reason: signedActaResult.reason ?? null,
        },
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
        closeEvent,
        'presential-verification-close-session',
      );
      if (!result.success) {
        appendErrors.push(`${docId}: ${result.error ?? 'unknown append error'}`);
      }
    }

    if (appendErrors.length > 0) {
      return jsonResponse({ error: 'Failed to append canonical close events', details: appendErrors }, 500);
    }

    const { error: updateError } = await supabase
      .from('presential_verification_sessions')
      .update({
        status: 'closed',
        closed_at: closedAt,
        acta_payload: actaPayload,
        acta_hash: actaHash,
        acta_timestamps: timestampEvidence,
        updated_at: closedAt,
      })
      .eq('id', session.id);

    if (updateError) {
      return jsonResponse({ error: 'Failed to close session' }, 500);
    }

    return jsonResponse({
      success: true,
      status: 'closed',
      sessionId: session.session_id,
      actaHash,
      trenza: trenzaStatus,
      timestamps: timestampEvidence,
      acta: actaPayload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});
