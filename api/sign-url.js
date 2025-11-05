// netlify/functions/sign-url.js
// Create a short signing link (shortId) + HMAC signature + expiry.
// Stores a document record in Supabase. Frontend will use /sign/:shortId route.

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const HMAC_SECRET = process.env.HMAC_SIGN_SECRET || process.env.HMAC_SECRET;
const SITE_URL = process.env.NETLIFY_SITE_URL || 'http://localhost:8888';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Enforce required environment variables in production
if (process.env.NETLIFY_SITE_URL && (!HMAC_SECRET || !SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  throw new Error('Missing required environment variables in production: HMAC_SECRET, SUPABASE_URL, SUPABASE_ANON_KEY');
}

if (!HMAC_SECRET) {
  console.warn('⚠️ Missing HMAC_SECRET environment variable. Using a default "dev-secret". This is not secure for production.');
}

const hmacSecret = HMAC_SECRET || 'dev-secret';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ Missing Supabase environment variables. Running in local development mode without database access.');
}

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'api' },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
}) : null;

exports.handler = async (event) => {
  const { httpMethod } = event;
  
  if (!supabase) {
    return {
      statusCode: 500,
      headers: cors(),
      body: JSON.stringify({ 
        error: 'Supabase not configured. Feature disabled.',
        requiresConfiguration: true
      })
    };
  }
  
  if (httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { ownerEmail, sha256, docType = 'template', version = 1, expirySeconds = 7 * 24 * 3600, storageUrl = null } = body;

      if (!ownerEmail || !sha256) {
        return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'ownerEmail and sha256 are required' }) };
      }

      const docId = crypto.randomUUID();
      
      const { error } = await supabase
        .from('documents')
        .insert([{ id: docId, owner_email: ownerEmail, type: docType, version, sha256, storage_url: storageUrl }]);

      if (error) {
        console.error('Error inserting document to Supabase:', error);
        return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: 'Error interno al guardar el documento' }) };
      }

      const shortId = crypto.randomBytes(4).toString('hex');
      const exp = Math.floor(Date.now() / 1000) + Number(expirySeconds);
      const payload = `${shortId}.${docId}.${exp}`;
      const sig = hmac(payload, hmacSecret);

      const signUrl = `${SITE_URL}/sign/${shortId}?doc=${docId}&exp=${exp}&sig=${sig}`;

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
    try {
      const { verify, doc, exp, sig } = event.queryStringParameters || {};
      
      if (!verify || !doc || !exp || !sig) {
        return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'verify, doc, exp, and sig parameters are required' }) };
      }

      if (Math.floor(Date.now() / 1000) > parseInt(exp)) {
        return { statusCode: 400, headers: cors(), body: JSON.stringify({ valid: false, error: 'Link expired' }) };
      }

      const payload = `${verify}.${doc}.${exp}`;
      const expectedSig = hmac(payload, hmacSecret);
      
      if (sig !== expectedSig) {
        console.warn(`Invalid signature attempt. Got: ${sig}, Expected: ${expectedSig}`);
        return { statusCode: 400, headers: cors(), body: JSON.stringify({ valid: false, error: 'Invalid signature' }) };
      }

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