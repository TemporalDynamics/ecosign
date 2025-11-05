// netlify/functions/create-case.js
const { createClient } = require('@supabase/supabase-js');

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

  // For a real app, you'd get the user from the context
  // const { user } = context.clientContext;
  // if (!user) {
  //   return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  // }

  // For now, using a placeholder user ID
  const placeholderUserId = 'f5e6a8d1-9b3c-4e7a-8b1a-2c3d4e5f6a7b'; // Replace with a real user ID from your Supabase auth users

  try {
    const { doc_storage_path, doc_sha256, nda_text } = JSON.parse(event.body);

    const { data, error } = await supabase
      .from('cases')
      .insert({
        owner_id: placeholderUserId, // user.sub,
        doc_storage_path: doc_storage_path || 'placeholder/document.pdf',
        doc_sha256: doc_sha256 || 'placeholder_hash',
        nda_text: nda_text || 'Default NDA text',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Could not create case.' }) };
    }

    const caseId = data.id;
    const siteUrl = process.env.URL || 'http://localhost:8888';
    const secureLink = `${siteUrl}/access.html?case=${caseId}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        caseId: caseId,
        secureLink: secureLink
      }),
    };
  } catch (e) {
    console.error('Error creating case:', e);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};
