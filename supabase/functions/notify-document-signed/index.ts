/**
 * Edge Function: notify-document-signed
 *
 * Envía email de notificación al owner del documento
 * cuando un firmante completa la firma.
 *
 * Request Body:
 * {
 *   signerLinkId: string (UUID del signer_link)
 * }
 *
 * Response:
 * {
 *   success: boolean
 *   emailSent?: boolean
 *   error?: string
 * }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { sendEmail, buildDocumentSignedEmail } from '../_shared/email.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requireCronSecret = (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  const provided = req.headers.get('x-cron-secret') ?? '';
  if (!cronSecret || provided !== cronSecret) {
    return new Response('Forbidden', { status: 403, headers: corsHeaders });
  }
  return null;
};

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authError = requireCronSecret(req);
  if (authError) return authError;

  try {
    // Crear cliente Supabase con service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obtener datos del request
    const { signerLinkId } = await req.json();

    console.log('📧 [notify-document-signed] Request:', { signerLinkId });

    // Validar datos obligatorios
    if (!signerLinkId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'signerLinkId es obligatorio'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Obtener información del signer_link
    const { data: signerLink, error: linkError } = await supabase
      .from('signer_links')
      .select('id, signer_email, signer_name, signed_at, status, document_id, document_entity_id')
      .eq('id', signerLinkId)
      .single();

    if (linkError || !signerLink) {
      console.error('❌ [notify-document-signed] Signer link no encontrado:', linkError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Signer link no encontrado'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verificar que esté firmado
    if (signerLink.status !== 'signed' || !signerLink.signed_at) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'El documento aún no fue firmado'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let documentEntityId = asNonEmptyString((signerLink as any).document_entity_id);

    if (!documentEntityId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'document_entity_id no disponible para signer_link'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { data: entity, error: entityError } = await supabase
      .from('document_entities')
      .select('id, owner_id, source_name')
      .eq('id', documentEntityId)
      .single();

    if (entityError || !entity) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Document entity no encontrada'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const ownerId = asNonEmptyString((entity as any).owner_id);
    if (!ownerId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Owner no disponible para document_entity'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Obtener email del owner desde Auth Admin API
    const { data: ownerData, error: ownerError } = await supabase.auth.admin.getUserById(ownerId);
    const owner = ownerData?.user;

    if (ownerError || !owner?.email) {
      console.warn('⚠️ [notify-document-signed] Owner email no encontrado');
      return new Response(
        JSON.stringify({
          success: true,
          emailSent: false,
          error: 'Owner email no disponible'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Preparar email
    const emailPayload = await buildDocumentSignedEmail({
      ownerEmail: owner.email,
      documentName: asNonEmptyString((entity as any).source_name) ?? 'Documento',
      signerName: signerLink.signer_name || 'Firmante',
      signerEmail: signerLink.signer_email,
      signedAt: signerLink.signed_at,
      documentEntityId: documentEntityId,
      siteUrl: Deno.env.get('SITE_URL')
    });

    // Enviar email
    console.log('📬 [notify-document-signed] Enviando email a:', owner.email);

    const emailResult = await sendEmail(emailPayload);

    if (!emailResult.success) {
      console.error('❌ [notify-document-signed] Error al enviar email:', emailResult.error);
      return new Response(
        JSON.stringify({
          success: true, // La firma se completó exitosamente
          emailSent: false,
          error: 'Email notification failed: ' + emailResult.error
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ [notify-document-signed] Email enviado exitosamente. ID:', emailResult.id);

    // Respuesta exitosa
    return new Response(
      JSON.stringify({
        success: true,
        emailSent: true,
        emailId: emailResult.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ [notify-document-signed] Error inesperado:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error inesperado: ' + message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
