// api/blockchain-timestamp.js
import OpenTimestamps from 'opentimestamps';

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
    const { hash, action } = req.body;

    if (!hash) {
      return res.status(400).json({ error: 'Hash required' });
    }

    // Acción: stamp (crear timestamp)
    if (action === 'stamp') {
      console.log('🕐 Creating OpenTimestamps proof for hash:', hash);

      // Convertir hex a Buffer
      const hashBytes = Buffer.from(hash, 'hex');

      // Crear DetachedTimestampFile
      const detached = OpenTimestamps.DetachedTimestampFile.fromHash(
        new OpenTimestamps.Ops.OpSHA256(),
        hashBytes
      );

      // Enviar a calendar servers (INSTANT)
      await OpenTimestamps.stamp(detached);

      // Serializar proof
      const proof = detached.serializeToBytes();
      const proofBase64 = proof.toString('base64');

      console.log('✅ OTS proof created:', proofBase64.substring(0, 50) + '...');

      return res.json({
        success: true,
        timestamp: new Date().toISOString(),
        blockchain: 'Bitcoin',
        protocol: 'OpenTimestamps',
        status: 'pending',
        otsProof: proofBase64,
        otsProofSize: proof.length,
        hash: hash,
        calendarServers: [
          'alice.btc.calendar.opentimestamps.org',
          'bob.btc.calendar.opentimestamps.org',
          'finney.calendar.eternitywall.com'
        ],
        note: 'Timestamp submitted to calendar servers. Bitcoin confirmation in ~10 minutes.',
        estimatedConfirmation: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        verificationUrl: 'https://opentimestamps.org/'
      });
    }

    // Acción: upgrade (verificar confirmación)
    if (action === 'upgrade') {
      const { otsProof } = req.body;

      if (!otsProof) {
        return res.status(400).json({ error: 'OTS proof required' });
      }

      console.log('🔄 Upgrading OTS proof...');

      // Deserializar proof
      const proofBytes = Buffer.from(otsProof, 'base64');
      const detached = OpenTimestamps.DetachedTimestampFile.deserialize(proofBytes);

      // Intentar upgrade
      const changed = await OpenTimestamps.upgrade(detached);

      if (changed) {
        console.log('✅ Proof upgraded! Now confirmed on Bitcoin.');

        // Obtener info del bloque
        const info = OpenTimestamps.info(detached);
        const blockHeight = info?.bitcoin?.height;

        return res.json({
          success: true,
          upgraded: true,
          otsProof: detached.serializeToBytes().toString('base64'),
          blockHeight: blockHeight,
          message: 'Timestamp confirmed on Bitcoin blockchain'
        });
      } else {
        console.log('⏳ No upgrade available yet.');

        return res.json({
          success: true,
          upgraded: false,
          message: 'Not yet confirmed. Try again in a few minutes.'
        });
      }
    }

    // Acción: verify
    if (action === 'verify') {
      const { otsProof, originalHash } = req.body;

      console.log('🔍 Verifying OTS proof...');

      const proofBytes = Buffer.from(otsProof, 'base64');
      const detached = OpenTimestamps.DetachedTimestampFile.deserialize(proofBytes);

      const originalHashBytes = Buffer.from(originalHash, 'hex');
      const original = OpenTimestamps.DetachedTimestampFile.fromHash(
        new OpenTimestamps.Ops.OpSHA256(),
        originalHashBytes
      );

      const result = await OpenTimestamps.verify(detached, original);

      if (result && result.bitcoin) {
        return res.json({
          valid: true,
          blockchain: 'Bitcoin',
          protocol: 'OpenTimestamps',
          status: 'confirmed',
          blockHeight: result.bitcoin.height,
          blockTime: new Date(result.bitcoin.timestamp * 1000).toISOString(),
          explorerUrl: `https://mempool.space/block/${result.bitcoin.height}`
        });
      } else {
        return res.json({
          valid: true,
          status: 'pending',
          message: 'Proof valid but not yet confirmed on blockchain'
        });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}