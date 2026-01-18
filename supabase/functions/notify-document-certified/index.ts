import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { sendEmail, buildDocumentCertifiedEmail } from '../_shared/email.ts';
import { getUserDocumentId } from '../_shared/eventHelper.ts';

// TODO(canon): support document_entity_id (see docs/EDGE_CANON_MIGRATION_PLAN.md)


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
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { documentId, documentEntityId } = await req.json();

    if (!documentId && !documentEntityId) {
      throw new Error('documentId or documentEntityId is required');
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get document info
    const resolvedDocumentId = documentId
      ?? (documentEntityId ? await getUserDocumentId(supabase, documentEntityId) : null);

    if (!resolvedDocumentId) {
      throw new Error('Document not found');
    }

    const { data: document, error: docError } = await supabase
      .from('user_documents')
      .select('id, document_name, user_id, created_at, eco_data')
      .eq('id', resolvedDocumentId)
      .single();

    if (docError || !document) {
      throw new Error(`Document not found: ${docError?.message}`);
    }

    // Get owner info
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(document.user_id);

    if (userError || !user || !user.email) {
      throw new Error(`Owner not found: ${userError?.message}`);
    }

    // Extract forensic info from eco_data
    const hasForensicHardening = document.eco_data?.metadata?.forensicEnabled === true;
    const hasLegalTimestamp = document.eco_data?.signatures?.[0]?.legalTimestamp !== null;
    const hasPolygonAnchor = document.eco_data?.metadata?.anchoring?.polygon === true;

    // Build and send email
    const emailPayload = await buildDocumentCertifiedEmail({
      ownerEmail: user.email,
      ownerName: user.user_metadata?.full_name || user.user_metadata?.name,
      documentName: document.document_name,
      certifiedAt: document.created_at,
      documentId: document.id,
      hasForensicHardening,
      hasLegalTimestamp,
      hasPolygonAnchor,
      siteUrl: Deno.env.get('SITE_URL')
    });

    const result = await sendEmail(emailPayload);

    return new Response(
      JSON.stringify({ success: true, emailId: result.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error sending document certified notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
