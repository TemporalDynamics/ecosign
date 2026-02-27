import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { getCorsHeaders } from '../_shared/cors.ts';
import { sendEmail, buildDocumentCertifiedEmail } from '../_shared/email.ts';
import { getDocumentEntityId } from '../_shared/eventHelper.ts';


serve(async (req: Request) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined);

  if (Deno.env.get('FASE') !== '1') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

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

    const { data: legacyDocument } = documentId
      ? await supabase
        .from('documents')
        .select('id, owner_id, title, document_entity_id, created_at')
        .eq('id', documentId)
        .maybeSingle()
      : { data: null as any };

    const resolvedDocumentEntityId = documentEntityId
      ?? legacyDocument?.document_entity_id
      ?? (documentId ? await getDocumentEntityId(supabase, documentId) : null);

    if (!resolvedDocumentEntityId) {
      throw new Error('Document entity not found');
    }

    const { data: entity, error: entityError } = await supabase
      .from('document_entities')
      .select('id, owner_id, source_name, metadata, events, created_at')
      .eq('id', resolvedDocumentEntityId)
      .single();

    if (entityError || !entity) {
      throw new Error(`Document entity not found: ${entityError?.message}`);
    }

    // Get owner info
    const ownerId = entity.owner_id ?? legacyDocument?.owner_id ?? null;
    if (!ownerId) {
      throw new Error('Document owner not found');
    }

    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(ownerId);

    if (userError || !user || !user.email) {
      throw new Error(`Owner not found: ${userError?.message}`);
    }

    const events = Array.isArray(entity.events) ? entity.events : [];
    const protectedRequested = events.find((event: any) => event?.kind === 'document.protected.requested');

    // Extract forensic signals from canonical metadata/events.
    const hasForensicHardening = entity.metadata?.forensicEnabled === true
      || protectedRequested?.payload?.protection_details?.forensic_enabled === true;
    const hasLegalTimestamp = events.some((event: any) => event?.kind === 'tsa.confirmed' || event?.kind === 'tsa');
    const hasPolygonAnchor = events.some((event: any) => {
      if (!event || (event.kind !== 'anchor' && event.kind !== 'anchor.confirmed')) return false;
      const network = event.anchor?.network ?? event.payload?.network ?? null;
      return network === 'polygon';
    });

    const resolvedDocumentName = entity.source_name
      ?? legacyDocument?.title
      ?? `Documento ${resolvedDocumentEntityId.slice(0, 8)}`;
    const resolvedCertifiedAt = protectedRequested?.at
      ?? entity.created_at
      ?? legacyDocument?.created_at
      ?? new Date().toISOString();

    // Build and send email
    const emailPayload = await buildDocumentCertifiedEmail({
      ownerEmail: user.email,
      ownerName: user.user_metadata?.full_name || user.user_metadata?.name,
      documentName: resolvedDocumentName,
      certifiedAt: resolvedCertifiedAt,
      documentId: documentId ?? resolvedDocumentEntityId,
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
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
