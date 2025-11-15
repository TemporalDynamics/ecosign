import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1?target=deno';

type Signer = {
  email: string;
  name?: string;
  role?: string;
  order?: number;
  reminder_days?: number;
  authentication_type?: 'none' | 'email' | 'sms' | 'phone_call';
};

type DocumentFile = {
  name?: string;
  type?: string;
  size?: number;
  base64: string;
};

type SignNowRequestBody = {
  documentId?: string;
  documentHash?: string;
  documentName?: string;
  action?: 'esignature' | 'workflow';
  signers?: Signer[];
  documentFile?: DocumentFile;
  userId?: string | null;
  metadata?: Record<string, unknown>;
  requireNdaEmbed?: boolean;
  message?: string;
  subject?: string;
  redirectUrl?: string;
  declineRedirectUrl?: string;
  signature?: {
    image: string;
    placement: {
      page: number;
      xPercent: number;
      yPercent: number;
      widthPercent: number;
      heightPercent: number;
    };
  } | null;
};

type IntegrationStatus = 'processing' | 'completed' | 'failed';

type SignNowUploadResponse = {
  id?: string;
  document_id?: string;
  [key: string]: unknown;
};

type SignNowInviteResponse = {
  id?: string;
  result_id?: string;
  invites?: Array<{ id?: string; email?: string; role?: string }>;
  [key: string]: unknown;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const SIGNNOW_PRICING: Record<string, { amount: number; currency: string; description: string }> = {
  esignature: {
    amount: 4.99,
    currency: 'USD',
    description: 'Advanced electronic signature via SignNow'
  },
  workflow: {
    amount: 9.99,
    currency: 'USD',
    description: 'Complete SignNow workflow with audit trail'
  }
};

const signNowApiBase = Deno.env.get('SIGNNOW_API_BASE_URL')?.replace(/\/$/, '') || 'https://api.signnow.com';
const signNowApiKey = Deno.env.get('SIGNNOW_API_KEY')
  || Deno.env.get('SIGNNOW_APY_KEY')
  || Deno.env.get('SIGNNOW_API_TOKEN');

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables.');
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

const base64ToUint8Array = (base64: string): Uint8Array => {
  const cleaned = base64.split(',').pop() ?? '';
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const uint8ToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
};

const applySignatureToPdf = async (
  pdfBytes: Uint8Array,
  signature: NonNullable<SignNowRequestBody['signature']>
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const totalPages = pdfDoc.getPageCount();
  const targetIndex = Math.min(Math.max(signature.placement.page - 1, 0), Math.max(totalPages - 1, 0));
  const page = pdfDoc.getPage(targetIndex);
  const signatureBytes = base64ToUint8Array(signature.image);
  const pngImage = await pdfDoc.embedPng(signatureBytes);

  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();

  const width = Math.min(Math.max(signature.placement.widthPercent * pageWidth, 10), pageWidth);
  const height = Math.min(Math.max(signature.placement.heightPercent * pageHeight, 10), pageHeight);
  const x = Math.min(Math.max(signature.placement.xPercent * pageWidth, 0), pageWidth - width);
  const yFromTop = signature.placement.yPercent * pageHeight;
  const y = Math.min(Math.max(pageHeight - yFromTop - height, 0), pageHeight - height);

  page.drawImage(pngImage, {
    x,
    y,
    width,
    height
  });

  return await pdfDoc.save();
};

const ensureSupabaseClient = () => {
  if (!supabaseAdmin) {
    throw new Error('Supabase client is not configured');
  }
  return supabaseAdmin;
};

const updateIntegrationStatus = async (
  requestId: string,
  status: IntegrationStatus,
  metadataPatch: Record<string, unknown> = {}
) => {
  const client = ensureSupabaseClient();
  const { error } = await client
    .from('integration_requests')
    .update({
      status,
      metadata: metadataPatch.metadata ?? metadataPatch,
      external_service_id: metadataPatch.external_service_id ?? metadataPatch.signNowInviteId ?? null
    })
    .eq('id', requestId);

  if (error) {
    console.error('Failed to update integration status', error);
  }
};

const uploadDocumentToSignNow = async (
  fileBytes: Uint8Array,
  metadata: { name?: string; type?: string },
  documentName?: string
): Promise<SignNowUploadResponse> => {
  if (!signNowApiKey) {
    throw new Error('SIGNNOW_API_KEY env var is required to upload documents');
  }

  const fileBlob = new Blob([fileBytes], {
    type: metadata.type || 'application/pdf'
  });

  const formData = new FormData();
  formData.append('file', fileBlob, metadata.name || documentName || 'document.pdf');
  if (documentName) {
    formData.append('document_name', documentName);
  }

  const response = await fetch(`${signNowApiBase}/document`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${signNowApiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SignNow upload failed (${response.status}): ${errorText}`);
  }

  const uploadResult = await response.json() as SignNowUploadResponse;
  if (!uploadResult.id && !uploadResult.document_id) {
    throw new Error('SignNow did not return a document ID');
  }

  return uploadResult;
};

const createSignNowInvite = async (
  documentId: string,
  signers: Signer[],
  options: { subject?: string; message?: string; redirectUrl?: string; declineRedirectUrl?: string } = {}
): Promise<SignNowInviteResponse> => {
  if (!signNowApiKey) {
    throw new Error('SIGNNOW_API_KEY env var is required to create invites');
  }

  const invitePayload = {
    document_id: documentId,
    invite_actions: signers.map((signer, index) => ({
      email: signer.email,
      role: signer.role || `Signer ${index + 1}`,
      order: signer.order ?? index + 1,
      reminder: signer.reminder_days ?? 2,
      authentication_type: signer.authentication_type || 'email',
      first_name: signer.name?.split(' ')[0] || '',
      last_name: signer.name?.split(' ').slice(1).join(' ') || ''
    })),
    cc: [],
    subject: options.subject || 'Signature request from VerifySign',
    message: options.message || 'Please review and sign the attached document.',
    redirect_uri: options.redirectUrl,
    decline_redirect_uri: options.declineRedirectUrl
  };

  const response = await fetch(`${signNowApiBase}/api/v2/documents/${documentId}/embedded-invites`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${signNowApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(invitePayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SignNow invite failed (${response.status}): ${errorText}`);
  }

  return await response.json() as SignNowInviteResponse;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let integrationRequestId: string | null = null;
  let computedMetadata: Record<string, unknown> | null = null;

  try {

    const body = await req.json() as SignNowRequestBody;
    const {
      documentId,
      documentHash,
      documentName,
      action = 'esignature',
      signers,
      documentFile,
      userId,
      metadata = {},
      requireNdaEmbed = false,
      message,
      subject,
      redirectUrl,
      declineRedirectUrl,
      signature
    } = body;

    if (!Array.isArray(signers) || signers.length === 0) {
      return jsonResponse({ error: 'At least one signer is required' }, 400);
    }

    if (!documentFile?.base64) {
      return jsonResponse({ error: 'Missing original document payload (documentFile.base64)' }, 400);
    }

    const client = ensureSupabaseClient();

    const baseMetadata = {
      documentName: documentName || documentFile.name,
      documentHash,
      signerCount: signers.length,
      requireNdaEmbed,
      signatureEmbedded: Boolean(signature?.image),
      ...metadata
    };
    computedMetadata = baseMetadata;

    const { data: integrationRecord, error: insertError } = await client
      .from('integration_requests')
      .insert({
        service: 'signnow',
        action,
        document_id: documentId,
        user_id: userId ?? null,
        document_hash: documentHash,
        status: 'processing',
        metadata: baseMetadata
      })
      .select()
      .single();

    if (insertError || !integrationRecord) {
      console.error('Failed to create integration record', insertError);
      return jsonResponse({ error: 'Internal error creating integration request' }, 500);
    }

    integrationRequestId = integrationRecord.id;

    if (!signNowApiKey) {
      await updateIntegrationStatus(integrationRecord.id, 'failed', {
        ...baseMetadata,
        error: 'SIGNNOW_API_KEY missing'
      });
      return jsonResponse({ error: 'SignNow API key is not configured' }, 500);
    }

    let fileBytes = base64ToUint8Array(documentFile.base64);
    let embeddedBase64: string | null = null;

    if (signature?.image && signature?.placement) {
      fileBytes = await applySignatureToPdf(fileBytes, signature);
      embeddedBase64 = uint8ToBase64(fileBytes);
    }

    const uploadResult = await uploadDocumentToSignNow(fileBytes, {
      name: documentFile.name,
      type: documentFile.type
    }, documentName);
    const signNowDocumentId = uploadResult.id || uploadResult.document_id;

    if (!signNowDocumentId) {
      throw new Error('Missing SignNow document ID');
    }

    const inviteResult = await createSignNowInvite(signNowDocumentId, signers, {
      subject: subject || `Solicitud de firma: ${documentName || documentFile.name || 'Documento'}`,
      message: message || 'Por favor revisa y firma el documento. Este proceso utiliza SignNow para garantizar validez legal.',
      redirectUrl,
      declineRedirectUrl
    });

    const pricing = SIGNNOW_PRICING[action] || SIGNNOW_PRICING.esignature;

    const responsePayload = {
      service: 'signnow',
      action,
      description: pricing.description,
      amount: pricing.amount,
      currency: pricing.currency,
      payment_options: { stripe: true },
      features: [
        'Legal-grade signature & audit trail (SignNow)',
        'Signer identity tracking + IP log',
        signature?.image ? 'Firma autógrafa incrustada en el PDF' : 'Preparado para firma manual',
        requireNdaEmbed
          ? 'NDA embed prepared for SignNow workflow'
          : 'Optional NDA embed for additional protection'
      ],
      status: 'completed',
      integration_request_id: integrationRecord.id,
      signnow_document_id: signNowDocumentId,
      signnow_invite_id: inviteResult.id || inviteResult.result_id || null,
      invite: inviteResult,
      metadata: {
        ...baseMetadata,
        signNowDocumentId,
        signNowInviteId: inviteResult.id || inviteResult.result_id || null,
        signaturePlacement: signature?.placement || null
      },
      signed_pdf_base64: embeddedBase64
    };

    await updateIntegrationStatus(integrationRecord.id, 'completed', {
      metadata: responsePayload.metadata,
      signNowInviteId: responsePayload.signnow_invite_id,
      external_service_id: responsePayload.signnow_invite_id || signNowDocumentId
    });

    return jsonResponse(responsePayload, 200);
  } catch (error) {
    console.error('SignNow function error', error);
    const message = error instanceof Error ? error.message : String(error);
    try {
      // Attempt to update the integration record if it was created
      const metadata = computedMetadata ? { ...computedMetadata, error: message } : { error: message };
      if (typeof integrationRequestId === 'string') {
        await updateIntegrationStatus(integrationRequestId, 'failed', { metadata });
      }
    } catch (updateError) {
      console.error('Unable to mark integration as failed', updateError);
    }
    return jsonResponse({ error: message || 'Unexpected error' }, 500);
  }
});
