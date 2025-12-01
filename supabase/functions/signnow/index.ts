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

type IntegrationStatus = 'processing' | 'pending_signnow' | 'completed' | 'failed';

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

const signNowApiBase = Deno.env.get('SIGNNOW_API_BASE_URL')?.replace(/\/$/, '') || 'https://api-eval.signnow.com';
const signNowBasic = Deno.env.get('SIGNNOW_BASIC_TOKEN') || '';
const signNowClientId = Deno.env.get('SIGNNOW_CLIENT_ID') || '';
const signNowClientSecret = Deno.env.get('SIGNNOW_CLIENT_SECRET') || '';

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

const fetchSignNowAccessToken = async (): Promise<string> => {
  if (!signNowBasic || !signNowClientId || !signNowClientSecret) {
    throw new Error('Missing SignNow credentials');
  }
  const body = new URLSearchParams();
  body.append('grant_type', 'client_credentials');
  body.append('client_id', signNowClientId);
  body.append('client_secret', signNowClientSecret);
  body.append('scope', '*');

  const resp = await fetch(`${signNowApiBase}/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${signNowBasic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`SignNow token failed (${resp.status}): ${txt}`);
  }
  const data = await resp.json();
  if (!data.access_token) {
    throw new Error('SignNow token missing access_token');
  }
  return data.access_token;
};

const uploadDocumentToSignNow = async (
  accessToken: string,
  fileBytes: Uint8Array,
  metadata: { name?: string; type?: string },
  documentName?: string
): Promise<SignNowUploadResponse> => {
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
      Authorization: `Bearer ${accessToken}`
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

  // Use SignNow v1 invite endpoint (standard)
  // API: POST /document/{document_id}/invite
  // Use "sn_login" - sends email to signer with SignNow login/registration link
  const invitePayload = {
    to: signers.map((signer, index) => ({
      email: signer.email,
      role: signer.role || `Signer ${index + 1}`,
      order: signer.order ?? (index + 1),
      authentication_type: signer.authentication_type || 'sn_login',
      expiration_days: 30,
      reminder: signer.reminder_days ?? 2
    })),
    from: options.subject || 'EcoSign <no-reply@mail.ecosign.app>',
    cc: [],
    subject: options.subject || 'Solicitud de firma - EcoSign',
    message: options.message || 'Por favor, firma este documento usando SignNow. Recibirás un email con las instrucciones.'
  };

  console.log('📧 Creating SignNow invite for document:', documentId);
  console.log('Invite payload:', JSON.stringify(invitePayload, null, 2));

  const response = await fetch(`${signNowApiBase}/document/${documentId}/invite`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await fetchSignNowAccessToken()}`,
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

/**
 * Download the completed/signed document from SignNow with forensic metadata
 * This includes the audit trail and all signature metadata for legal validity
 */
const downloadSignedDocument = async (documentId: string): Promise<Uint8Array | null> => {
  try {
    const token = await fetchSignNowAccessToken();
    // Download with audit trail (collapsed view)
    const response = await fetch(`${signNowApiBase}/document/${documentId}/download?type=collapsed`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.warn(`Failed to download signed document (${response.status})`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);

  } catch (error) {
    console.error('Error downloading signed document from SignNow:', error);
    return null;
  }
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

    // Validate userId is a valid UUID or null
    // If userId is not a valid UUID (e.g., "user-dashboard-local"), set it to null
    const isValidUuid = (str: string | null | undefined): boolean => {
      if (!str) return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };

    const validUserId = (userId && isValidUuid(userId)) ? userId : null;

    if (userId && !validUserId) {
      console.warn(`⚠️ Invalid userId format: "${userId}" - setting to null`);
    }

    // Optional: integration_requests table (ignore errors if not present)
    try {
      const { data: integrationRecord, error: insertError } = await client
        .from('integration_requests')
        .insert({
          service: 'signnow',
          action,
          document_id: documentId,
          user_id: validUserId,
          document_hash: documentHash,
          status: 'processing',
          metadata: baseMetadata
        })
        .select()
        .single();

      if (insertError) {
        console.warn('integration_requests insert skipped:', insertError);
      } else {
        integrationRequestId = integrationRecord?.id ?? null;
      }
    } catch (e) {
      console.warn('integration_requests table not available, skipping', e?.message || e);
    }

    let fileBytes = base64ToUint8Array(documentFile.base64);

    // Validate PDF can be loaded
    try {
      const testPdf = await PDFDocument.load(fileBytes);
      const pageCount = testPdf.getPageCount();
      console.log(`✅ PDF validation successful: ${pageCount} pages`);

      // Check if PDF is encrypted
      if (testPdf.isEncrypted) {
        throw new Error('PDF is encrypted or password-protected. Please remove encryption before signing.');
      }
    } catch (pdfError) {
      const errorMsg = pdfError instanceof Error ? pdfError.message : String(pdfError);
      console.error('❌ PDF validation failed:', errorMsg);
      throw new Error(`Invalid PDF file: ${errorMsg}`);
    }

    // Embed signature visually in PDF before uploading to SignNow
    // This ensures the signature appears in the final document
    if (signature?.image && signature?.placement) {
      try {
        console.log('📝 Embedding signature in PDF...');
        fileBytes = await applySignatureToPdf(fileBytes, signature);
        console.log('✅ Signature embedded successfully');

        // Validate the modified PDF can still be read
        const modifiedPdf = await PDFDocument.load(fileBytes);
        console.log(`✅ Modified PDF validated: ${modifiedPdf.getPageCount()} pages`);
      } catch (embedError) {
        const errorMsg = embedError instanceof Error ? embedError.message : String(embedError);
        console.error('❌ Signature embedding failed:', errorMsg);
        throw new Error(`Failed to embed signature: ${errorMsg}`);
      }
    }

    const uploadResult = await uploadDocumentToSignNow(fileBytes, {
      name: documentFile.name,
      type: documentFile.type
    }, documentName);
    const signNowDocumentId = uploadResult.id || uploadResult.document_id;

    if (!signNowDocumentId) {
      throw new Error('Missing SignNow document ID');
    }

    console.log(`✅ Document uploaded to SignNow with ID: ${signNowDocumentId}`);

    // Crear invitación estándar (se usará embed en frontend con signing URL)
    const accessToken = await fetchSignNowAccessToken();
    const inviteResult = await createSignNowInvite(accessToken, signNowDocumentId, signers, {
      subject,
      message,
      redirectUrl,
      declineRedirectUrl
    });

    // URL embebible (mejor esfuerzo; dependen del producto de SignNow)
    const signingUrl = inviteResult?.invites?.[0]?.id
      ? `${signNowAppBase}/webapp/document/${signNowDocumentId}/invite/${inviteResult.invites[0].id}`
      : null;

    // Use the PDF we just created (with embedded signature)
    // It's already stored in SignNow for audit trail purposes
    const signedDocumentBytes = fileBytes; // The PDF with embedded signature
    const signedDocumentBase64 = uint8ToBase64(signedDocumentBytes);

    console.log('✅ Returning PDF with embedded signature');
    console.log(`📦 Document stored in SignNow (ID: ${signNowDocumentId}) for audit trail`);

    // The PDF is ready immediately since we embedded the signature locally
    const finalSignedPdf = signedDocumentBase64;

    const pricing = SIGNNOW_PRICING[action] || SIGNNOW_PRICING.esignature;

    const responsePayload = {
      service: 'signnow',
      action,
      description: pricing.description,
      amount: pricing.amount,
      currency: pricing.currency,
      payment_options: { stripe: true },
      features: [
        '✅ Documento subido a SignNow para firma legal',
        '⏳ Esperando firma en flujo SignNow (embed/link)',
        signature?.image ? '✅ Firma visual incrustada localmente (preliminar)' : 'Firma digital pendiente',
        requireNdaEmbed ? '✅ NDA protection enabled' : 'Standard signature workflow'
      ],
      legal_compliance: {
        usa: ['ESIGN Act', 'UETA'],
        eu: ['eIDAS - Advanced Electronic Signature (AES)'],
        international: ['100+ countries recognize electronic signatures'],
        audit_trail: true,
        tamper_evident: true,
        signer_authentication: signers[0].authentication_type || 'email'
      },
      status: 'pending_signnow',
      integration_request_id: integrationRecord.id,
      signnow_document_id: signNowDocumentId,
      signnow_invite_id: inviteResult.id || inviteResult.result_id || null,
      invite: inviteResult,
      signing_url: signingUrl,
      metadata: {
        ...baseMetadata,
        signNowDocumentId,
        signNowInviteId: inviteResult.id || null,
        signingUrl,
        signaturePlacement: signature?.placement || null,
        hasForensicPdf: false,
        pdfStatus: 'pending_signnow',
        signatureMethod: 'embedded',
        storedInSignNow: true,
        requiresSignerAction: true
      },
      // PDF preliminar con firma embebida localmente, útil para mostrar mientras
      signed_pdf_base64: finalSignedPdf,
      next_steps: 'SignNow enviará los eventos al webhook cuando el documento esté firmado. El PDF final con audit trail se descargará y guardará automáticamente.'
    };

    // Optional: update integration status, ignore if table missing
    if (integrationRequestId) {
      try {
        await supabaseAdmin
          ?.from('integration_requests')
          .update({
            status: 'pending_signnow',
            metadata: responsePayload.metadata,
            external_service_id: responsePayload.signnow_invite_id || signNowDocumentId
          })
          .eq('id', integrationRequestId);
      } catch (e) {
        console.warn('integration_requests update skipped', e?.message || e);
      }
    }

    return jsonResponse(responsePayload, 200);
  } catch (error) {
    console.error('SignNow function error', error);
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message || 'Unexpected error' }, 500);
  }
});
