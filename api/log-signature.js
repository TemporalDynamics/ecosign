// netlify/functions/log-signature.js
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { token, email } = JSON.parse(event.body);

    if (!token || !email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Token and email are required' }) };
    }

    // 1. Find the case by token
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, doc_sha256')
      .eq('unique_token', token)
      .single();

    if (caseError || !caseData) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Case not found.' }) };
    }

    const caseId = caseData.id;
    const timestamp = new Date().toISOString();

    // 2. Create the signature hash
    const signatureHash = crypto
      .createHash('sha256')
      .update(email + token + timestamp)
      .digest('hex');

    // 3. Log the signature
    const { error: signatureError } = await supabase.from('signatures').insert({
      case_id: caseId,
      signer_email: email,
      signed_at: timestamp,
      signature_hash: signatureHash,
    });

    if (signatureError) {
      console.error('Supabase error (signatures):', signatureError);
      return { statusCode: 500, body: JSON.stringify({ error: 'Could not log signature.' }) };
    }

    // 4. Generate .eco file content
    const ecoFileContent = {
      specVersion: "1.0.0",
      caseId: caseId,
      action: "nda_accepted",
      timestamp: timestamp,
      signerEmail: email,
      documentHash: caseData.doc_sha256,
      signature: `ed25519:${signatureHash}`,
      verifyUrl: `https://verify-sign.com/check?token=${token}`
    };

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        ecoFile: ecoFileContent
      }),
    };
  } catch (e) {
    console.error('Error logging signature:', e);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};
