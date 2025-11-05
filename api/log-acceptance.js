// netlify/functions/log-acceptance.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // Use service key for admin actions

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { caseId, name, email } = JSON.parse(event.body);

    if (!caseId || !name || !email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'caseId, name, and email are required' }) };
    }

    // 1. Create a new recipient
    const { data: recipient, error: recipientError } = await supabase
      .from('recipients')
      .insert({ case_id: caseId, name, email })
      .select()
      .single();

    if (recipientError) {
      console.error('Supabase error (recipients):', recipientError);
      return { statusCode: 500, body: JSON.stringify({ error: 'Could not save recipient.' }) };
    }

    // 2. Log the acceptance event
    const { error: eventError } = await supabase.from('events').insert({
      case_id: caseId,
      recipient_id: recipient.id,
      name: name,
      email: email,
      // In a real app, you would get this from the request headers
      browser_fingerprint: 'placeholder_fingerprint',
      ip_city: 'placeholder_city',
    });

    if (eventError) {
      console.error('Supabase error (events):', eventError);
      return { statusCode: 500, body: JSON.stringify({ error: 'Could not log event.' }) };
    }

    // 3. Return success and the content URL
    const siteUrl = process.env.URL || 'http://localhost:8888';
    const contentUrl = `${siteUrl}/content-placeholder.html`;

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        contentUrl: contentUrl
      }),
    };
  } catch (e) {
    console.error('Error logging acceptance:', e);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
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
