import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

interface StartSessionRequest {
  operation_id: string;
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
 * Generate short session ID (PSV-XXXXX)
 */
function generateSessionId(): string {
  return 'PSV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Capture operation snapshot: documents + signers + state
 */
async function captureOperationSnapshot(supabase: any, operationId: string) {
  // Get documents in operation
  const { data: documents, error: docError } = await supabase
    .from('user_documents')
    .select('id, name, document_entity_id')
    .eq('operation_id', operationId);

  if (docError || !documents) {
    throw new Error('Failed to fetch operation documents');
  }

  // Get document entity events for each document
  const documentSnapshots = await Promise.all(
    documents.map(async (doc: any) => {
      const { data: entity, error: entError } = await supabase
        .from('document_entities')
        .select('id, events')
        .eq('id', doc.document_entity_id)
        .single();

      if (entError || !entity) {
        return {
          documentId: doc.id,
          name: doc.name,
          entityId: doc.document_entity_id,
          currentHash: 'unknown',
          state: 'unknown',
        };
      }

      const lastEvent = entity.events && entity.events.length > 0
        ? entity.events[entity.events.length - 1]
        : null;

      return {
        documentId: doc.id,
        name: doc.name,
        entityId: entity.id,
        currentHash: lastEvent?.payload?.witness_hash || lastEvent?.witness_hash || 'unknown',
        state: lastEvent?.kind || 'unknown',
      };
    })
  );

  // Get signers in operation
  const { data: signers, error: sigError } = await supabase
    .from('operation_signers')
    .select('id, email, role')
    .eq('operation_id', operationId);

  if (sigError) {
    console.warn('[presential] failed to fetch signers:', sigError);
  }

  return {
    operationId: operationId,
    documents: documentSnapshots,
    signers: (signers || []).map((s: any) => ({
      signerId: s.id,
      email: s.email,
      role: s.role,
    })),
    capturedAt: new Date().toISOString(),
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

    const body = (await req.json().catch(() => ({}))) as Partial<StartSessionRequest>;
    const operationId = String(body.operation_id ?? '');

    if (!operationId) {
      return jsonResponse({ error: 'operation_id required' }, 400);
    }

    console.log('[presential-start-session] start', { operation_id: operationId, user_id: userId });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify operation exists and user is owner
    const { data: operation, error: opError } = await supabase
      .from('operations')
      .select('id, created_by')
      .eq('id', operationId)
      .single();

    if (opError || !operation) {
      return jsonResponse({ error: 'Operation not found' }, 404);
    }

    if (operation.created_by !== userId) {
      return jsonResponse({ error: 'Not authorized to manage this operation' }, 403);
    }

    // Capture snapshot
    const snapshot = await captureOperationSnapshot(supabase, operationId);

    // Hash snapshot
    const snapshotJson = JSON.stringify(snapshot);
    const snapshotHash = await hashData(snapshotJson);

    // Generate session ID
    const sessionId = generateSessionId();

    // Generate QR payload
    const qrPayload = {
      sessionId: sessionId,
      operationId: operationId,
      snapshotHash: snapshotHash,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };

    // For now, QR is just the payload (can be replaced with actual QR generation)
    const qrCode = JSON.stringify(qrPayload);

    // Insert session
    const { data: session, error: insertError } = await supabase
      .from('presential_verification_sessions')
      .insert({
        operation_id: operationId,
        session_id: sessionId,
        qr_code: qrCode,
        status: 'active',
        snapshot_hash: snapshotHash,
        snapshot_data: snapshot,
        created_by: userId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[presential-start-session] insert error:', insertError);
      return jsonResponse({ error: 'Failed to create session' }, 500);
    }

    console.log('[presential-start-session] session created', { session_id: sessionId });

    return jsonResponse({
      success: true,
      sessionId: session.session_id,
      qrCode: session.qr_code,
      snapshotHash: session.snapshot_hash,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[presential-start-session] error:', message);
    return jsonResponse({ error: message }, 500);
  }
});
