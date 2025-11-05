// netlify/functions/verify-access.js
// Validate accessToken against Supabase. Returns metadata for content.html.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Enforce required environment variables in production
if (process.env.NETLIFY_SITE_URL && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  throw new Error('Missing required environment variables in production: SUPABASE_URL, SUPABASE_ANON_KEY');
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ Missing Supabase environment variables. Token validation will use localStorage fallback.');
}

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'public' },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
}) : null;

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: cors(), body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { token } = event.queryStringParameters || {};
  if (!token) {
    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Token is required' }) };
  }

  if (!supabase) {
    return {
      statusCode: 500,
      headers: cors(),
      body: JSON.stringify({
        valid: false,
        message: 'Verification service is not configured. Please contact support.',
        requiresLocalCheck: true
      })
    };
  }

  try {
    const { data: acc, error } = await supabase
      .from('acceptances')
      .select('party_email, party_name, organization, document_hash, expires_at, created_at')
      .eq('access_token', token)
      .single();

    if (error || !acc) {
      console.log('Token not found in Supabase:', error?.message || 'Token not found');
      return { statusCode: 404, headers: cors(), body: JSON.stringify({ valid: false, message: 'Token de acceso inválido o expirado. Por favor, firme nuevamente el NDA.' }) };
    }

    const expired = new Date() > new Date(acc.expires_at);

    if (expired) {
      return { statusCode: 401, headers: cors(), body: JSON.stringify({ valid: false, expired: true, message: 'Token de acceso expirado. Por favor, firme nuevamente el NDA.' }) };
    }

    return {
      statusCode: 200,
      headers: cors(),
      body: JSON.stringify({
        valid: true,
        expired: false,
        email: acc.party_email,
        name: acc.party_name,
        organization: acc.organization,
        docHash: acc.document_hash,
        acceptedAt: acc.created_at,
        expiresAt: acc.expires_at
      })
    };
  } catch (error) {
    console.error('Error during Supabase token verification:', error);
    return {
      statusCode: 500,
      headers: cors(),
      body: JSON.stringify({
        valid: false,
        message: 'Ocurrió un error interno durante la verificación del token. Por favor, intente más tarde.'
      })
    };
  }
};

function cors() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}