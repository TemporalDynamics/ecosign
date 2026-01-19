import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

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
      .select(`
        *,
        user_documents (
          document_entity_id,
          document_name,
          document_hash,
          pdf_storage_path,
          eco_data,
          status,
          overall_status,
          created_at,
          user_id
        )
      `)
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

    // Get signed URL for PDF if path exists
    let pdfUrl = null;
    if (invite.user_documents.pdf_storage_path) {
      const { data: urlData } = await supabase.storage
        .from('user-documents')
        .createSignedUrl(invite.user_documents.pdf_storage_path, 3600);
      pdfUrl = urlData?.signedUrl || null;
    }

    return new Response(
      JSON.stringify({
        success: true,
        access: {
          role: invite.role,
          canView: true,
          canSign: invite.role === 'signer',
          document: {
            document_entity_id: invite.user_documents.document_entity_id,
            name: invite.user_documents.document_name,
            hash: invite.user_documents.document_hash,
            status: invite.user_documents.status,
            overallStatus: invite.user_documents.overall_status,
            createdAt: invite.user_documents.created_at,
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
