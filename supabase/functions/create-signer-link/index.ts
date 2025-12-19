/**
 * Edge Function: create-signer-link
 *
 * Crea un link único para que un firmante externo pueda firmar un documento.
 *
 * Request Body:
 * {
 *   documentId: string (UUID del documento)
 *   signerEmail: string (email del firmante)
 *   signerName?: string (nombre prellenado, opcional)
 * }
 *
 * Response:
 * {
 *   success: boolean
 *   signerLink?: {
 *     id: string
 *     token: string
 *     link: string
 *     expiresAt: string
 *   }
 *   error?: string
 * }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail, buildSignerInvitationEmail } from '../_shared/email.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Crear cliente Supabase con service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obtener datos del request
    const { documentId, signerEmail, signerName } = await req.json();

    console.log('📧 [create-signer-link] Request:', {
      documentId,
      signerEmail,
      signerName: signerName || '(sin prellenar)'
    });

    // Validar datos obligatorios
    if (!documentId || !signerEmail) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'documentId y signerEmail son obligatorios'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signerEmail)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Formato de email inválido'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Obtener información del documento
    const { data: document, error: docError } = await supabase
      .from('user_documents')
      .select('user_id, document_name')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      console.error('❌ [create-signer-link] Documento no encontrado:', docError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Documento no encontrado'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generar token único
    const token = crypto.randomUUID();

    // Crear signer_link en la base de datos
    const { data: signerLink, error: linkError } = await supabase
      .from('signer_links')
      .insert({
        document_id: documentId,
        owner_id: document.user_id,
        signer_email: signerEmail,
        signer_name: signerName || null,
        token: token,
        status: 'pending'
      })
      .select()
      .single();

    if (linkError) {
      console.error('❌ [create-signer-link] Error al crear link:', linkError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error al crear link de firma: ' + linkError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ [create-signer-link] Link creado:', {
      id: signerLink.id,
      token: token,
      expiresAt: signerLink.expires_at
    });

    // Registrar evento 'sent' en la tabla events
    const { error: eventError } = await supabase
      .from('events')
      .insert({
        document_id: documentId,
        event_type: 'sent',
        signer_link_id: signerLink.id,
        actor_email: signerEmail,
        actor_name: signerName || null,
        metadata: {
          linkToken: token,
          expiresAt: signerLink.expires_at,
          documentName: document.document_name
        }
      });

    if (eventError) {
      console.warn('⚠️ [create-signer-link] Error al registrar evento:', eventError);
      // No fallar la request por esto, solo logear
    }

    // Construir URL del link
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';
    const signLink = `${frontendUrl}/sign/${token}`;

    // Enviar email de invitación
    console.log('📬 [create-signer-link] Enviando email a:', signerEmail);

    const emailPayload = buildSignerInvitationEmail({
      signerEmail: signerEmail,
      documentName: document.document_name,
      signLink: signLink,
      expiresAt: signerLink.expires_at,
      senderName: signerName || undefined
    });

    const emailResult = await sendEmail(emailPayload);

    if (!emailResult.success) {
      console.warn('⚠️ [create-signer-link] Email falló (no crítico):', emailResult.error);
      // No fallar la request - el link sigue siendo válido
    } else {
      console.log('✅ [create-signer-link] Email enviado exitosamente. ID:', emailResult.id);
    }

    // Respuesta exitosa
    return new Response(
      JSON.stringify({
        success: true,
        signerLink: {
          id: signerLink.id,
          token: token,
          link: signLink,
          expiresAt: signerLink.expires_at
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ [create-signer-link] Error inesperado:', error);
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
