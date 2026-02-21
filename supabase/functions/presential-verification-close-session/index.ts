import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

interface CloseSessionRequest {
  session_id: string;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * Extract user ID from Authorization header (JWT)
 */
async function verifyAuth(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.auth.getUser(token);
    return error || !data.user ? null : data.user.id;
  } catch {
    return null;
  }
}

/**
 * SHA-256 hash
 */
async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate presential acta (digital record of session)
 */
function generatePresentialAct(session: any, userId: string) {
  return {
    actId: `ACT-${session.session_id}`,
    sessionId: session.session_id,
    operationId: session.operation_id,
    createdAt: session.created_at,
    closedAt: new Date().toISOString(),
    closedBy: userId,
    snapshot: {
      documentsPresented: (session.snapshot_data.documents || []).map((d: any) => ({
        id: d.documentId,
        name: d.name,
        state: d.state,
        hash: d.currentHash,
      })),
      signersPresent: Object.entries(session.confirmations).map(([signerId, conf]: any) => ({
        signerId: signerId,
        confirmedAt: conf.confirmedAt,
        method: conf.method,
      })),
    },
    legalNotice:
      'This presential verification session documents identity confirmation. It does not modify the validity of digital signatures, which are independently valid under applicable law.',
    metadata: {
      version: '1.0',
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
    const userId = await verifyAuth(authHeader);

    if (!userId) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = (await req.json().catch(() => ({}))) as Partial<CloseSessionRequest>;
    const sessionId = String(body.session_id ?? '');

    if (!sessionId) {
      return jsonResponse({ error: 'session_id required' }, 400);
    }

    console.log('[presential-close-session] start', { session_id: sessionId, user_id: userId });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('presential_verification_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (sessionError || !session) {
      return jsonResponse({ error: 'Session not found' }, 404);
    }

    // Verify user is session creator (owner)
    if (session.created_by !== userId) {
      return jsonResponse({ error: 'Not authorized to close this session' }, 403);
    }

    // Generate acta
    const acta = generatePresentialAct(session, userId);
    const actaJson = JSON.stringify(acta);
    const actaHash = await hashData(actaJson);

    // Create close event
    const closeEvent = {
      kind: 'identity.session.presence.closed',
      at: new Date().toISOString(),
      actor: 'owner',
      correlation_id: session.operation_id,
      payload: {
        sessionId: session.session_id,
        actaHash: actaHash,
        confirmationsCount: Object.keys(session.confirmations).length,
        closedBy: userId,
        closedAt: new Date().toISOString(),
      },
    };

    // Append close event to all documents in operation
    const documentIds = (session.snapshot_data.documents || []).map((d: any) => d.entityId);

    for (const docId of documentIds) {
      // Fetch current events
      const { data: currentDoc, error: fetchError } = await supabase
        .from('document_entities')
        .select('events')
        .eq('id', docId)
        .single();

      if (fetchError) {
        console.warn(`[presential-close-session] failed to fetch events for ${docId}:`, fetchError);
        continue;
      }

      // Append close event
      const updatedEvents = Array.isArray(currentDoc?.events) ? [...currentDoc.events, closeEvent] : [closeEvent];

      const { error: appendError } = await supabase
        .from('document_entities')
        .update({ events: updatedEvents })
        .eq('id', docId);

      if (appendError) {
        console.warn(`[presential-close-session] failed to append close event to ${docId}:`, appendError);
      }
    }

    // Update session as closed
    const { error: updateError } = await supabase
      .from('presential_verification_sessions')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    if (updateError) {
      console.error('[presential-close-session] failed to update session:', updateError);
      return jsonResponse({ error: 'Failed to close session' }, 500);
    }

    console.log('[presential-close-session] closed', { session_id: sessionId });

    return jsonResponse({
      success: true,
      status: 'closed',
      actaHash: actaHash,
      acta: acta,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[presential-close-session] error:', message);
    return jsonResponse({ error: message }, 500);
  }
});
