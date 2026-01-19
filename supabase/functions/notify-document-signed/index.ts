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
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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

    // Obtener información completa del signer_link y documento
    const { data: signerLink, error: linkError } = await supabase
      .from('signer_links')
      .select(`
        id,
        signer_email,
        signer_name,
        signed_at,
        status,
        user_documents (
          id,
          document_name,
          user_id,
          auth.users (
            email
          )
        )
      `)
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

    // Obtener email del owner
    const { data: owner } = await supabase
      .from('auth.users')
      .select('email')
      .eq('id', signerLink.user_documents.user_id)
      .single();

    if (!owner?.email) {
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
      documentName: signerLink.user_documents.document_name,
      signerName: signerLink.signer_name || 'Firmante',
      signerEmail: signerLink.signer_email,
      signedAt: signerLink.signed_at,
      documentId: signerLink.user_documents.id,
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
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error inesperado: ' + error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
