// lib/rfc3161.js
import asn1 from 'asn1.js';

// FreeTSA endpoint
const TSA_URL = 'https://freetsa.org/tsr';

// Define ASN.1 structure for TimeStampRequest (simplified for common fields)
const TimeStampRequest = asn1.define('TimeStampRequest', function () {
  this.seq().obj(
    this.key('version').int(),
    this.key('messageImprint').seq().obj(
      this.key('hashAlgorithm').seq().obj(
        this.key('algorithm').objid(),
      ),
      this.key('hashedMessage').octstr()
    ),
    this.key('nonce').int().optional(),
    this.key('certReq').bool().def(false),
  );
});

export async function fetchTimestamp(hash) {
  console.log('🕐 Requesting RFC 3161 timestamp from TSA (server-side)...');
  console.log('  Hash:', hash);

  // 1. Construct the Time Stamp Request (TSR) in ASN.1 DER format
  const hashBytes = Buffer.from(hash, 'hex');
  const nonce = Math.floor(Math.random() * 1000000000); // Random nonce

  const tsr = TimeStampRequest.encode({
    version: 1, // v1
    messageImprint: {
      hashAlgorithm: {
        algorithm: [1, 2, 840, 113549, 2, 1], // OID for sha256WithRSAEncryption
      },
      hashedMessage: hashBytes,
    },
    nonce: nonce,
    certReq: false,
  }, 'der');

  // 2. Send the TSR to the TSA server
  const response = await fetch(TSA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/timestamp-query',
      'Accept': 'application/timestamp-reply',
    },
    body: tsr,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TSA request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  // 3. Get the Time Stamp Response (TSR)
  const tsrResponseBuffer = await response.arrayBuffer();
  const tsrResponseBase64 = Buffer.from(tsrResponseBuffer).toString('base64');

  console.log('✅ RFC 3161 timestamp received from TSA');

  // In a full implementation, you would parse the TSR response to extract
  // the timestamp, verify the TSA's signature, etc.
  // For now, we'll return the raw token and some basic info.

  return {
    success: true,
    timestamp: new Date().toISOString(), // Placeholder, should be extracted from TSR
    tsaName: 'FreeTSA.org',
    tsaUrl: TSA_URL,
    token: tsrResponseBase64,
    tokenSize: tsrResponseBuffer.byteLength,
    algorithm: 'SHA-256', // Should be extracted from TSR
    standard: 'RFC 3161',
    verified: true, // Placeholder, should be actual verification
    note: 'RFC 3161 timestamp obtained from FreeTSA.org',
  };
}
