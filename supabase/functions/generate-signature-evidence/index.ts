import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { appendEvent } from '../_shared/eventHelper.ts';
import { buildCanonicalEcoCertificate } from '../_shared/ecoCanonicalCertificate.ts';
import { requireInternalAuthLogged } from '../_shared/internalAuth.ts';

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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 204 });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const auth = await requireInternalAuthLogged(req, 'generate-signature-evidence', { allowCronSecret: true });
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

  const [{ data: entity, error: entityError }, { count: signerCount }] = await Promise.all([
    supabase
      .from('document_entities')
      .select('id, owner_id, source_name, source_hash, source_mime, witness_hash, signed_hash, composite_hash, lifecycle_status, created_at, updated_at, metadata, events')
      .eq('id', documentEntityId)
      .single(),
    supabase
      .from('workflow_signers')
      .select('*', { count: 'exact', head: true })
      .eq('workflow_id', workflowId),
  ]);

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

  const issuedAtRaw = signer.signed_at ?? tsaEvent?.at ?? null;
  const issuedAtSource = signer.signed_at ? 'workflow_signers.signed_at' : 'tsa.confirmed.at';

  const certificate = buildCanonicalEcoCertificate({
    document_entity_id: documentEntityId,
    document_name: entity.source_name ?? null,
    source_mime: (entity as any).source_mime ?? null,
    source_hash: entity.source_hash ?? null,
    witness_hash: witnessHash,
    signed_hash: entity.signed_hash ?? null,
    issued_at: issuedAtRaw,
    issued_at_source_override: issuedAtSource,
    events: events,
    workflow_id: workflowId || null,
    evidence_scope: 'accumulated_document_evidence',
    snapshot_kind: 'signer_snapshot',
    witness_hash_for_snapshot: witnessHash,
    signer: {
      id: signer.id,
      email: signer.email ?? null,
      name: signer.name ?? null,
      step_index: signer.signing_order ?? null,
      step_total: signerCount ?? null,
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

  const deliveredAt = new Date().toISOString();

  await appendEvent(
    supabase as any,
    documentEntityId,
    {
      kind: 'signature.evidence.generated',
      at: deliveredAt,
      correlation_id: correlationId,
      payload: notificationPayload,
    },
    'generate-signature-evidence',
  );

  // Evidence Delivery Protocol — records how the evidence was made available to the signer.
  // method 'ui': system uploaded the ECO to storage and surfaced it on the completion screen.
  // method 'email': system sent it by email (fire when evidence emails are re-enabled).
  // method 'owner_resend': owner manually delivered via the "ver detalle" download.
  await appendEvent(
    supabase as any,
    documentEntityId,
    {
      kind: 'signature.evidence.delivery',
      at: deliveredAt,
      correlation_id: correlationId,
      payload: {
        signer_id: signerId,
        step_index: signer.signing_order ?? null,
        method: 'ui',
        witness_hash: witnessHash,
        artifact_path: artifactPath,
      },
    },
    'generate-signature-evidence',
  );

  return jsonResponse({ success: true, artifact_path: artifactPath });
});
