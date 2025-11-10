import { Handler, HandlerEvent } from '@netlify/functions';
import { randomBytes, createHash } from 'crypto';
import { getSupabaseClient } from './utils/supabase';
import { checkRateLimit, getClientIp, RATE_LIMITS } from './utils/rateLimit';
import { validateCSRFToken } from './utils/csrf';
import { validateGenerateLinkParams } from './utils/validation';
import {
  successResponse,
  errorResponse,
  rateLimitError,
  validationError,
  unauthorizedError,
  serverError
} from './utils/response';

/**
 * Netlify Function: generate-link
 *
 * Genera un enlace seguro para compartir un documento con un receptor.
 * El receptor deberá aceptar el NDA antes de acceder al documento.
 *
 * POST /.netlify/functions/generate-link
 * Body: {
 *   document_id: string (UUID)
 *   recipient_email: string
 *   expires_in_hours?: number (default: 24)
 *   require_nda?: boolean (default: true)
 * }
 *
 * Headers:
 *   X-CSRF-Token: string (required)
 *   Authorization: Bearer <jwt> (required)
 */
export const handler: Handler = async (event: HandlerEvent) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
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
    const rateLimitResult = checkRateLimit(ip, RATE_LIMITS['generate-link']);

    if (!rateLimitResult.allowed) {
      return rateLimitError(rateLimitResult.retryAfter!);
    }

    // CSRF validation
    const csrfToken = event.headers['x-csrf-token'];
    if (!csrfToken || !validateCSRFToken(csrfToken)) {
      return unauthorizedError('Invalid CSRF token');
    }

    // Auth validation
    const authHeader = event.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorizedError('Missing or invalid authorization header');
    }

    // Parse body
    const body = JSON.parse(event.body || '{}');

    // Validate params
    const validation = validateGenerateLinkParams(body);
    if (!validation.valid) {
      return validationError(validation.error!);
    }

    const { document_id, recipient_email, expires_in_hours, require_nda } = validation.data!;

    // Supabase client
    const supabase = getSupabaseClient();

    // Verificar que el documento existe y pertenece al usuario
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, owner_id, title')
      .eq('id', document_id)
      .eq('status', 'active')
      .single();

    if (docError || !document) {
      return errorResponse('Document not found or inactive', 404);
    }

    // TODO: Verificar que el usuario autenticado es el owner
    // Extraer user_id del JWT y comparar con document.owner_id

    // Generar token único (64 chars hex)
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Calcular expiración
    const expiresAt = new Date(Date.now() + expires_in_hours! * 3600000);

    // Crear recipient
    const recipientId = randomBytes(16).toString('hex');
    const { data: recipient, error: recipientError } = await supabase
      .from('recipients')
      .insert({
        document_id,
        email: recipient_email,
        recipient_id: recipientId
      })
      .select()
      .single();

    if (recipientError) {
      console.error('Recipient insert error:', recipientError);
      return serverError('Failed to create recipient');
    }

    // Crear link
    const { data: link, error: linkError } = await supabase
      .from('links')
      .insert({
        document_id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        require_nda
      })
      .select()
      .single();

    if (linkError) {
      console.error('Link insert error:', linkError);
      return serverError('Failed to create link');
    }

    // Construir URL de acceso
    const baseUrl = process.env.NETLIFY_SITE_URL || process.env.URL || 'http://localhost:8888';
    const accessUrl = `${baseUrl}/nda/${token}`;

    // Retornar respuesta
    return successResponse({
      link_id: link.id,
      recipient_id: recipient.id,
      access_url: accessUrl,
      expires_at: expiresAt.toISOString(),
      require_nda
    }, 201);

  } catch (error) {
    console.error('generate-link error:', error);
    return serverError('An unexpected error occurred');
  }
};
