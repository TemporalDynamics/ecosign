import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.92.0?target=deno';

// TODO(canon): support document_entity_id (see docs/EDGE_CANON_MIGRATION_PLAN.md)

type AnchorRequest = {
  documentHash: string;
  documentId?: string | null;
  userDocumentId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  metadata?: Record<string, unknown>;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
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
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
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

    const isHex64 = /^[0-9a-f]{64}$/i;
    if (!isHex64.test(documentHash.trim())) {
      return jsonResponse({ error: 'Invalid documentHash. Must be 64 hex characters (SHA-256).' }, 400);
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

    let projectId: string | null = typeof (metadata as Record<string, unknown>)?.['projectId'] === 'string'
      ? String((metadata as Record<string, unknown>)['projectId'])
      : null

    // If userDocumentId is provided but document_id, user_email or projectId are missing,
    // fetch them from user_documents to ensure notifications can be sent and state is linked
    let finalDocumentId = documentId
    let finalUserEmail = userEmail
    let finalUserId = validUserId

    if (userDocumentId && (!documentId || !userEmail || !projectId || !finalUserId)) {
      const { data: userDoc } = await client
        .from('user_documents')
        .select('document_id, user_id, eco_data')
        .eq('id', userDocumentId)
        .single()

      if (userDoc) {
        finalDocumentId = finalDocumentId || userDoc.document_id
        finalUserId = finalUserId || userDoc.user_id
        if (!projectId) {
          const ecoData = userDoc.eco_data as Record<string, unknown> | null
          const manifest = (ecoData?.['manifest'] as Record<string, unknown>) || null
          const manifestProjectId = manifest?.['projectId']
          projectId = typeof manifestProjectId === 'string' ? manifestProjectId : projectId
        }

        // Fetch user email if needed
        if (!userEmail && userDoc.user_id) {
          const { data: userData } = await client.auth.admin.getUserById(userDoc.user_id)
          if (userData?.user?.email) {
            finalUserEmail = userData.user.email
          }
        }
      }
    }

    const { data, error } = await client
      .from('anchors')
      .insert({
        document_hash: documentHash,
        document_id: finalDocumentId,
        user_document_id: userDocumentId,
        user_id: finalUserId,
        user_email: finalUserEmail,
        anchor_type: 'opentimestamps',
        anchor_status: 'queued',
        metadata: {
          ...enrichedMetadata,
          projectId: projectId || undefined
        }
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

    if (projectId) {
      const anchorRequestedAt = new Date().toISOString()
      const { error: stateError } = await client
        .from('anchor_states')
        .upsert({
          project_id: projectId,
          anchor_requested_at: anchorRequestedAt
        }, { onConflict: 'project_id' })

      if (stateError) {
        console.warn('Failed to upsert anchor_states for Bitcoin request:', stateError)
      }
    }

    // Update user_documents to reflect Bitcoin anchoring has started
    if (userDocumentId) {
      const { error: updateError } = await client
        .from('user_documents')
        .update({
          overall_status: 'pending_anchor',
          bitcoin_status: 'pending',
          bitcoin_anchor_id: data.id,
          download_enabled: false, // Disable download while Bitcoin is pending
        })
        .eq('id', userDocumentId);

      if (updateError) {
        console.warn('Failed to update user_documents with Bitcoin anchor status:', updateError);
        // Don't fail the request, anchor is already queued
      }
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
