// netlify/functions/verify-access.js
// Validate accessToken against Supabase. Returns metadata for content.html.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'api' },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: cors(), body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { token } = event.queryStringParameters || {};
  if (!token) {
    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Token is required' }) };
  }

  // Query Supabase for acceptance
  const { data: acc, error } = await supabase
    .from('acceptances')
    .select('party_email, party_name, organization, document_hash, expires_at, created_at')
    .eq('access_token', token)
    .single();

  if (error || !acc) {
    return { statusCode: 404, headers: cors(), body: JSON.stringify({ valid: false, message: 'Token not found' }) };
  }

  const now = new Date();
  const exp = new Date(acc.expires_at);
  const expired = now > exp;

  return {
    statusCode: 200,
    headers: cors(),
    body: JSON.stringify({
      valid: !expired,
      expired,
      email: acc.party_email,
      name: acc.party_name,
      organization: acc.organization,
      docHash: acc.document_hash,
      acceptedAt: acc.created_at || acc.expires_at, // Using created_at from Supabase
      expiresAt: acc.expires_at
    })
  };
};

function cors() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}