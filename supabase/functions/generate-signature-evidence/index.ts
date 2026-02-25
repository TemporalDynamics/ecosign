import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { appendEvent } from '../_shared/eventHelper.ts';
import { buildCanonicalEcoCertificate } from '../_shared/ecoCanonicalCertificate.ts';
import { requireInternalAuth } from '../_shared/internalAuth.ts';

type GenerateEvidenceRequest = {
  document_entity_id: string;
  signer_id: string;
  workflow_id?: string;
  witness_hash: string;
  correlation_id?: string;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const parseIso = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const ts = new Date(value);
  if (Number.isNaN(ts.getTime())) return null;
  return ts;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 204 });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const auth = requireInternalAuth(req, { allowCronSecret: true });
  if (!auth.ok) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  const body = (await req.json().catch(() => ({}))) as Partial<GenerateEvidenceRequest>;
  const documentEntityId = String(body.document_entity_id ?? '');
  const signerId = String(body.signer_id ?? '');
  const witnessHash = String(body.witness_hash ?? '');

  // Validate correlation_id: canonical rule is correlation_id = document_entity_id
  let correlationId = body.correlation_id || documentEntityId;
  if (correlationId && correlationId !== documentEntityId) {
    console.warn('[generate-signature-evidence] correlation_id mismatch - overriding to canonical', {
      received_correlation_id: correlationId,
      document_entity_id: documentEntityId,
    });
    correlationId = documentEntityId;
  }

  if (!documentEntityId || !signerId || !witnessHash) {
    return jsonResponse({ error: 'document_entity_id, signer_id, witness_hash required' }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: signer, error: signerErr } = await supabase
    .from('workflow_signers')
    .select('id, email, name, workflow_id, signed_at, signing_order')
    .eq('id', signerId)
    .single();

  if (signerErr || !signer) {
    return jsonResponse({ error: 'signer not found' }, 404);
  }

  const workflowId = String(body.workflow_id ?? signer.workflow_id ?? '');

  const { data: entity, error: entityError } = await supabase
    .from('document_entities')
    .select('id, owner_id, source_name, source_hash, witness_hash, signed_hash, composite_hash, lifecycle_status, created_at, updated_at, metadata, events')
    .eq('id', documentEntityId)
    .single();

  if (entityError || !entity) {
    return jsonResponse({ error: 'document_entity not found' }, 404);
  }

  const events = Array.isArray(entity.events) ? entity.events : [];
  const tsaEvent = events.find((event: any) =>
    event?.kind === 'tsa.confirmed' &&
    (event?.witness_hash === witnessHash || event?.tsa?.witness_hash === witnessHash)
  );

  if (!tsaEvent) {
    return jsonResponse({ error: 'tsa_not_confirmed', retryable: true }, 409);
  }

  const tsaAt = parseIso(tsaEvent?.at);
  const filteredEvents = tsaAt
    ? events.filter((event: any) => {
      const at = parseIso(event?.at);
      if (!at) return false;
      return at.getTime() <= tsaAt.getTime();
    })
    : events;

  const issuedAtRaw = signer.signed_at ?? tsaEvent?.at ?? null;
  const issuedAtSource = signer.signed_at ? 'workflow_signers.signed_at' : 'tsa.confirmed.at';

  const certificate = buildCanonicalEcoCertificate({
    document_entity_id: documentEntityId,
    document_name: entity.source_name ?? null,
    source_hash: entity.source_hash ?? null,
    witness_hash: witnessHash,
    signed_hash: entity.signed_hash ?? null,
    issued_at: issuedAtRaw,
    issued_at_source_override: issuedAtSource,
    events: filteredEvents,
    workflow_id: workflowId || null,
    snapshot_kind: 'signer_snapshot',
    witness_hash_for_snapshot: witnessHash,
    signer: {
      id: signer.id,
      email: signer.email ?? null,
      name: signer.name ?? null,
      step_index: signer.signing_order ?? null,
      step_total: null,
    },
  });
  const evidenceJson = JSON.stringify(certificate, null, 2);

  const basePath = workflowId || documentEntityId;
  const artifactPath = `evidence/${basePath}/${signerId}/${witnessHash}.eco.json`;

  const { error: uploadErr } = await supabase.storage
    .from('artifacts')
    .upload(artifactPath, new Blob([evidenceJson], { type: 'application/json' }), {
      upsert: true,
      contentType: 'application/json',
    });

  if (uploadErr) {
    return jsonResponse({ error: 'evidence_upload_failed' }, 500);
  }

  const notificationPayload = {
    artifact_path: artifactPath,
    witness_hash: witnessHash,
    signer_id: signerId,
    workflow_id: workflowId || null,
    format: 'eco.json',
  };
  // ECO is delivered immediately in the UI. We no longer send signature_evidence_ready emails.

  await appendEvent(
    supabase as any,
    documentEntityId,
    {
      kind: 'signature.evidence.generated',
      at: new Date().toISOString(),
      correlation_id: correlationId,
      payload: notificationPayload,
    },
    'generate-signature-evidence',
  );

  return jsonResponse({ success: true, artifact_path: artifactPath });
});
