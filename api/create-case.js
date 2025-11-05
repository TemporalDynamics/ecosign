// netlify/functions/create-case.js
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const { case_name, doc_name, doc_sha256 } = JSON.parse(event.body);
    const unique_token = crypto.randomBytes(16).toString('hex');

    const { data, error } = await supabase
      .from('cases')
      .insert({
        owner_id: user.sub,
        case_name,
        doc_name,
        doc_sha256,
        unique_token,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Could not create case.' }) };
    }

    const siteUrl = process.env.URL || 'http://localhost:8888';
    const shareableLink = `${siteUrl}/sign.html?token=${unique_token}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        shareableLink: shareableLink
      }),
    };
  } catch (e) {
    console.error('Error creating case:', e);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};