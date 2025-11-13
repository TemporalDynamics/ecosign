// lib/opentimestamps.js
import OpenTimestamps from 'opentimestamps';

export async function stamp(hash) {
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

  return {
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
  };
}
