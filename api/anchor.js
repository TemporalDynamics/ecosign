// api/anchor.js - Vercel API route for OpenTimestamps anchoring
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
    const { hash, documentId, userId } = req.body;

    if (!hash) {
      return res.status(400).json({ error: 'Hash is required' });
    }

    // Create OpenTimestamps proof for the hash
    const openTimestampsResult = await createOpenTimestampsProof(hash);

    // Store anchoring information in Supabase
    const { data, error } = await supabase
      .from('anchors')
      .insert([{
        document_id: documentId || null,
        user_id: userId || null,
        document_hash: hash,
        anchor_type: 'opentimestamps',
        anchor_status: 'pending', // Initially pending, will be confirmed later
        raw_proof: openTimestampsResult.rawProof,
        calendar_url: openTimestampsResult.calendarUrl,
        bitcoin_tx_id: openTimestampsResult.bitcoinTx,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Error storing anchor:', error);
      return res.status(500).json({ error: 'Failed to store anchoring data' });
    }

    res.status(200).json({
      message: 'Hash submitted for blockchain anchoring',
      anchorId: data?.[0]?.id,
      hash,
      proof: openTimestampsResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in anchor handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Function to simulate OpenTimestamps proof creation
// In a real implementation, this would interact with actual OpenTimestamps services
async function createOpenTimestampsProof(hash) {
  // In a real implementation, we would:
  // 1. Create an OpenTimestamps commitment for the hash
  // 2. Submit it to an OpenTimestamps calendar
  // 3. Wait for aggregation and Bitcoin anchoring
  // 4. Return the attestation and Bitcoin transaction details
  
  // For now, simulate the process with realistic data
  const simulatedBitcoinTx = `opentx_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
  
  return {
    rawProof: Buffer.from(`ots-proof-${hash.substring(0, 16)}-${Date.now()}`).toString('base64'),
    calendarUrl: 'https://a.pool.opentimestamps.org',
    timestamp: new Date().toISOString(),
    bitcoinTx: simulatedBitcoinTx,
    status: 'submitted',
    calendarHash: hash // The hash submitted to the calendar
  };
}