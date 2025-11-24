import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

type AnchorRequest = {
  documentHash: string;
  documentId?: string | null;
  userDocumentId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  metadata?: Record<string, unknown>;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400' // 24 hours
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials for anchor-bitcoin function');
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });

const ensureClient = () => {
  if (!supabaseAdmin) {
    throw new Error('Supabase client is not configured');
  }
  return supabaseAdmin;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json() as AnchorRequest;
    const { documentHash, documentId = null, userDocumentId = null, userId = null, userEmail = null, metadata = {} } = body;

    if (!documentHash || typeof documentHash !== 'string') {
      return jsonResponse({ error: 'documentHash is required' }, 400);
    }

    const client = ensureClient();
    const nowIso = new Date().toISOString();

    // Validate UUID format if userId is provided
    const isValidUUID = (uuid: string | null) => {
      if (!uuid) return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(uuid);
    };

    // Only use userId if it's a valid UUID, otherwise set to null
    const validUserId = userId && isValidUUID(userId) ? userId : null;

    const enrichedMetadata = {
      ...metadata,
      requestedAt: nowIso,
      source: metadata?.['source'] || 'client'
    };

    const { data, error } = await client
      .from('anchors')
      .insert({
        document_hash: documentHash,
        document_id: documentId,
        user_document_id: userDocumentId,
        user_id: validUserId,
        user_email: userEmail,
        anchor_type: 'opentimestamps',
        anchor_status: 'queued',
        metadata: enrichedMetadata
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Failed to insert anchor request', error);
      return jsonResponse({
        error: 'Unable to create anchor request',
        details: error?.message || 'Unknown error',
        code: error?.code,
        hint: error?.hint
      }, 500);
    }

    return jsonResponse({
      anchorId: data.id,
      status: data.anchor_status,
      estimatedTime: '4-24 hours',
      message: 'Bitcoin anchoring queued. This process requires Bitcoin blockchain confirmation and may take 4-24 hours. You will receive an email notification when complete.',
      willNotify: Boolean(userEmail),
      notificationEmail: userEmail,
      record: data
    });
  } catch (error) {
    console.error('anchor-bitcoin error', error);
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message || 'Unexpected error' }, 500);
  }
});
