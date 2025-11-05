// netlify/functions/create-case.js
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // Use service key for admin actions

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
    const { doc_storage_path, doc_sha256, nda_text } = JSON.parse(event.body);
    const slug = crypto.randomBytes(6).toString('hex'); // 12-char slug

    const { data, error } = await supabase
      .from('cases')
      .insert({
        owner_id: user.sub,
        doc_storage_path: doc_storage_path || 'placeholder/document.pdf',
        doc_sha256: doc_sha256 || 'placeholder_hash',
        nda_text: nda_text || 'Default NDA text',
        public_slug: slug,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Could not create case.' }) };
    }

    const siteUrl = process.env.URL || 'http://localhost:8888';
    const secureLink = `${siteUrl}/p/${slug}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        caseId: data.id,
        secureLink: secureLink
      }),
    };
  } catch (e) {
    console.error('Error creating case:', e);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};
