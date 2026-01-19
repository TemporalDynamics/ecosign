import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { parseJsonBody } from '../_shared/validation.ts';
import { AcceptInviteNdaSchema } from '../_shared/schemas.ts';

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

    // Parse request body
    const parsed = await parseJsonBody(req, AcceptInviteNdaSchema);
    if (!parsed.ok) {
      return new Response(
        JSON.stringify({ error: parsed.error, details: parsed.details }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { token } = parsed.data;

    // Find invite by token
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('*, user_documents(id, document_name, user_id)')
      .eq('token', token)
      .single();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invite token' }),
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

    // Check if NDA already accepted
    if (invite.nda_accepted_at) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'NDA already accepted',
          invite: {
            email: invite.email,
            role: invite.role,
            ndaAcceptedAt: invite.nda_accepted_at
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client IP and user agent
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     req.headers.get('x-real-ip') ||
                     'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Update invite with NDA acceptance
    const { data: updatedInvite, error: updateError } = await supabase
      .from('invites')
      .update({
        nda_accepted_at: new Date().toISOString(),
        nda_ip_address: clientIP,
        nda_user_agent: userAgent,
        accessed_at: new Date().toISOString()
      })
      .eq('id', invite.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update invite:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to accept NDA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'NDA accepted successfully',
        invite: {
          email: updatedInvite.email,
          role: updatedInvite.role,
          ndaAcceptedAt: updatedInvite.nda_accepted_at
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Accept NDA error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
