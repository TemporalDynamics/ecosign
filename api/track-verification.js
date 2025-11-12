import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      documentHash,
      documentName,
      userAgent,
      browserFingerprint,
      viewedDuration,
      scrollPercentage,
      downloaded
    } = req.body;

    // Get IP from Vercel headers
    const ip = req.headers['x-forwarded-for'] ||
               req.headers['x-real-ip'] ||
               req.socket.remoteAddress;

    // Log to database
    const { data, error } = await supabase
      .from('verification_logs')
      .insert({
        document_hash: documentHash,
        document_name: documentName,
        accessed_at: new Date().toISOString(),
        ip_address: ip,
        user_agent: userAgent,
        browser_fingerprint: browserFingerprint,
        viewed_duration_seconds: viewedDuration,
        scroll_percentage: scrollPercentage,
        downloaded: downloaded || false,
        referer: req.headers.referer,
        session_id: req.headers['x-session-id']
      })
      .select()
      .single();

    if (error) throw error;

    console.log('📊 Verification logged:', {
      hash: documentHash,
      ip: ip
    });

    return res.json({
      success: true,
      logId: data.id,
      timestamp: data.accessed_at
    });

  } catch (error) {
    console.error('❌ Tracking error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}