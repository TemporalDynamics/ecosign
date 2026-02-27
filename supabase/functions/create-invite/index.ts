import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { withRateLimit } from '../_shared/ratelimit.ts';

interface CreateInviteRequest {
  documentId?: string;
  documentEntityId?: string;
  email: string;
  role: 'viewer' | 'signer';
  expiresInDays?: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value: string | undefined | null): value is string =>
  typeof value === 'string' && UUID_RE.test(value);

async function resolveDocumentRefs(
  supabase: any,
  documentId?: string,
  documentEntityId?: string,
): Promise<{ documentEntityId: string | null; legacyDocumentId: string | null }> {
  let resolvedEntityId = isUuid(documentEntityId) ? documentEntityId : null;
  let resolvedLegacyId = isUuid(documentId) ? documentId : null;

  if (resolvedLegacyId) {
    const { data: byDocumentId } = await supabase
      .from('documents')
      .select('id, document_entity_id')
      .eq('id', resolvedLegacyId)
      .maybeSingle();

    if (byDocumentId) {
      resolvedLegacyId = byDocumentId.id as string;
      if (!resolvedEntityId && typeof (byDocumentId as any).document_entity_id === 'string') {
        resolvedEntityId = String((byDocumentId as any).document_entity_id);
      }
    } else if (!resolvedEntityId) {
      // Legacy callers may send a document_entity_id in documentId.
      resolvedEntityId = resolvedLegacyId;
      resolvedLegacyId = null;
    }
  }

  if (resolvedEntityId && !resolvedLegacyId) {
    const { data: byEntity } = await supabase
      .from('documents')
      .select('id')
      .eq('document_entity_id', resolvedEntityId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (byEntity?.id) {
      resolvedLegacyId = String(byEntity.id);
    }
  }

  return {
    documentEntityId: resolvedEntityId,
    legacyDocumentId: resolvedLegacyId,
  };
}

serve(withRateLimit('invite', async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: CreateInviteRequest = await req.json();
    const { documentId, documentEntityId, email, role, expiresInDays = 30 } = body;

    // Validate inputs
    if ((!documentId && !documentEntityId) || !email || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: documentId or documentEntityId, email, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['viewer', 'signer'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be viewer or signer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const refs = await resolveDocumentRefs(supabase, documentId, documentEntityId);
    if (!refs.documentEntityId) {
      return new Response(
        JSON.stringify({ error: 'Document entity not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: entity, error: entityError } = await supabase
      .from('document_entities')
      .select('id, owner_id, source_name')
      .eq('id', refs.documentEntityId)
      .single();

    if (entityError || !entity) {
      return new Response(
        JSON.stringify({ error: 'Document entity not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if ((entity as any).owner_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'You do not own this document' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique token using the database function
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('generate_invite_token');

    if (tokenError || !tokenData) {
      console.error('Failed to generate token:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate invite token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token_value = tokenData as string;

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create invite
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .insert({
        document_id: refs.legacyDocumentId,
        document_entity_id: refs.documentEntityId,
        email: email.toLowerCase().trim(),
        role,
        token: token_value,
        expires_at: expiresAt.toISOString(),
        invited_by: user.id
      })
      .select()
      .single();

    if (inviteError || !invite) {
      console.error('Failed to create invite:', inviteError);
      return new Response(
        JSON.stringify({
          error: 'Failed to create invite',
          details: inviteError?.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate invite URL
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://ecosign.app';
    const inviteUrl = `${frontendUrl}/invite/${token_value}`;

    return new Response(
      JSON.stringify({
        success: true,
        invite: {
          token: token_value,
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expires_at,
          inviteUrl
        },
        message: 'Invite created successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Create invite error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
