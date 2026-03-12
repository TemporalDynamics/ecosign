import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { sha256Hex } from '../_shared/canonicalHash.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { normalizeEmail } from '../_shared/email.ts';
import { withRateLimit } from '../_shared/ratelimit.ts';

type SnapshotDocument = {
  name: string;
  hash: string;
  entityId: string;
};

type SnapshotParticipant = {
  participantId: string;
  signerId: string | null;
  email: string;
  role: 'signer' | 'witness';
};

const jsonResponse = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });

const SNAPSHOT_HASH_REGEX = /^[a-f0-9]{64}$/i;

function extractValue(req: Request, body: Record<string, unknown> | null, key: string): string {
  const url = new URL(req.url);
  const queryValue = (url.searchParams.get(key) ?? '').trim();
  if (queryValue) return queryValue;
  if (body && typeof body[key] === 'string') return String(body[key]).trim();
  return '';
}

function buildSnapshotParticipants(snapshotData: any): SnapshotParticipant[] {
  const participantsRaw = Array.isArray(snapshotData?.participants) ? snapshotData.participants : [];
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
          role: item?.role === 'witness' ? 'witness' : 'signer',
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
  otpEmail: string,
  otpParticipantId: string | null,
): SnapshotParticipant | null {
  const normalizedEmail = normalizeEmail(otpEmail);
  if (!participants.length || (!normalizedEmail && !otpParticipantId)) return null;
  if (otpParticipantId) {
    const byId = participants.find(
      (p) => p.participantId === otpParticipantId || p.signerId === otpParticipantId,
    );
    if (byId) return byId;
  }
  return participants.find((p) => normalizeEmail(p.email) === normalizedEmail) ?? null;
}

serve(
  withRateLimit('presential-preview', async (req) => {
    const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined);

    if (req.method === 'OPTIONS') {
      if (!isAllowed) return new Response('Forbidden', { status: 403, headers: corsHeaders });
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    if (!isAllowed) {
      return jsonResponse({ success: false, error: 'Origin not allowed' }, 403, corsHeaders);
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405, corsHeaders);
    }

    try {
      const body =
        req.method === 'POST'
          ? ((await req.json().catch(() => null)) as Record<string, unknown> | null)
          : null;

      const sessionId = extractValue(req, body, 'session_id');
      const snapshotHash = extractValue(req, body, 'snapshot_hash');
      const participantToken = extractValue(req, body, 'participant_token');

      if (!sessionId || !participantToken || !snapshotHash) {
        return jsonResponse({ success: false, error: 'missing_parameters' }, 400, corsHeaders);
      }

      if (!SNAPSHOT_HASH_REGEX.test(snapshotHash)) {
        return jsonResponse({ success: false, error: 'invalid_snapshot_hash' }, 400, corsHeaders);
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

      const { data: session, error: sessionError } = await supabase
        .from('presential_verification_sessions')
        .select('id, session_id, operation_id, snapshot_hash, snapshot_data, status, expires_at')
        .eq('session_id', sessionId)
        .single();

      if (sessionError || !session) {
        return jsonResponse({ success: false, error: 'session_not_found' }, 404, corsHeaders);
      }

      if (session.status !== 'active') {
        return jsonResponse({ success: false, error: 'session_not_active' }, 409, corsHeaders);
      }

      if (session.snapshot_hash !== snapshotHash) {
        return jsonResponse({ success: false, error: 'snapshot_mismatch' }, 409, corsHeaders);
      }

      const participantTokenHash = await sha256Hex(participantToken);
      const { data: otpRecord, error: otpError } = await supabase
        .from('presential_verification_otps')
        .select('signer_email, participant_id, participant_role, token_expires_at, token_revoked_at')
        .eq('session_id', session.id)
        .eq('participant_token_hash', participantTokenHash)
        .single();

      if (otpError || !otpRecord) {
        return jsonResponse({ success: false, error: 'invalid_participant_token' }, 403, corsHeaders);
      }

      if (otpRecord.token_revoked_at) {
        return jsonResponse({ success: false, error: 'participant_token_revoked' }, 403, corsHeaders);
      }

      const tokenExpiresAt = otpRecord.token_expires_at
        ? new Date(otpRecord.token_expires_at).getTime()
        : null;
      if (tokenExpiresAt !== null && tokenExpiresAt < Date.now()) {
        return jsonResponse({ success: false, error: 'participant_token_expired' }, 403, corsHeaders);
      }

      const snapshotDocuments: SnapshotDocument[] = Array.isArray(session.snapshot_data?.documents)
        ? session.snapshot_data.documents.map((doc: any) => ({
            name: String(doc?.name ?? 'Documento'),
            hash: String(doc?.currentHash ?? 'unknown'),
            entityId: String(doc?.entityId ?? ''),
          }))
        : [];

      const participants = buildSnapshotParticipants(session.snapshot_data);
      const participant = resolveParticipantFromSnapshot(
        participants,
        otpRecord.signer_email ?? '',
        otpRecord.participant_id ?? null,
      );

      const { data: operation } = await supabase
        .from('operations')
        .select('name')
        .eq('id', session.operation_id)
        .single()
        .catch(() => ({ data: null }));

      return jsonResponse(
        {
          success: true,
          sessionId: session.session_id,
          expiresAt: session.expires_at ?? null,
          operationId: session.operation_id ?? null,
          operationName: operation?.name ?? null,
          participant: participant
            ? {
                email: participant.email,
                role: participant.role,
              }
            : {
                email: normalizeEmail(otpRecord.signer_email ?? ''),
                role: otpRecord.participant_role === 'witness' ? 'witness' : 'signer',
              },
          documents: snapshotDocuments,
        },
        200,
        corsHeaders,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('presential-verification-session-preview error:', message);
      return jsonResponse({ success: false, error: message }, 500, corsHeaders);
    }
  }),
);
