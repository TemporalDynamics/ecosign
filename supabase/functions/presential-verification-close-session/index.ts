import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { appendEvent } from '../_shared/eventHelper.ts';

interface CloseSessionRequest {
  session_id: string;
}

type AuthUser = {
  id: string;
  email: string | null;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generatePresentialAct(session: any, userId: string) {
  return {
    actId: `ACT-${session.session_id}`,
    sessionId: session.session_id,
    operationId: session.operation_id,
    createdAt: session.created_at,
    expiresAt: session.expires_at,
    closedAt: new Date().toISOString(),
    closedBy: userId,
    snapshot: {
      documentsPresented: (session.snapshot_data.documents || []).map((d: any) => ({
        id: d.documentId,
        name: d.name,
        state: d.state,
        hash: d.currentHash,
      })),
      signersPresent: Object.entries(session.confirmations || {}).map(([signerId, conf]: any) => ({
        signerId,
        confirmedAt: conf.confirmedAt,
        method: conf.method,
      })),
    },
    legalNotice:
      'This presential verification session documents identity confirmation. It does not modify the validity of digital signatures, which are independently valid under applicable law.',
    metadata: {
      version: '1.1',
      timestamp: new Date().toISOString(),
    },
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
      return jsonResponse({ error: 'Session already closed' }, 409);
    }

    const now = Date.now();
    const sessionExpiresAtMs = parseTimestamp(session.expires_at);
    const effectiveStatus = sessionExpiresAtMs !== null && sessionExpiresAtMs < now ? 'expired' : session.status;

    if (effectiveStatus !== 'active' && effectiveStatus !== 'expired') {
      return jsonResponse({ error: 'Session not closable' }, 409);
    }

    const acta = generatePresentialAct(session, authUser.id);
    const actaJson = JSON.stringify(acta);
    const actaHash = await hashData(actaJson);

    const closeEvent = {
      kind: 'identity.session.presence.closed',
      at: new Date().toISOString(),
      actor: 'owner',
      payload: {
        session_id: session.session_id,
        acta_hash: actaHash,
        confirmations_count: Object.keys(session.confirmations || {}).length,
        closed_by: authUser.id,
        closed_at: new Date().toISOString(),
        session_status_before_close: effectiveStatus,
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
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    if (updateError) {
      return jsonResponse({ error: 'Failed to close session' }, 500);
    }

    return jsonResponse({
      success: true,
      status: 'closed',
      actaHash,
      acta,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});
