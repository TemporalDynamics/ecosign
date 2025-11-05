// netlify/functions/sign-url.js
// Create a short signing link (shortId) + HMAC signature + expiry.
// Stores a document record in Supabase. Frontend will use /sign/:shortId route.

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const HMAC_SECRET = process.env.HMAC_SIGN_SECRET || process.env.HMAC_SECRET || 'dev-secret';
const SITE_URL = process.env.NETLIFY_SITE_URL || '';
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
  const { httpMethod } = event;
  
  if (httpMethod === 'POST') {
    // Crear nuevo enlace de firma
    try {
      const body = JSON.parse(event.body || '{}');
      const ownerEmail = body.ownerEmail;
      const sha256 = body.sha256;
      const docType = body.docType || 'template';
      const version = body.version || 1;
      const expirySeconds = Number(body.expirySeconds) || 7 * 24 * 3600;

      if (!ownerEmail || !sha256) {
        return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'ownerEmail and sha256 are required' }) };
      }

      const docId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      
      // Insert into Supabase
      const { data: documentData, error } = await supabase
        .from('documents')
        .insert([{
          id: docId,
          owner_email: ownerEmail,
          type: docType,
          version,
          sha256,
          storage_url: body.storageUrl || null
        }]);

      if (error) {
        console.error('Error inserting document to Supabase:', error);
        return {
          statusCode: 500,
          headers: cors(),
          body: JSON.stringify({ error: 'Error interno al guardar el documento' })
        };
      }

      const shortId = crypto.randomBytes(4).toString('hex'); // 8 chars
      const exp = Math.floor(Date.now() / 1000) + expirySeconds;
      const payload = `${shortId}.${docId}.${exp}`;
      const sig = hmac(payload, HMAC_SECRET);

      // Prefer to return full URL for convenience
      const base = SITE_URL || '';
      const signUrl = `${base}/sign/${shortId}?doc=${docId}&exp=${exp}&sig=${sig}`;

      return {
        statusCode: 200,
        headers: cors(),
        body: JSON.stringify({ success: true, signUrl, shortId, docId, exp, sig })
      };

    } catch (e) {
      console.error(e);
      return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: 'internal' }) };
    }
  } else if (httpMethod === 'GET') {
    // Verificar token de firma (para la página sign.html)
    try {
      const { verify, doc, exp, sig } = event.queryStringParameters || {};
      
      if (!verify || !doc || !exp || !sig) {
        return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'verify, doc, exp, and sig parameters are required' }) };
      }

      // Verificar expiración
      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = parseInt(exp);
      
      if (currentTime > expirationTime) {
        return { statusCode: 400, headers: cors(), body: JSON.stringify({ valid: false, error: 'Link expired' }) };
      }

      // Verificar firma HMAC
      const payload = `${verify}.${doc}.${exp}`;
      const expectedSig = hmac(payload, HMAC_SECRET);
      
      if (sig !== expectedSig) {
        return { statusCode: 400, headers: cors(), body: JSON.stringify({ valid: false, error: 'Invalid signature' }) };
      }

      // Buscar documento en Supabase
      const { data: document, error } = await supabase
        .from('documents')
        .select('sha256, owner_email')
        .eq('id', doc)
        .single();

      if (error || !document) {
        return { statusCode: 404, headers: cors(), body: JSON.stringify({ valid: false, error: 'Document not found' }) };
      }

      return {
        statusCode: 200,
        headers: cors(),
        body: JSON.stringify({ 
          valid: true, 
          documentHash: document.sha256,
          docId: doc,
          ownerEmail: document.owner_email
        })
      };

    } catch (e) {
      console.error(e);
      return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: 'internal' }) };
    }
  } else {
    return { statusCode: 405, headers: cors(), body: JSON.stringify({ error: 'Method not allowed' }) };
  }
};

function hmac(text, secret) {
  return crypto.createHmac('sha256', secret).update(text).digest('hex');
}

function cors() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}