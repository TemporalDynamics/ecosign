import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { sendEmail, buildSignerOtpEmail } from '../_shared/email.ts';

interface StartSessionRequest {
  operation_id: string;
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

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const SESSION_TTL_MINUTES = 30;
const OTP_TTL_MINUTES = 10;

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
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
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateSessionId(): string {
  const raw = crypto.randomUUID().replaceAll('-', '').toUpperCase();
  return `PSV-${raw.slice(0, 6)}`;
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

async function captureOperationSnapshot(supabase: any, operationId: string) {
  const { data: documents, error: docError } = await supabase
    .from('user_documents')
    .select('id, name, document_entity_id')
    .eq('operation_id', operationId);

  if (docError || !documents) {
    throw new Error('Failed to fetch operation documents');
  }

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

      const events = Array.isArray(entity.events) ? entity.events : [];
      const lastEvent = events.length > 0 ? events[events.length - 1] : null;

      return {
        documentId: doc.id,
        name: doc.name,
        entityId: entity.id,
        currentHash: lastEvent?.payload?.witness_hash || lastEvent?.witness_hash || 'unknown',
        state: lastEvent?.kind || 'unknown',
      };
    }),
  );

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

  return {
    operationId,
    documents: documentSnapshots,
    signers: normalizedSigners,
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
    const authUser = await verifyAuthUser(authHeader);

    if (!authUser) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = (await req.json().catch(() => ({}))) as Partial<StartSessionRequest>;
    const operationId = String(body.operation_id ?? '');

    if (!operationId) {
      return jsonResponse({ error: 'operation_id required' }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: operation, error: opError } = await supabase
      .from('operations')
      .select('id, created_by')
      .eq('id', operationId)
      .single();

    if (opError || !operation) {
      return jsonResponse({ error: 'Operation not found' }, 404);
    }

    if (operation.created_by !== authUser.id) {
      return jsonResponse({ error: 'Not authorized to manage this operation' }, 403);
    }

    const snapshot = await captureOperationSnapshot(supabase, operationId);
    const snapshotJson = JSON.stringify(snapshot);
    const snapshotHash = await hashData(snapshotJson);

    const sessionId = generateSessionId();
    const nowMs = Date.now();
    const expiresAt = new Date(nowMs + SESSION_TTL_MINUTES * 60_000).toISOString();

    const qrPayload = {
      sessionId,
      operationId,
      snapshotHash,
      expiresAt,
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
      })
      .select()
      .single();

    if (insertError || !session) {
      return jsonResponse({ error: 'Failed to create session' }, 500);
    }

    const otpExpiresAt = new Date(nowMs + OTP_TTL_MINUTES * 60_000).toISOString();

    for (const signer of snapshot.signers as SessionSigner[]) {
      const otpCode = generateOtpCode();
      const otpHash = await hashData(otpCode);

      const { error: otpError } = await supabase
        .from('presential_verification_otps')
        .upsert(
          {
            session_id: session.id,
            signer_email: normalizeEmail(signer.email),
            otp_hash: otpHash,
            expires_at: otpExpiresAt,
            attempts: 0,
            verified_at: null,
            last_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'session_id,signer_email' },
        );

      if (otpError) {
        await supabase.from('presential_verification_sessions').delete().eq('id', session.id);
        return jsonResponse({ error: `Failed to create OTP challenge for ${signer.email}` }, 500);
      }

      const emailPayload = await buildSignerOtpEmail({
        signerEmail: signer.email,
        signerName: null,
        workflowTitle: `Verificacion presencial (${sessionId})`,
        otpCode,
        siteUrl: Deno.env.get('SITE_URL'),
      });

      const emailResult = await sendEmail(emailPayload);
      if (!emailResult.success) {
        await supabase.from('presential_verification_sessions').delete().eq('id', session.id);
        await supabase.from('presential_verification_otps').delete().eq('session_id', session.id);
        return jsonResponse({ error: `Failed to send OTP to ${signer.email}` }, 500);
      }
    }

    return jsonResponse({
      success: true,
      sessionId: session.session_id,
      qrCode: session.qr_code,
      snapshotHash: session.snapshot_hash,
      expiresAt: session.expires_at,
      signersNotified: (snapshot.signers as SessionSigner[]).length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});
