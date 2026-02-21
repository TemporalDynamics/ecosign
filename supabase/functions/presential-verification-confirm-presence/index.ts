import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

interface ConfirmPresenceRequest {
  session_id: string;
  snapshot_hash: string;
  signer_id?: string;
  email?: string;
  confirmation_method?: 'otp' | 'selfie' | 'dni';
  otp?: string;
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
 * Verify OTP (basic implementation - just check format)
 * In production, use Redis or similar for OTP validation
 */
async function verifyOTP(email: string, otp: string): Promise<boolean> {
  // TODO: Implement real OTP verification (Redis + SMS/Email service)
  // For now, accept any 6-digit OTP
  return /^\d{6}$/.test(otp);
}

/**
 * Get or create identity binding for persistent user tracking
 */
async function getOrCreateIdentityBinding(supabase: any, email: string): Promise<string> {
  // Try to find existing binding
  const { data: existing } = await supabase
    .from('identity_bindings')
    .select('id')
    .eq('email', email)
    .single()
    .catch(() => ({ data: null }));

  if (existing) {
    return existing.id;
  }

  // Create new binding
  const { data: newBinding, error } = await supabase
    .from('identity_bindings')
    .insert({ email: email })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create identity binding: ${error.message}`);
  }

  return newBinding.id;
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

    const body = (await req.json().catch(() => ({}))) as Partial<ConfirmPresenceRequest>;
    const sessionId = String(body.session_id ?? '');
    const snapshotHash = String(body.snapshot_hash ?? '');
    const signerId = body.signer_id || userId;
    const email = String(body.email ?? '');
    const confirmationMethod = body.confirmation_method ?? 'otp';
    const otp = String(body.otp ?? '');

    console.log('[presential-confirm-presence] start', {
      session_id: sessionId,
      signer_id: signerId,
      method: confirmationMethod,
    });

    if (!sessionId || !snapshotHash) {
      return jsonResponse({ error: 'session_id and snapshot_hash required' }, 400);
    }

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

    // Check session is active
    if (session.status !== 'active') {
      return jsonResponse({ error: 'Session not active' }, 400);
    }

    // Verify snapshot hash matches
    if (session.snapshot_hash !== snapshotHash) {
      return jsonResponse(
        { error: 'Snapshot mismatch - state changed' },
        409
      );
    }

    // Verify signer is in operation snapshot
    const snapshotSigners = session.snapshot_data.signers || [];
    const signerInSnapshot = snapshotSigners.find(
      (s: any) => s.signerId === signerId || s.email === email
    );

    if (!signerInSnapshot) {
      return jsonResponse({ error: 'Signer not in operation' }, 403);
    }

    // Verify identity based on method
    let identityBindingId = null;

    if (confirmationMethod === 'otp') {
      if (!otp) {
        return jsonResponse({ error: 'OTP required' }, 400);
      }

      const isValid = await verifyOTP(email || signerInSnapshot.email, otp);
      if (!isValid) {
        return jsonResponse({ error: 'Invalid OTP' }, 401);
      }

      identityBindingId = await getOrCreateIdentityBinding(
        supabase,
        email || signerInSnapshot.email
      );
    } else {
      // For selfie/dni, just create binding for now
      identityBindingId = await getOrCreateIdentityBinding(
        supabase,
        email || signerInSnapshot.email
      );
    }

    // Create event in document_entities (append-only)
    const confirmEvent = {
      kind: 'identity.session.presence.confirmed',
      at: new Date().toISOString(),
      actor: 'signer',
      correlation_id: session.operation_id,
      payload: {
        sessionId: session.session_id,
        signerId: signerId,
        snapshotHash: session.snapshot_hash,
        confirmationMethod: confirmationMethod,
        identityBindingId: identityBindingId,
        timestampConfirmed: new Date().toISOString(),
        geoLocation: null,
        deviceFingerprint: req.headers.get('user-agent'),
      },
    };

    // Append event to all documents in operation
    const documentIds = (session.snapshot_data.documents || []).map((d: any) => d.entityId);

    for (const docId of documentIds) {
      // Fetch current events
      const { data: currentDoc, error: fetchError } = await supabase
        .from('document_entities')
        .select('events')
        .eq('id', docId)
        .single();

      if (fetchError) {
        console.warn(`[presential-confirm-presence] failed to fetch events for ${docId}:`, fetchError);
        continue;
      }

      // Append new event
      const updatedEvents = Array.isArray(currentDoc?.events) ? [...currentDoc.events, confirmEvent] : [confirmEvent];

      const { error: appendError } = await supabase
        .from('document_entities')
        .update({ events: updatedEvents })
        .eq('id', docId);

      if (appendError) {
        console.warn(`[presential-confirm-presence] failed to append event to ${docId}:`, appendError);
      }
    }

    // Update confirmations in session
    const updatedConfirmations = {
      ...session.confirmations,
      [signerId]: {
        confirmedAt: new Date().toISOString(),
        method: confirmationMethod,
        identityBindingId: identityBindingId,
      },
    };

    const { error: updateError } = await supabase
      .from('presential_verification_sessions')
      .update({ confirmations: updatedConfirmations })
      .eq('id', session.id);

    if (updateError) {
      console.error('[presential-confirm-presence] failed to update confirmations:', updateError);
      return jsonResponse({ error: 'Failed to record confirmation' }, 500);
    }

    console.log('[presential-confirm-presence] confirmed', {
      session_id: sessionId,
      signer_id: signerId,
    });

    return jsonResponse({
      success: true,
      status: 'confirmed',
      signerId: signerId,
      sessionId: sessionId,
      confirmedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[presential-confirm-presence] error:', message);
    return jsonResponse({ error: message }, 500);
  }
});
