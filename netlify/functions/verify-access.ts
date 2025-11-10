import { Handler, HandlerEvent } from '@netlify/functions';
import { createHash } from 'crypto';
import { getSupabaseClient } from './utils/supabase';
import { checkRateLimit, getClientIp, RATE_LIMITS } from './utils/rateLimit';
import { validateVerifyAccessParams } from './utils/validation';
import { getSignedUrl } from './utils/storage';
import {
  successResponse,
  errorResponse,
  rateLimitError,
  validationError,
  notFoundError,
  serverError
} from './utils/response';

/**
 * Netlify Function: verify-access
 *
 * Verifica un token de acceso y permite al receptor ver el documento.
 * Si require_nda=true, registra la aceptación del NDA.
 *
 * POST /.netlify/functions/verify-access
 * Body: {
 *   token: string (64 chars hex)
 *   otp?: string (6 digits, opcional)
 * }
 */
export const handler: Handler = async (event: HandlerEvent) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // Solo POST
  if (event.httpMethod !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Rate limiting
    const ip = getClientIp(event.headers);
    const rateLimitResult = checkRateLimit(ip, RATE_LIMITS['verify-access']);

    if (!rateLimitResult.allowed) {
      return rateLimitError(rateLimitResult.retryAfter!);
    }

    // Parse body
    const body = JSON.parse(event.body || '{}');

    // Validate params
    const validation = validateVerifyAccessParams(body);
    if (!validation.valid) {
      return validationError(validation.error!);
    }

    const { token } = validation.data!;
    // TODO: OTP validation will be implemented in Week 2
    // const { otp } = validation.data!;

    // Hash del token
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Supabase client
    const supabase = getSupabaseClient();

    // Buscar link
    const { data: link, error: linkError } = await supabase
      .from('links')
      .select(`
        id,
        document_id,
        expires_at,
        revoked_at,
        require_nda,
        documents (
          id,
          title,
          eco_hash,
          owner_id
        )
      `)
      .eq('token_hash', tokenHash)
      .is('revoked_at', null)
      .single();

    if (linkError || !link) {
      return notFoundError('Link not found, revoked, or invalid');
    }

    // Verificar expiración
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return errorResponse('Link expired', 410, 'LINK_EXPIRED');
    }

    // Buscar recipient
    const { data: recipient, error: recipientError } = await supabase
      .from('recipients')
      .select('id, email, recipient_id')
      .eq('document_id', link.document_id)
      .single();

    if (recipientError || !recipient) {
      return serverError('Recipient not found');
    }

    // TODO: Validar OTP si está configurado
    // Por ahora asumimos que OTP es válido o no se requiere

    // Si require_nda, registrar aceptación
    if (link.require_nda) {
      const ua = event.headers['user-agent'] || 'unknown';

      // Generar hash del NDA (placeholder por ahora)
      const ndaHash = createHash('sha256')
        .update(`${recipient.id}:${link.document_id}:${Date.now()}`)
        .digest('hex');

      const { error: ndaError } = await supabase
        .from('nda_acceptances')
        .insert({
          recipient_id: recipient.id,
          eco_nda_hash: ndaHash,
          ip_address: ip,
          user_agent: ua,
          signature_data: {
            token_used: tokenHash.substring(0, 16), // Primeros 16 chars para audit
            accepted_via: 'web'
          }
        });

      if (ndaError) {
        console.error('NDA acceptance insert error:', ndaError);
        // No fallar la request, pero loguear
      }
    }

    // Generar signed URL para el archivo .ECO
    // Path format: {owner_id}/{document_id}/certificate.eco
    const document = link.documents as any;
    const filePath = `${document.owner_id}/${document.id}/certificate.eco`;

    let downloadUrl: string;
    try {
      downloadUrl = await getSignedUrl('eco-files', filePath, 300); // 5 minutos
    } catch (storageError) {
      console.error('Storage signed URL error:', storageError);
      // Fallback: retornar sin URL de descarga
      downloadUrl = '';
    }

    // Retornar datos del documento
    return successResponse({
      document_id: document.id,
      title: document.title,
      eco_hash: document.eco_hash,
      download_url: downloadUrl,
      recipient_id: recipient.recipient_id,
      expires_in: link.expires_at
        ? Math.max(0, Math.floor((new Date(link.expires_at).getTime() - Date.now()) / 1000))
        : null,
      nda_required: link.require_nda,
      nda_accepted: link.require_nda // Si llegamos aquí, ya fue aceptado
    });

  } catch (error) {
    console.error('verify-access error:', error);
    return serverError('An unexpected error occurred');
  }
};
