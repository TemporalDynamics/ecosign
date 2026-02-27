import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { parseJsonBody } from '../_shared/validation.ts';
import { AcceptInviteNdaSchema } from '../_shared/schemas.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }

  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined);

  if (req.method === 'OPTIONS') {
    if (!isAllowed) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }
    return new Response('ok', { headers: corsHeaders });
  }

  if (!isAllowed) {
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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
      .select('id, document_id, document_entity_id, email, role, expires_at, revoked_at, nda_accepted_at')
      .eq('token', token)
      .single();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invite token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const isExpired = invite.expires_at ? new Date(invite.expires_at) < now : false;
    const isRevoked = Boolean(invite.revoked_at);
    const alreadyAccepted = Boolean(invite.nda_accepted_at);

    const legacyDecision = Boolean(!isExpired && !isRevoked && !alreadyAccepted);
    const canonicalDecision = Boolean(!isExpired && !isRevoked && !alreadyAccepted);

    try {
      await supabase.from('shadow_decision_logs').insert({
        decision_code: 'D18_ACCEPT_INVITE_NDA',
        workflow_id: null,
        signer_id: null,
        legacy_decision: legacyDecision,
        canonical_decision: canonicalDecision,
        context: {
          operation: 'accept-invite-nda',
          invite_id: invite.id,
          expires_at: invite.expires_at,
          revoked_at: invite.revoked_at,
          nda_accepted_at: invite.nda_accepted_at,
          phase: 'PASO_2_SHADOW_MODE_D18'
        }
      })
    } catch (logError) {
      console.warn('[D18 SHADOW] Log insert failed', logError)
    }

    // Check if invite is expired
    if (isExpired) {
      return new Response(
        JSON.stringify({ error: 'Invite has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if invite is revoked
    if (isRevoked) {
      return new Response(
        JSON.stringify({ error: 'Invite has been revoked' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if NDA already accepted
    if (alreadyAccepted) {
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
