// api/track-access.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { documentHash, documentName, userAgent, browserFingerprint, viewedDuration, scrollPercentage, downloaded, ndaAccepted } = req.body;

    if (!documentHash) {
      return res.status(400).json({ error: 'documentHash is required' });
    }

    const { data: certData, error: certError } = await supabase
      .from('certifications')
      .select('id')
      .eq('file_hash', documentHash)
      .single();

    if (certError) {
      console.error('Error finding certification:', certError);
      // We can still log the access attempt, just without the certification_id
    }

    const logEntry = {
      certification_id: certData?.id,
      document_hash: documentHash,
      document_name: documentName || 'unknown',
      accessed_at: new Date().toISOString(),
      ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      user_agent: userAgent || 'unknown',
      browser_fingerprint: browserFingerprint || 'unknown',
      viewed_duration: viewedDuration || 0,
      scroll_percentage: scrollPercentage || 0,
      downloaded: downloaded || false,
      nda_accepted: ndaAccepted || false,
    };

    const { error: insertError } = await supabase
      .from('verification_logs')
      .insert(logEntry);

    if (insertError) {
      throw insertError;
    }

    console.log('✅ Verification access logged:', logEntry);

    // Increment verification count
    if (certData?.id) {
      const { data, error } = await supabase
        .from('certifications')
        .select('verification_count')
        .eq('id', certData.id)
        .single();

      if (!error) {
        const newCount = (data.verification_count || 0) + 1;
        await supabase
          .from('certifications')
          .update({ verification_count: newCount })
          .eq('id', certData.id);
      }
    }

    return res.status(200).json({ success: true, message: 'Access logged' });

  } catch (error) {
    console.error('❌ Error logging access:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}