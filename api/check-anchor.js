// api/check-anchor.js - Vercel API route to check blockchain anchoring status
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { hash } = req.body;

    if (!hash) {
      return res.status(400).json({ error: 'Hash is required' });
    }

    // Check if there's an existing anchor for this hash
    const { data, error } = await supabase
      .from('anchors')
      .select('*')
      .eq('document_hash', hash)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching anchor:', error);
      return res.status(500).json({ error: 'Failed to fetch anchoring data' });
    }

    if (data && data.length > 0) {
      const anchor = data[0];
      
      // For simulation purposes, let's say pending anchors become confirmed after a certain time
      // In a real implementation, this would check actual blockchain status
      let finalStatus = anchor.anchor_status;
      let isAnchored = anchor.anchor_status === 'confirmed';
      
      // Simulate that if more than 10 minutes have passed since creation, it's confirmed
      const creationTime = new Date(anchor.created_at).getTime();
      const now = Date.now();
      if ((now - creationTime) > 600000) { // 10 minutes in milliseconds
        finalStatus = 'confirmed';
        isAnchored = true;
      }
      
      // Update the record if status changed
      if (finalStatus !== anchor.anchor_status) {
        await supabase
          .from('anchors')
          .update({ anchor_status: finalStatus, confirmed_at: new Date().toISOString() })
          .eq('id', anchor.id);
      }
      
      res.status(200).json({
        anchored: isAnchored,
        network: 'Bitcoin (via OpenTimestamps)',
        txId: anchor.bitcoin_tx_id || 'N/A',
        proof: anchor.raw_proof,
        confirmedAt: anchor.confirmed_at,
        status: finalStatus,
        calendarUrl: anchor.calendar_url
      });
    } else {
      // No anchor found for this hash
      res.status(200).json({
        anchored: false,
        network: 'N/A',
        txId: 'N/A',
        proof: null,
        confirmedAt: null,
        status: 'not_found',
        calendarUrl: null
      });
    }
  } catch (error) {
    console.error('Error in check-anchor handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}