// netlify/functions/log-acceptance.js
// Save acceptance data to Supabase instead of in-memory storage

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_BUCKET_SIGNATURES = process.env.SUPABASE_BUCKET_SIGNATURES;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_BUCKET_SIGNATURES) {
  console.warn('⚠️ Missing Supabase environment variables. Running in local development mode.');
  // In local development, we'll log warnings but allow the function to continue with mock data
}

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'public' },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
}) : null;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: cors(),
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body || '{}');

    // Basic validation (adjust to your form fields)
    if (!data.name || !data.email || !data.signature || !data.documentHash) {
      return {
        statusCode: 400,
        headers: cors(),
        body: JSON.stringify({ error: 'Datos incompletos (name, email, signature, documentHash requeridos)' })
      };
    }

    // For MVP we trust client-provided documentHash.
    // In production: if docId provided and doc.type==='template' -> recalculate SHA256 server-side and compare.
    const documentHash = data.documentHash;
    if (!documentHash || typeof documentHash !== 'string') {
      return {
        statusCode: 400,
        headers: cors(),
        body: JSON.stringify({ error: 'Falta documentHash o formato inválido' })
      };
    }

    // Generate token + IDs + TTL (7 días)
    const accessToken = crypto.randomBytes(24).toString('hex');
    const acceptedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const acceptanceId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

    let signatureUrl = '';
    
    if (supabase) {
      // Convertir dataURL de la firma en buffer y subirlo a Storage
      const match = (data.signature || '').match(/^data:(image\/[-+\w.]+);base64,(.+)$/);
      if (!match) {
        return {
          statusCode: 400,
          headers: cors(),
          body: JSON.stringify({ error: 'Formato de firma inválido' })
        };
      }

      const [, mimeType, base64Payload] = match;
      const extension = mimeType === 'image/png'
        ? 'png'
        : mimeType === 'image/jpeg'
          ? 'jpg'
          : 'bin';

      const signatureBuffer = Buffer.from(base64Payload, 'base64');
      const signaturePath = `${acceptanceId}/signature.${extension}`;

      const { error: storageError } = await supabase.storage
        .from(SUPABASE_BUCKET_SIGNATURES)
        .upload(signaturePath, signatureBuffer, {
          contentType: mimeType,
          upsert: false
        });

      if (storageError) {
        console.error('Error uploading signature to Supabase Storage:', storageError);
        return {
          statusCode: 500,
          headers: cors(),
          body: JSON.stringify({ error: 'No se pudo guardar la firma' })
        };
      }

      const { data: publicUrlData } = supabase.storage
        .from(SUPABASE_BUCKET_SIGNATURES)
        .getPublicUrl(signaturePath);
      signatureUrl = publicUrlData?.publicUrl || signaturePath;

      // IP from headers (Netlify / proxies)
      const ipHeader = event.headers['x-forwarded-for'] || event.headers['client-ip'] || event.headers['x-real-ip'] || 'unknown';
      const ip = ipHeader.split(',')[0].trim();
      const userAgent = event.headers['user-agent'] || 'unknown';

      // Insert into Supabase
      const { error } = await supabase
        .from('acceptances')
        .insert([{
          id: acceptanceId,
          doc_id: data.docId || null,
          party_name: data.name,
          party_email: data.email,
          signature_url: signatureUrl,
          document_hash: documentHash,
          access_token: accessToken,
          ip_address: ip,
          user_agent: userAgent,
          expires_at: expiresAt,
          created_at: acceptedAt
        }]);

      if (error) {
        console.error('Error inserting acceptance to Supabase:', error);
        return {
          statusCode: 500,
          headers: cors(),
          body: JSON.stringify({ error: 'Error interno al guardar la aceptación' })
        };
      }
    } else {
      // Supabase not configured - only save to localStorage on the frontend
      console.log('⚠️ Supabase not configured. Acceptance data will only be stored in browser localStorage.');
      signatureUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='; // Transparent 1x1 pixel
    }

    // Return token+meta
    return {
      statusCode: 200,
      headers: cors(),
      body: JSON.stringify({
        success: true,
        accessToken,
        acceptedAt,
        expiresAt,
        documentHash
      })
    };

  } catch (err) {
    console.error('Error logging NDA acceptance:', err);
    return {
      statusCode: 500,
      headers: cors(),
      body: JSON.stringify({ error: 'Error interno del servidor' })
    };
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
