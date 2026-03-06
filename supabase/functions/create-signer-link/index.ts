/**
 * Edge Function: create-signer-link
 *
 * Crea un link único para que un firmante externo pueda firmar un documento.
 *
 * Request Body:
 * {
 *   documentEntityId: string (UUID canónico del document_entities.id)
 *   signerEmail: string (email del firmante)
 *   signerName?: string (nombre prellenado, opcional)
 * }
 *
 * Response:
 * {
 *   success: boolean
 *   signerLink?: {
 *     token: string
 *     link: string
 *     expiresAt: string
 *   }
 *   error?: string
 * }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { sendEmail, buildSignerInvitationEmail } from '../_shared/email.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { parseJsonBody } from '../_shared/validation.ts';
import { CreateSignerLinkSchema } from '../_shared/schemas.ts';

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  const { headers: corsHeaders, isAllowed } = getCorsHeaders(req.headers.get('origin') || undefined);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (!isAllowed) {
    return new Response('CORS not allowed', { status: 403, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? ''

    if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Supabase environment configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requesterClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: requesterData, error: requesterError } = await requesterClient.auth.getUser();
    const requester = requesterData?.user;

    if (requesterError || !requester) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Crear cliente Supabase con service role key
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Obtener datos del request
    const parsed = await parseJsonBody(req, CreateSignerLinkSchema);
    if (!parsed.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: parsed.error,
          details: parsed.details
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    const { documentEntityId, signerEmail, signerName } = parsed.data;

    console.log('📧 [create-signer-link] Request:', {
      documentEntityId,
      hasSignerName: Boolean(signerName)
    });

    const { data: entity, error: entityError } = await supabase
      .from('document_entities')
      .select('id, owner_id, source_name')
      .eq('id', documentEntityId)
      .single();

    if (entityError || !entity) {
      console.error('❌ [create-signer-link] Documento no encontrado:', entityError);
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

    if ((entity as any).owner_id !== requester.id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No autorizado para este documento'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generar token único
    const token = crypto.randomUUID();

    // Crear signer_link en la base de datos (entity-only, sin document_id)
    const { data: signerLink, error: linkError } = await supabase
      .from('signer_links')
      .insert({
        document_entity_id: documentEntityId,
        owner_id: requester.id,
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
      expiresAt: signerLink.expires_at
    });

    // Registrar evento 'sent' en la tabla events (entity-based)
    const { error: eventError } = await supabase
      .from('events')
      .insert({
        document_entity_id: documentEntityId,
        event_type: 'sent',
        signer_link_id: signerLink.id,
        actor_email: signerEmail,
        actor_name: signerName || null,
        metadata: {
          linkToken: token,
          expiresAt: signerLink.expires_at,
          documentName: (entity as any).source_name
        }
      });

    if (eventError) {
      console.warn('⚠️ [create-signer-link] Error al registrar evento:', eventError);
    }

    // Construir URL del link
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';
    const signLink = `${frontendUrl}/sign/${token}`;

    // Enviar email de invitación
    console.log('📬 [create-signer-link] Enviando email de invitación');

    const emailPayload = await buildSignerInvitationEmail({
      signerEmail: signerEmail,
      signerName: signerName || null,
      documentName: (entity as any).source_name || 'Documento',
      signLink: signLink,
      expiresAt: signerLink.expires_at,
      senderName: signerName || undefined,
      siteUrl: frontendUrl
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
