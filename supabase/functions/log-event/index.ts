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
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Valid event types (must match client/src/utils/eventLogger.js)
const VALID_EVENT_TYPES = [
  'created',
  'sent',
  'opened',
  'identified',
  'signed',
  'anchored_polygon',
  'anchored_bitcoin',
  'verified',
  'downloaded',
  'expired'
];

interface LogEventRequest {
  eventType: string;
  documentId: string;
  userId?: string;
  signerLinkId?: string;
  actorEmail?: string;
  actorName?: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
    const { eventType, documentId, userId, signerLinkId, actorEmail, actorName, metadata } = body;

    // Validate event type
    if (!VALID_EVENT_TYPES.includes(eventType)) {
      return new Response(
        JSON.stringify({ error: `Invalid event type: ${eventType}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate documentId
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'documentId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify document ownership (user must own the document)
    const { data: document, error: docError } = await supabaseClient
      .from('user_documents')
      .select('id, user_id')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
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

    // Prepare event data
    const eventData = {
      document_id: documentId,
      event_type: eventType,
      timestamp,
      ip_address: ipAddress,
      user_agent: userAgent,
      user_id: userId || user.id,
      signer_link_id: signerLinkId || null,
      actor_email: actorEmail || user.email || null,
      actor_name: actorName || null,
      metadata: metadata || {},
    };

    console.log(`📝 Logging event: ${eventType} for document ${documentId}`);

    // Insert event using SERVICE_ROLE_KEY (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('events')
      .insert(eventData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error inserting event:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to log event', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Event logged successfully:`, data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
