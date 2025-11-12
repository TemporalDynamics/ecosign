import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🔄 Checking OTS confirmations...');

  try {
    // Get pending certifications (older than 10 min)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: pending, error } = await supabase
      .from('certifications')
      .select('*')
      .eq('ots_status', 'pending')
      .lt('created_at', tenMinutesAgo)
      .limit(100);

    if (error) throw error;

    console.log(`  Found ${pending.length} pending certifications`);

    let confirmed = 0;

    for (const cert of pending) {
      // Call upgrade API
      const upgradeRes = await fetch(`${process.env.VERCEL_URL}/api/blockchain-timestamp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upgrade',
          otsProof: cert.ots_proof
        })
      });

      const result = await upgradeRes.json();

      if (result.success && result.upgraded) {
        // Update database
        await supabase
          .from('certifications')
          .update({
            ots_status: 'confirmed',
            ots_proof: result.otsProof,
            ots_block_height: result.blockHeight,
            confirmed_at: new Date().toISOString()
          })
          .eq('id', cert.id);

        // Send email notification
        if (cert.user_email) {
          try {
            await fetch(`${process.env.VERCEL_URL}/api/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: cert.user_email,
                subject: '✅ Tu certificado está confirmado en Bitcoin',
                type: 'ots_confirmed',
                fileName: cert.file_name,
                hash: cert.file_hash,
                blockHeight: result.blockHeight,
                timestamp: new Date().toISOString()
              })
            });
          } catch (emailError) {
            console.error('Error sending confirmation email:', emailError);
          }
        }

        confirmed++;
        console.log(`  ✅ Confirmed: ${cert.file_name}`);
      }
    }

    console.log(`✅ Checked ${pending.length}, confirmed ${confirmed}`);

    return res.json({
      success: true,
      checked: pending.length,
      confirmed: confirmed
    });

  } catch (error) {
    console.error('❌ Cron error:', error);
    return res.status(500).json({ error: error.message });
  }
}