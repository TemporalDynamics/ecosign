import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { appendEvent } from '../_shared/eventHelper.ts';

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
    .select('id, events')
    .eq('id', documentEntityId)
    .single();

  if (entityError || !entity) {
    return jsonResponse({ error: 'document_entity not found' }, 404);
  }

  const events = Array.isArray(entity.events) ? entity.events : [];
  if (events.some((event: { kind?: string }) => event.kind === 'artifact.finalized')) {
    return jsonResponse({ success: true, noop: true });
  }

  await emitEvent(
    supabase,
    documentEntityId,
    {
      kind: 'artifact.failed',
      at: new Date().toISOString(),
      payload: { reason: 'not_implemented', retryable: false },
    },
    'build-artifact',
  );

  return jsonResponse({ success: true, stub: true });
});
