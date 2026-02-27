import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { readEcoxRuntimeMetadata } from '../_shared/ecoxRuntime.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const looksLikePdfPath = (value: unknown): value is string => {
  const path = asNonEmptyString(value);
  if (!path) return false;
  return path.toLowerCase().includes('.pdf');
};

const mapLegacyStatuses = (lifecycleStatus: unknown): { status: string; overallStatus: string } => {
  const status = asNonEmptyString(lifecycleStatus);
  switch (status) {
    case 'anchored':
      return { status: 'signed', overallStatus: 'certified' };
    case 'signed':
      return { status: 'signed', overallStatus: 'pending_anchor' };
    case 'revoked':
      return { status: 'rejected', overallStatus: 'revoked' };
    case 'archived':
      return { status: 'expired', overallStatus: 'archived' };
    case 'in_signature_flow':
      return { status: 'pending', overallStatus: 'pending' };
    case 'needs_witness':
    case 'witness_ready':
    case 'protected':
    default:
      return { status: 'pending', overallStatus: 'pending' };
  }
};

async function createSignedUrlWithFallback(
  supabase: any,
  path: string,
): Promise<string | null> {
  const buckets = ['user-documents', 'documents'];
  for (const bucket of buckets) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600);
    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  }
  return null;
}

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
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
        JSON.stringify({ error: 'No authorization header', needsLogin: true }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', needsLogin: true }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { inviteToken } = body;

    if (!inviteToken) {
      return new Response(
        JSON.stringify({ error: 'Invite token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find invite by token
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('id, token, email, role, document_id, document_entity_id, expires_at, revoked_at, nda_accepted_at, accepted_at, accessed_at')
      .eq('token', inviteToken)
      .single();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: 'Invalid invite token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if invite is expired
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Invite has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if invite is revoked
    if (invite.revoked_at) {
      return new Response(
        JSON.stringify({ error: 'Invite has been revoked' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if NDA was accepted
    if (!invite.nda_accepted_at) {
      return new Response(
        JSON.stringify({ error: 'NDA must be accepted first', needsNDA: true }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user email matches invite email
    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return new Response(
        JSON.stringify({
          error: `This invite is for ${invite.email}. Please log in with that account.`,
          invitedEmail: invite.email,
          currentEmail: user.email
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let documentEntityId = asNonEmptyString((invite as any).document_entity_id);
    if (!documentEntityId && asNonEmptyString((invite as any).document_id)) {
      const { data: documentRow } = await supabase
        .from('documents')
        .select('document_entity_id')
        .eq('id', String((invite as any).document_id))
        .maybeSingle();
      documentEntityId = asNonEmptyString((documentRow as any)?.document_entity_id);
    }

    if (!documentEntityId) {
      return new Response(
        JSON.stringify({ error: 'Document entity not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: entity, error: entityError } = await supabase
      .from('document_entities')
      .select(`
        id,
        source_name,
        source_hash,
        witness_hash,
        signed_hash,
        lifecycle_status,
        created_at,
        source_storage_path,
        witness_current_storage_path,
        metadata
      `)
      .eq('id', documentEntityId)
      .single();

    if (entityError || !entity) {
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if ((entity as any).lifecycle_status === 'revoked' || (entity as any).lifecycle_status === 'archived') {
      return new Response(
        JSON.stringify({ error: 'Document is no longer available' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark as accepted if not already
    if (!invite.accepted_at) {
      await supabase
        .from('invites')
        .update({
          accepted_at: new Date().toISOString(),
          accessed_at: new Date().toISOString()
        })
        .eq('id', invite.id);
    } else {
      // Update last accessed
      await supabase
        .from('invites')
        .update({ accessed_at: new Date().toISOString() })
        .eq('id', invite.id);
    }

    const runtime = readEcoxRuntimeMetadata((entity as any).metadata ?? {});
    const pdfCandidates = [
      looksLikePdfPath((entity as any).witness_current_storage_path)
        ? String((entity as any).witness_current_storage_path)
        : null,
      looksLikePdfPath((entity as any).source_storage_path)
        ? String((entity as any).source_storage_path)
        : null,
      looksLikePdfPath(runtime.encrypted_path)
        ? runtime.encrypted_path
        : null,
    ].filter((value): value is string => typeof value === 'string' && value.length > 0);

    let pdfUrl = null;
    for (const path of [...new Set(pdfCandidates)]) {
      const signed = await createSignedUrlWithFallback(supabase, path);
      if (signed) {
        pdfUrl = signed;
        break;
      }
    }

    const documentHash =
      asNonEmptyString((entity as any).signed_hash)
      ?? asNonEmptyString((entity as any).witness_hash)
      ?? asNonEmptyString((entity as any).source_hash);
    const statuses = mapLegacyStatuses((entity as any).lifecycle_status);

    return new Response(
      JSON.stringify({
        success: true,
        access: {
          role: invite.role,
          canView: true,
          canSign: invite.role === 'signer',
          document: {
            document_entity_id: documentEntityId,
            name: asNonEmptyString((entity as any).source_name) ?? `Documento ${documentEntityId.slice(0, 8)}`,
            hash: documentHash,
            status: statuses.status,
            overallStatus: statuses.overallStatus,
            createdAt: (entity as any).created_at,
            pdfUrl
          },
          invite: {
            expiresAt: invite.expires_at,
            acceptedAt: invite.accepted_at,
            ndaAcceptedAt: invite.nda_accepted_at
          }
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Verify access error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
