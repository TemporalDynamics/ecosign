/**
 * OpenTimestamps Service - Real Implementation
 * Uses backend API for actual OTS timestamping
 */

import { hexToBytes, bytesToHex } from '@noble/hashes/utils.js';

// API endpoint (Vercel function)
const API_URL = '/api/blockchain-timestamp';

/**
 * Creates a timestamp proof using real OpenTimestamps
 */
export async function createBlockchainTimestamp(hashHex) {
  console.log('⛓️ Creating blockchain timestamp with OpenTimestamps API...');
  console.log('  Hash:', hashHex);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'stamp',
        hash: hashHex
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    console.log('✅ OTS proof created via API');
    console.log('  Status:', result.status);

    return result;

  } catch (error) {
    console.error('❌ OpenTimestamps API error:', error);

    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      blockchain: 'Bitcoin',
      protocol: 'OpenTimestamps',
      status: 'failed'
    };
  }
}

/**
 * Verifies a blockchain timestamp proof
 */
export async function verifyBlockchainTimestamp(otsProofBase64, originalHashHex) {
  console.log('🔍 Verifying blockchain timestamp via API...');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'verify',
        otsProof: otsProofBase64,
        originalHash: originalHashHex
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('❌ Verification error:', error);

    return {
      valid: false,
      error: error.message,
      blockchain: 'Bitcoin',
      protocol: 'OpenTimestamps',
      status: 'failed'
    };
  }
}

/**
 * Upgrades a pending timestamp
 */
export async function upgradeTimestamp(otsProofBase64) {
  console.log('🔄 Upgrading timestamp via API...');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'upgrade',
        otsProof: otsProofBase64
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('❌ Upgrade error:', error);

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Downloads the .ots proof file
 *
 * @param {string} otsProofBase64 - Base64-encoded .ots proof
 * @param {string} originalFileName - Original file name (for naming)
 */
export function downloadOtsProof(otsProofBase64, originalFileName) {
  try {
    // Convert base64 to bytes
    const binary = atob(otsProofBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Create blob
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement('a');
    const baseName = originalFileName.replace(/\.[^/.]+$/, '');
    const otsFileName = `${baseName}.ots`;

    link.href = url;
    link.download = otsFileName;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('✅ .ots proof downloaded:', otsFileName);
    return otsFileName;

  } catch (error) {
    console.error('❌ Download error:', error);
    throw new Error(`Download failed: ${error.message}`);
  }
}
