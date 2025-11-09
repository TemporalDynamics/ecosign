import { Handler, HandlerEvent } from '@netlify/functions';
import { getSupabaseClient } from './utils/supabase';
import { checkRateLimit, getClientIp, RATE_LIMITS } from './utils/rateLimit';
import { validateLogEventParams } from './utils/validation';
import {
  successResponse,
  errorResponse,
  rateLimitError,
  validationError,
  serverError
} from './utils/response';

/**
 * Netlify Function: log-event
 *
 * Registra un evento de acceso al documento (view, download, forward).
 * Usado para auditoría y trazabilidad del VerifyTracker.
 *
 * POST /.netlify/functions/log-event
 * Body: {
 *   recipient_id: string (UUID)
 *   event_type: 'view' | 'download' | 'forward'
 *   session_id?: string (opcional)
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
    // Rate limiting (más permisivo para logs)
    const ip = getClientIp(event.headers);
    const rateLimitResult = checkRateLimit(ip, RATE_LIMITS['log-event']);

    if (!rateLimitResult.allowed) {
      return rateLimitError(rateLimitResult.retryAfter!);
    }

    // Parse body
    const body = JSON.parse(event.body || '{}');

    // Validate params
    const validation = validateLogEventParams(body);
    if (!validation.valid) {
      return validationError(validation.error!);
    }

    const { recipient_id, event_type, session_id } = validation.data!;

    // Supabase client
    const supabase = getSupabaseClient();

    // Verificar que el recipient existe
    const { data: recipient, error: recipientError } = await supabase
      .from('recipients')
      .select('id')
      .eq('id', recipient_id)
      .single();

    if (recipientError || !recipient) {
      return errorResponse('Recipient not found', 404);
    }

    // Capturar metadatos
    const ua = event.headers['user-agent'] || 'unknown';
    const country = event.headers['x-vercel-ip-country'] ||
                    event.headers['cf-ipcountry'] ||
                    'Unknown';

    // Insertar evento
    const { data: accessEvent, error: eventError } = await supabase
      .from('access_events')
      .insert({
        recipient_id,
        event_type,
        ip_address: ip,
        user_agent: ua,
        country,
        session_id: session_id || null
      })
      .select('id, timestamp')
      .single();

    if (eventError) {
      console.error('Access event insert error:', eventError);
      return serverError('Failed to log event');
    }

    // Retornar confirmación
    return successResponse({
      event_id: accessEvent.id,
      timestamp: accessEvent.timestamp,
      message: 'Event logged successfully'
    }, 201);

  } catch (error) {
    console.error('log-event error:', error);
    return serverError('An unexpected error occurred');
  }
};
