/**
 * Edge Function: log-event
 *
 * Secure event logging with server-side IP capture and verification.
 * Prevents client-side tampering of forensic chain of custody.
 *
 * Security features:
 * - Server-side IP capture (not spoofable by client)
 * - User authentication verification
 * - Document ownership validation
 * - Timestamp generated server-side
 * - Uses SERVICE_ROLE_KEY to bypass RLS
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { getCorsHeaders } from '../_shared/cors.ts';
import { appendEvent, getDocumentEntityId } from '../_shared/eventHelper.ts';


const LEGACY_TO_CANONICAL_KIND: Record<string, string> = {
  created: 'legacy.created',
  sent: 'legacy.sent',
  opened: 'legacy.opened',
  identified: 'legacy.identified',
  signed: 'legacy.signed',
  anchored_polygon: 'legacy.anchored.polygon',
  anchored_bitcoin: 'legacy.anchored.bitcoin',
  verified: 'legacy.verified',
  downloaded: 'legacy.downloaded',
  expired: 'legacy.expired',
  'anchor.attempt': 'anchor.attempt',
  'anchor.confirmed': 'anchor.confirmed',
  'anchor.failed': 'anchor.failed',
};

const VALID_EVENT_TYPES = Object.keys(LEGACY_TO_CANONICAL_KIND);

interface LogEventRequest {
  eventType: string;
  documentId?: string;
  documentEntityId?: string;
  userId?: string;
  signerLinkId?: string;
  actorEmail?: string;
  actorName?: string;
  metadata?: Record<string, any>;
}

serve(async (req: Request) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined);

  if (Deno.env.get('FASE') !== '1') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Handle CORS preflight
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
    // Get Supabase clients
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: LogEventRequest = await req.json();
    const { eventType, documentId, documentEntityId, userId, signerLinkId, actorEmail, actorName, metadata } = body;

    // Validate event type
    if (!VALID_EVENT_TYPES.includes(eventType)) {
      return new Response(
        JSON.stringify({ error: `Invalid event type: ${eventType}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate documentId
    if (!documentId && !documentEntityId) {
      return new Response(
        JSON.stringify({ error: 'documentId or documentEntityId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resolvedDocumentEntityId = documentEntityId
      ?? (documentId ? await getDocumentEntityId(supabaseAdmin, documentId) : null);

    if (!resolvedDocumentEntityId) {
      return new Response(
        JSON.stringify({ error: 'Document not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: entity, error: entityError } = await supabaseAdmin
      .from('document_entities')
      .select('id, owner_id')
      .eq('id', resolvedDocumentEntityId)
      .maybeSingle();

    if (entityError || !entity || entity.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Document not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Capture forensic data SERVER-SIDE (not spoofable)
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                      req.headers.get('x-real-ip') ||
                      'Unknown';
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const timestamp = new Date().toISOString();

    const canonicalKind = LEGACY_TO_CANONICAL_KIND[eventType];
    const eventData = {
      kind: canonicalKind,
      timestamp,
      document_entity_id: resolvedDocumentEntityId,
      document_id: documentId ?? null,
      actor_email: actorEmail || user.email || null,
      actor_name: actorName || null,
      signer_link_id: signerLinkId || null,
      user_id: userId || user.id,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: metadata || {},
    };

    const result = await appendEvent(
      supabaseAdmin,
      resolvedDocumentEntityId,
      {
        kind: canonicalKind,
        at: timestamp,
        actor: user.id,
        legacy: {
          event_type: eventType,
          ...eventData,
        },
      },
      'log-event'
    );

    if (!result.success) {
      console.error('❌ Error appending event:', result.error);
      return new Response(
        JSON.stringify({ error: 'Failed to log event', details: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Event logged successfully: ${eventType} for ${resolvedDocumentEntityId}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...eventData,
          at: timestamp,
          kind: canonicalKind,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
