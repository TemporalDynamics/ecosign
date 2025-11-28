import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signnow-signature, x-signnow-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const signNowApiBase = Deno.env.get('SIGNNOW_API_BASE_URL')?.replace(/\/$/, '') || 'https://api.signnow.com';
const signNowApiKey = Deno.env.get('SIGNNOW_API_KEY');
const webhookSecret = Deno.env.get('SIGNNOW_WEBHOOK_SECRET');

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials for webhook');
}

const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
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

const verifyHmacSignature = async (rawBody: string, headerSignature: string | null): Promise<boolean> => {
  if (!webhookSecret) return true; // nothing to verify
  if (!headerSignature) return false;

  const normalizedHeader = headerSignature.replace(/^sha256=/i, '').trim();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const signatureBytes = new Uint8Array(signatureBuffer);
  const hexSignature = Array.from(signatureBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const base64Signature = btoa(String.fromCharCode(...signatureBytes));

  return normalizedHeader === hexSignature || normalizedHeader === base64Signature;
};

const extractDocumentId = (payload: Record<string, unknown>): string | null => {
  const candidates = [
    payload.document_id,
    payload.documentId,
    (payload.data as Record<string, unknown> | undefined)?.document_id,
    (payload.document as Record<string, unknown> | undefined)?.id
  ].filter(Boolean);

  const docId = candidates[0];
  return typeof docId === 'string' ? docId : null;
};

const downloadSignedDocument = async (documentId: string): Promise<Uint8Array> => {
  if (!signNowApiKey) {
    throw new Error('SIGNNOW_API_KEY is required to download signed document');
  }

  const response = await fetch(`${signNowApiBase}/document/${documentId}/download?type=collapsed`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${signNowApiKey}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to download signed document (${response.status}): ${errorText}`);
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
};

const uploadToStorage = async (fileBytes: Uint8Array, userId: string | null, documentId: string) => {
  if (!supabaseAdmin) throw new Error('Supabase admin client not configured');

  const fileName = `${userId || 'signnow'}/${documentId}-signed-${Date.now()}.pdf`;
  const { data, error } = await supabaseAdmin.storage
    .from('user-documents')
    .upload(fileName, new Blob([fileBytes], { type: 'application/pdf' }), { upsert: false });

  if (error) throw error;
  return data?.path || fileName;
};

const updateIntegrationRecord = async (
  documentId: string,
  storagePath: string | null,
  eventType: string | null,
  rawPayload: Record<string, unknown>
) => {
  if (!supabaseAdmin) return { integration: null };

  const { data: integration } = await supabaseAdmin
    .from('integration_requests')
    .select('*')
    .eq('service', 'signnow')
    .or(`external_service_id.eq.${documentId},metadata->>signNowDocumentId.eq.${documentId}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!integration) return { integration: null };

  const metadata = {
    ...(integration.metadata || {}),
    signnow_status: 'completed',
    signnow_signed_pdf_path: storagePath,
    signnow_event: eventType,
    signnow_payload: rawPayload
  };

  const { error } = await supabaseAdmin
    .from('integration_requests')
    .update({
      status: 'completed',
      external_service_id: integration.external_service_id || documentId,
      metadata
    })
    .eq('id', integration.id);

  if (error) {
    console.error('Failed to update integration_requests', error);
  }

  return { integration };
};

const updateUserDocument = async (
  documentId: string,
  storagePath: string | null,
  fileBytes: Uint8Array,
  userIdFallback: string | null
) => {
  if (!supabaseAdmin) return;

  const { data: userDoc } = await supabaseAdmin
    .from('user_documents')
    .select('*')
    .eq('signnow_document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!userDoc) {
    console.warn('No user_document found for signnow_document_id', documentId);
    return;
  }

  const storagePathToUse = storagePath || `${userDoc.user_id || userIdFallback || 'signnow'}/${documentId}-signed-${Date.now()}.pdf`;
  let finalPath = storagePathToUse;

  if (!storagePath) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from('user-documents')
        .upload(storagePathToUse, new Blob([fileBytes], { type: 'application/pdf' }), { upsert: false });
      if (error) throw error;
      finalPath = data?.path || storagePathToUse;
    } catch (e) {
      console.error('Failed to upload signed PDF for user_document', e);
    }
  }

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from('user_documents')
    .update({
      signnow_status: 'completed',
      signed_at: now,
      status: 'signed',
      overall_status: userDoc.overall_status === 'pending_anchor' ? 'pending_anchor' : 'certified',
      pdf_storage_path: finalPath,
      document_size: fileBytes.byteLength,
      last_event_at: now,
      download_enabled: true
    })
    .eq('id', userDoc.id);

  if (error) {
    console.error('Failed to update user_documents', error);
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const rawBody = await req.text();
  const signatureHeader = req.headers.get('x-signnow-signature') || req.headers.get('X-Signnow-Signature');
  const tokenHeader = req.headers.get('x-signnow-token') || req.headers.get('X-Signnow-Token');

  try {
    const valid = await verifyHmacSignature(rawBody, signatureHeader);
    if (!valid) {
      return jsonResponse({ error: 'Invalid webhook signature' }, 401);
    }
  } catch (err) {
    console.error('Signature verification failed', err);
    return jsonResponse({ error: 'Signature verification failed' }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }

  const documentId = extractDocumentId(payload);
  const eventType = typeof payload.event === 'string' ? payload.event : (typeof payload.type === 'string' ? payload.type : null);

  if (!documentId) {
    console.warn('Webhook received without document_id', payload);
    return jsonResponse({ error: 'Missing document_id' }, 400);
  }

  // Only act on completion events
  const lowerEvent = eventType?.toLowerCase() || '';
  const isCompleted = lowerEvent.includes('completed') || lowerEvent.includes('finalized') || lowerEvent.includes('signed');

  if (!isCompleted) {
    console.log(`Received non-completion event (${eventType || 'unknown'}) for document ${documentId}`);
    return jsonResponse({ ok: true, ignored: true });
  }

  try {
    const signedPdf = await downloadSignedDocument(documentId);

    // Try to find integration to infer user_id and update metadata
    const { integration } = await updateIntegrationRecord(documentId, null, eventType, {
      ...payload,
      token: tokenHeader || undefined
    });

    const userId = integration?.user_id || null;
    let storagePath: string | null = null;

    try {
      storagePath = await uploadToStorage(signedPdf, userId, documentId);
    } catch (uploadErr) {
      console.error('Failed initial storage upload, will try per-document fallback', uploadErr);
    }

    // Update integration with storage path if we have it
    if (integration && storagePath) {
      await updateIntegrationRecord(documentId, storagePath, eventType, {
        ...payload,
        token: tokenHeader || undefined
      });
    }

    // Update user_documents and, if needed, upload there
    await updateUserDocument(documentId, storagePath, signedPdf, userId);

    return jsonResponse({ ok: true, document_id: documentId, stored_path: storagePath, event: eventType || 'completed' }, 200);
  } catch (error) {
    console.error('Error handling SignNow webhook', error);
    return jsonResponse({ error: (error as Error).message || 'Unexpected error' }, 500);
  }
});
