/**
 * stamp-pdf Edge Function (legacy)
 *
 * Deprecated: PDF stamping is now executed only in the canonical internal
 * signature pipeline.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin':
          Deno.env.get('ALLOWED_ORIGIN') ||
          Deno.env.get('SITE_URL') ||
          Deno.env.get('FRONTEND_URL') ||
          'http://localhost:5173',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,apikey',
      },
    });
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: 'stamp-pdf is deprecated. Use canonical internal signature pipeline.'
    }),
    {
      status: 410,
      headers: { 'Content-Type': 'application/json' }
    }
  );
});
