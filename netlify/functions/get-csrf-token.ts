import { Handler, HandlerEvent } from '@netlify/functions';
import { generateCSRFToken } from './utils/csrf';
import { successResponse, errorResponse } from './utils/response';

/**
 * Netlify Function: get-csrf-token
 *
 * Genera un token CSRF para uso en formularios.
 * Este endpoint es público y no requiere autenticación.
 *
 * GET /.netlify/functions/get-csrf-token
 */
export const handler: Handler = async (event: HandlerEvent) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    };
  }

  // Solo GET
  if (event.httpMethod !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const token = generateCSRFToken();

    return successResponse({
      token,
      expires_in: 3600 // 1 hora en segundos
    });

  } catch (error) {
    console.error('get-csrf-token error:', error);
    return errorResponse('Failed to generate CSRF token', 500);
  }
};
