import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { sendEmail, buildSignerOtpEmail } from '../_shared/email.ts';
import { canonicalize, sha256Hex } from '../_shared/canonicalHash.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

interface StartSessionRequest {
  operation_id: string;
  witness_email?: string;
  witness_emails?: string[];
}

type AuthUser = {
  id: string;
  email: string | null;
};

type SessionSigner = {
  signerId: string;
  email: string;
  role: string | null;
};

type SessionParticipantRole = 'signer' | 'witness';

type SessionParticipant = {
  participantId: string;
  signerId: string | null;
  email: string;
  role: SessionParticipantRole;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_URL = (Deno.env.get('SITE_URL') ?? 'https://ecosign.app').replace(/\/+$/, '');

const SESSION_TTL_MINUTES = 30;
const OTP_TTL_MINUTES = 10;

const jsonResponse = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function generateOtpCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(100000 + (buf[0] % 900000));
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

async function hashData(data: string): Promise<string> {
  return await sha256Hex(data);
}

function generateSessionId(): string {
  const raw = crypto.randomUUID().replaceAll('-', '').toUpperCase();
  return `PSV-${raw.slice(0, 6)}`;
}

function generateParticipantToken(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function buildParticipantAccessLink(input: {
  sessionId: string;
  snapshotHash: string;
  participantId: string;
  participantToken: string;
}): string {
  const url = new URL('/presential-confirm', SITE_URL);
  url.searchParams.set('session_id', input.sessionId);
  url.searchParams.set('snapshot_hash', input.snapshotHash);
  url.searchParams.set('participant_id', input.participantId);
  url.searchParams.set('participant_token', input.participantToken);
  return url.toString();
}

function uniqueSignersByEmail(signers: SessionSigner[]): SessionSigner[] {
  const seen = new Set<string>();
  const unique: SessionSigner[] = [];

  for (const signer of signers) {
    const key = normalizeEmail(signer.email);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push({ ...signer, email: key });
  }

  return unique;
}

function uniqueParticipantsByEmail(participants: SessionParticipant[]): SessionParticipant[] {
  const seen = new Set<string>();
  const unique: SessionParticipant[] = [];

  for (const participant of participants) {
    const key = normalizeEmail(participant.email);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push({ ...participant, email: key });
  }

  return unique;
}

function parseWitnessEmails(body: Partial<StartSessionRequest>): string[] {
  const candidates: string[] = [];
  if (typeof body.witness_email === 'string') candidates.push(body.witness_email);
  if (Array.isArray(body.witness_emails)) {
    for (const value of body.witness_emails) {
      if (typeof value === 'string') candidates.push(value);
    }
  }
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const candidate of candidates) {
    const email = normalizeEmail(candidate);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    normalized.push(email);
  }
  return normalized;
}

function buildParticipants(signers: SessionSigner[], witnessEmails: string[]): SessionParticipant[] {
  const signerParticipants: SessionParticipant[] = signers.map((signer) => ({
    participantId: signer.signerId,
    signerId: signer.signerId,
    email: signer.email,
    role: 'signer',
  }));
  const witnessParticipants: SessionParticipant[] = witnessEmails.map((email) => ({
    participantId: `witness:${email}`,
    signerId: null,
    email,
    role: 'witness',
  }));

  return uniqueParticipantsByEmail([...signerParticipants, ...witnessParticipants]).sort((a, b) => {
    if (a.role !== b.role) return a.role.localeCompare(b.role);
    return a.email.localeCompare(b.email);
  });
}

async function captureOperationSnapshot(
  supabase: any,
  operationId: string,
  witnessEmails: string[],
) {
  const { data: operationDocuments, error: docError } = await supabase
    .from('operation_documents')
    .select('id, document_entity_id')
    .eq('operation_id', operationId);

  if (docError || !operationDocuments) {
    throw new Error('Failed to fetch operation documents');
  }

  if (operationDocuments.length === 0) {
    throw new Error('Operation has no documents');
  }

  const entityIds = operationDocuments
    .map((doc: any) => String(doc.document_entity_id ?? ''))
    .filter((id: string) => id.length > 0);

  const { data: entities, error: entError } = await supabase
    .from('document_entities')
    .select('id, source_name, events')
    .in('id', entityIds);

  if (entError) {
    throw new Error(`Failed to fetch document entities: ${entError.message}`);
  }

  const entityById = new Map<string, any>();
  for (const entity of entities || []) {
    entityById.set(String((entity as any).id), entity);
  }

  const documentSnapshots = operationDocuments
    .map((doc: any) => {
      const entityId = String(doc.document_entity_id ?? '');
      const entity = entityById.get(entityId);
      const events = Array.isArray(entity?.events) ? entity.events : [];
      const lastEvent = events.length > 0 ? events[events.length - 1] : null;

      return {
        documentId: entityId,
        operationDocumentId: String(doc.id ?? ''),
        name: typeof entity?.source_name === 'string' ? entity.source_name : 'Documento',
        entityId,
        currentHash: lastEvent?.payload?.witness_hash || lastEvent?.witness_hash || 'unknown',
        state: lastEvent?.kind || 'unknown',
      };
    })
    .sort((a, b) => String(a.entityId).localeCompare(String(b.entityId)));

  const { data: signers, error: sigError } = await supabase
    .from('operation_signers')
    .select('id, email, role')
    .eq('operation_id', operationId);

  if (sigError) {
    throw new Error(`Failed to fetch operation signers: ${sigError.message}`);
  }

  const normalizedSigners = uniqueSignersByEmail(
    (signers || [])
      .map((s: any) => ({
        signerId: String(s.id ?? ''),
        email: String(s.email ?? ''),
        role: s.role ?? null,
      }))
      .filter((s: SessionSigner) => Boolean(s.signerId) && Boolean(normalizeEmail(s.email))),
  );

  if (normalizedSigners.length === 0) {
    throw new Error('Operation has no signers with valid emails');
  }

  const participants = buildParticipants(normalizedSigners, witnessEmails);

  return {
    operationId,
    documents: documentSnapshots,
    signers: normalizedSigners.sort((a, b) => a.email.localeCompare(b.email)),
    participants,
    policy: {
      version: 'ecosign.nonrep.session.v1',
      witness_required: witnessEmails.length > 0,
      witness_count: witnessEmails.length,
    },
    capturedAt: new Date().toISOString(),
  };
}

serve(async (req) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined);

  if (req.method === 'OPTIONS') {
    if (!isAllowed) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (!isAllowed) {
    return jsonResponse({ error: 'Origin not allowed' }, 403, corsHeaders);
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const authUser = await verifyAuthUser(authHeader);

    if (!authUser) {
      return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
    }

    const body = (await req.json().catch(() => ({}))) as Partial<StartSessionRequest>;
    const operationId = String(body.operation_id ?? '');
    const witnessEmails = parseWitnessEmails(body);

    if (!operationId) {
      return jsonResponse({ error: 'operation_id required' }, 400, corsHeaders);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let operation: Record<string, unknown> | null = null;
    let opError: any = null;

    const ownerQuery = await supabase
      .from('operations')
      .select('id, owner_id')
      .eq('id', operationId)
      .single();
    if (!ownerQuery.error && ownerQuery.data) {
      operation = ownerQuery.data as Record<string, unknown>;
    } else if (String(ownerQuery.error?.message ?? '').toLowerCase().includes('owner_id')) {
      const createdByQuery = await supabase
        .from('operations')
        .select('id, created_by')
        .eq('id', operationId)
        .single();
      operation = (createdByQuery.data as Record<string, unknown> | null) ?? null;
      opError = createdByQuery.error;
    } else {
      opError = ownerQuery.error;
    }

    if (opError || !operation) {
      return jsonResponse({ error: 'Operation not found' }, 404, corsHeaders);
    }

    const operationOwnerId = (operation as any).owner_id ?? (operation as any).created_by ?? null;
    if (operationOwnerId !== authUser.id) {
      return jsonResponse({ error: 'Not authorized to manage this operation' }, 403, corsHeaders);
    }

    const snapshot = await captureOperationSnapshot(supabase, operationId, witnessEmails);
    const snapshotCanonical = canonicalize(snapshot);
    const snapshotHash = await hashData(snapshotCanonical);

    const sessionId = generateSessionId();
    const nowMs = Date.now();
    const expiresAt = new Date(nowMs + SESSION_TTL_MINUTES * 60_000).toISOString();

    const qrPayload = {
      sessionId,
      operationId,
      snapshotHash,
      expiresAt,
      mode: 'nonrep.session.v1',
    };

    const { data: session, error: insertError } = await supabase
      .from('presential_verification_sessions')
      .insert({
        operation_id: operationId,
        session_id: sessionId,
        qr_code: JSON.stringify(qrPayload),
        status: 'active',
        snapshot_hash: snapshotHash,
        snapshot_data: snapshot,
        created_by: authUser.id,
        expires_at: expiresAt,
        trenza_attestations: [],
      })
      .select()
      .single();

    if (insertError || !session) {
      return jsonResponse({ error: 'Failed to create session' }, 500, corsHeaders);
    }

    const otpExpiresAt = new Date(nowMs + OTP_TTL_MINUTES * 60_000).toISOString();

    const participants = Array.isArray(snapshot.participants)
      ? (snapshot.participants as SessionParticipant[])
      : [];

    for (const participant of participants) {
      const otpCode = generateOtpCode();
      const otpHash = await hashData(otpCode);
      const participantToken = generateParticipantToken();
      const participantTokenHash = await hashData(participantToken);
      const participantAccessLink = buildParticipantAccessLink({
        sessionId,
        snapshotHash,
        participantId: participant.participantId,
        participantToken,
      });

      const { error: otpError } = await supabase
        .from('presential_verification_otps')
        .upsert(
          {
            session_id: session.id,
            participant_id: participant.participantId,
            participant_role: participant.role,
            signer_email: normalizeEmail(participant.email),
            otp_hash: otpHash,
            expires_at: otpExpiresAt,
            attempts: 0,
            verified_at: null,
            participant_token_hash: participantTokenHash,
            token_expires_at: expiresAt,
            token_revoked_at: null,
            last_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'session_id,signer_email' },
        );

      if (otpError) {
        await supabase.from('presential_verification_sessions').delete().eq('id', session.id);
        return jsonResponse({ error: `Failed to create OTP challenge for ${participant.email}` }, 500, corsHeaders);
      }

      const emailPayload = await buildSignerOtpEmail({
        signerEmail: participant.email,
        signerName: null,
        workflowTitle:
          participant.role === 'witness'
            ? `Testigo de sesion probatoria (${sessionId})`
            : `Verificacion presencial (${sessionId})`,
        otpCode,
        accessLinkLine: `Acceso seguro de sesion: ${participantAccessLink}`,
        siteUrl: Deno.env.get('SITE_URL'),
      });

      const emailResult = await sendEmail(emailPayload);
      if (!emailResult.success) {
        await supabase.from('presential_verification_sessions').delete().eq('id', session.id);
        await supabase.from('presential_verification_otps').delete().eq('session_id', session.id);
        return jsonResponse({ error: `Failed to send OTP to ${participant.email}` }, 500, corsHeaders);
      }
    }

    const participantsCount = participants.length;
    const witnessCount = participants.filter((p) => p.role === 'witness').length;
    const signerCount = participantsCount - witnessCount;

    return jsonResponse({
      success: true,
      sessionId: session.session_id,
      qrCode: session.qr_code,
      snapshotHash: session.snapshot_hash,
      expiresAt: session.expires_at,
      signersNotified: signerCount,
      witnessesNotified: witnessCount,
      participantsNotified: participantsCount,
    }, 200, corsHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500, corsHeaders);
  }
});
