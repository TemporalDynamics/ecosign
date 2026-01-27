import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { appendEvent } from '../_shared/eventHelper.ts';
import { processArtifact, type ArtifactInput } from '../../../packages/artifact-processor/src/index.ts';

type BuildArtifactRequest = {
  document_entity_id: string;
  document_id?: string;
  artifact_format?: string;
  artifact_version?: string;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

async function emitEvent(
  supabase: ReturnType<typeof createClient>,
  documentEntityId: string,
  event: { kind: string; at: string; payload?: Record<string, unknown> },
  source: string,
): Promise<void> {
  const result = await appendEvent(supabase, documentEntityId, event, source);
  if (!result.success) {
    throw new Error(result.error ?? 'Failed to append event');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204 });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const body = (await req.json().catch(() => ({}))) as Partial<BuildArtifactRequest>;
  const documentEntityId = String(body.document_entity_id ?? '');

  if (!documentEntityId) {
    return jsonResponse({ error: 'document_entity_id required' }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: entity, error: entityError } = await supabase
    .from('document_entities')
    .select('id, events, witness_current_storage_path, created_at')
    .eq('id', documentEntityId)
    .single();

  if (entityError || !entity) {
    return jsonResponse({ error: 'document_entity not found' }, 404);
  }

  const events = Array.isArray(entity.events) ? entity.events : [];
  if (events.some((event: { kind?: string }) => event.kind === 'artifact.finalized')) {
    return jsonResponse({ success: true, noop: true });
  }

  if (events.some((event: { kind?: string }) => event.kind === 'artifact.failed')) {
    return jsonResponse({ success: true, noop: true });
  }

  const witnessPath = entity.witness_current_storage_path as string | null;
  if (!witnessPath) {
    await emitEvent(
      supabase,
      documentEntityId,
      {
        kind: 'artifact.failed',
        at: new Date().toISOString(),
        payload: { reason: 'missing_witness_pdf', retryable: false },
      },
      'build-artifact',
    );
    return jsonResponse({ error: 'missing_witness_pdf' }, 400);
  }

  try {
    const download = await supabase.storage.from('user-documents').download(witnessPath);
    if (download.error || !download.data) {
      await emitEvent(
        supabase,
        documentEntityId,
        {
          kind: 'artifact.failed',
          at: new Date().toISOString(),
          payload: { reason: 'pdf_download_failed', retryable: true },
        },
        'build-artifact',
      );
      return jsonResponse({ error: 'pdf_download_failed' }, 500);
    }

    const pdfBytes = new Uint8Array(await download.data.arrayBuffer());
    const tsaEvent = events.find((event: { kind?: string }) => event.kind === 'tsa.confirmed') as
      | { payload?: Record<string, unknown> }
      | undefined;
    const tokenB64 = typeof tsaEvent?.payload?.['token_b64'] === 'string'
      ? String(tsaEvent.payload?.['token_b64'])
      : null;
    const tsaToken = tokenB64 ? Uint8Array.from(atob(tokenB64), (c) => c.charCodeAt(0)) : null;

    const input: ArtifactInput = {
      pdf_base: pdfBytes,
      signatures: [],
      tsa_token: tsaToken,
      anchors: [],
      metadata: {
        document_entity_id: documentEntityId,
        created_at: entity.created_at ?? new Date().toISOString(),
        artifact_version: 'v1',
      },
    };

    const result = await processArtifact(input);
    const artifactPath = `artifacts/${documentEntityId}/${result.artifact_version}.pdf`;
    const upload = await supabase.storage
      .from('user-documents')
      .upload(artifactPath, new Blob([result.artifact], { type: result.mime }), {
        upsert: true,
        contentType: result.mime,
      });

    if (upload.error) {
      await emitEvent(
        supabase,
        documentEntityId,
        {
          kind: 'artifact.failed',
          at: new Date().toISOString(),
          payload: { reason: 'artifact_upload_failed', retryable: true },
        },
        'build-artifact',
      );
      return jsonResponse({ error: 'artifact_upload_failed' }, 500);
    }

    await emitEvent(
      supabase,
      documentEntityId,
      {
        kind: 'artifact.finalized',
        at: new Date().toISOString(),
        payload: {
          artifact_storage_path: artifactPath,
          artifact_hash: result.hash,
          mime: result.mime,
          size_bytes: result.size_bytes,
          artifact_version: result.artifact_version,
        },
      },
      'build-artifact',
    );

    return jsonResponse({ success: true, artifact_storage_path: artifactPath });
  } catch (error) {
    await emitEvent(
      supabase,
      documentEntityId,
      {
        kind: 'artifact.failed',
        at: new Date().toISOString(),
        payload: { reason: 'artifact_build_failed', retryable: true },
      },
      'build-artifact',
    );
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});
