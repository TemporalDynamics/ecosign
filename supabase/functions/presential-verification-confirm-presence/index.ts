import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { appendEvent } from '../_shared/eventHelper.ts';

interface ConfirmPresenceRequest {
  session_id: string;
  snapshot_hash: string;
  signer_id?: string;
  confirmation_method?: 'otp' | 'selfie' | 'dni';
  otp?: string;
}

type AuthUser = {
  id: string;
  email: string | null;
};

type SnapshotSigner = {
  signerId: string;
  email: string;
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

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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

function resolveSignerFromSnapshot(
  snapshotSigners: SnapshotSigner[],
  authEmail: string,
  requestedSignerId?: string,
): SnapshotSigner | null {
  if (requestedSignerId) {
    const byId = snapshotSigners.find((s) => s.signerId === requestedSignerId);
    if (!byId) return null;
    if (normalizeEmail(byId.email) !== authEmail) return null;
    return byId;
  }

  return snapshotSigners.find((s) => normalizeEmail(s.email) === authEmail) ?? null;
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

    const snapshotSigners = Array.isArray(session?.snapshot_data?.signers)
      ? (session.snapshot_data.signers as SnapshotSigner[])
      : [];

    const signerInSnapshot = resolveSignerFromSnapshot(snapshotSigners, authEmail, signerIdFromBody);
    if (!signerInSnapshot) {
      return jsonResponse({ error: 'Signer identity mismatch for authenticated user' }, 403);
    }

    const signerId = signerInSnapshot.signerId || authUser.id;
    const signerEmail = normalizeEmail(signerInSnapshot.email);

    const existingConfirmation = session.confirmations?.[signerId];
    if (existingConfirmation?.confirmedAt) {
      return jsonResponse({
        success: true,
        status: 'already_confirmed',
        signerId,
        sessionId,
        confirmedAt: existingConfirmation.confirmedAt,
      });
    }

    const { data: otpRecord, error: otpFetchError } = await supabase
      .from('presential_verification_otps')
      .select('id, otp_hash, expires_at, attempts, verified_at')
      .eq('session_id', session.id)
      .eq('signer_email', signerEmail)
      .single();

    if (otpFetchError || !otpRecord) {
      return jsonResponse({ error: 'OTP challenge not found for signer' }, 404);
    }

    if (otpRecord.verified_at) {
      return jsonResponse({ error: 'OTP already used for this signer' }, 409);
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

    const identityBindingId = await getOrCreateIdentityBinding(supabase, signerEmail);

    const confirmEvent = {
      kind: 'identity.session.presence.confirmed',
      at: new Date().toISOString(),
      actor: 'signer',
      payload: {
        session_id: session.session_id,
        signer_id: signerId,
        signer_email: signerEmail,
        snapshot_hash: session.snapshot_hash,
        confirmation_method: confirmationMethod,
        identity_binding_id: identityBindingId,
        timestamp_confirmed: new Date().toISOString(),
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
      [signerId]: {
        confirmedAt: new Date().toISOString(),
        method: confirmationMethod,
        identityBindingId,
        signerEmail,
      },
    };

    const { error: updateError } = await supabase
      .from('presential_verification_sessions')
      .update({ confirmations: updatedConfirmations, updated_at: new Date().toISOString() })
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
      signerId,
      sessionId,
      confirmedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});
