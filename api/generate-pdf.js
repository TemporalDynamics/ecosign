// netlify/functions/generate-pdf.js
// Stub: returns a JSON "constancia" as a downloadable file for now.
// Later: replace with pdf-lib or puppeteer to produce a true PDF and upload to storage.

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
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors(), body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { accessToken } = JSON.parse(event.body || '{}');
    if (!accessToken) {
      return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'accessToken requerido' }) };
    }

    // Query Supabase for acceptance
    const { data: acc, error } = await supabase
      .from('acceptances')
      .select('id, party_name, party_email, organization, document_hash, ip_address, user_agent, created_at, expires_at, signature_url')
      .eq('access_token', accessToken)
      .single();

    if (error || !acc) {
      return { statusCode: 404, headers: cors(), body: JSON.stringify({ error: 'No encontrado' }) };
    }

    const proof = {
      type: 'NDA-Proof',
      version: 1,
      id: acc.id,
      parties: {
        receiving: { name: acc.party_name, email: acc.party_email, org: acc.organization }
      },
      timestamps: { acceptedAt: acc.created_at, expiresAt: acc.expires_at },
      integrity: { sha256: acc.document_hash },
      network: { ip: acc.ip_address, userAgent: acc.user_agent },
      signatureSnapshot: acc.signature_url ? 'included' : 'none'
    };

    return {
      statusCode: 200,
      headers: {
        ...cors(),
        'Content-Disposition': `attachment; filename="constancia-${acc.id}.json"`
      },
      body: JSON.stringify(proof, null, 2)
    };

  } catch (e) {
    console.error(e);
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: 'Error interno' }) };
  }
};

function cors() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}