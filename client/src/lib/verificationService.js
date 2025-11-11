/**
 * Verification Service - Complete .ecox Verification
 *
 * Implements 4-layer verification:
 * 1. Hash Verification - File integrity
 * 2. Ed25519 Signature - Cryptographic verification
 * 3. RFC 3161 TSA Token - Legal timestamp verification
 * 4. Manifest Structure - Format compliance
 */

import * as ed from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { verifyTSRToken } from './tsrVerifier.js';

/**
 * Reads a .ecox file and extracts the manifest
 *
 * @param {File} file - The .ecox file to verify
 * @returns {Promise<Object>} Parsed manifest
 */
async function readEcoxFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result;
        const manifest = JSON.parse(text);
        resolve(manifest);
      } catch (error) {
        reject(new Error('Invalid .ecox file format - not valid JSON'));
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Verifies Ed25519 signature
 *
 * @param {string} message - Original message (manifest JSON)
 * @param {string} signatureHex - Signature in hex format
 * @param {string} publicKeyHex - Public key in hex format
 * @returns {Promise<boolean>} True if signature is valid
 */
async function verifyEd25519Signature(message, signatureHex, publicKeyHex) {
  try {
    const messageBytes = utf8ToBytes(message);
    const signatureBytes = hexToBytes(signatureHex);
    const publicKeyBytes = hexToBytes(publicKeyHex);

    const isValid = await ed.verifyAsync(signatureBytes, messageBytes, publicKeyBytes);
    return isValid;
  } catch (error) {
    console.error('❌ Ed25519 verification failed:', error);
    return false;
  }
}

/**
 * Verifies the .ecox file completely
 *
 * @param {File} ecoxFile - The .ecox file to verify
 * @param {File} originalFile - (Optional) The original file to verify hash against
 * @returns {Promise<Object>} Verification result with detailed info
 */
export async function verifyEcoxFile(ecoxFile, originalFile = null) {
  console.log('🔍 Starting .ecox verification...');
  console.log('  File:', ecoxFile.name);
  console.log('  Original file provided:', !!originalFile);

  const result = {
    valid: false,
    checks: {
      format: { passed: false, message: '' },
      manifest: { passed: false, message: '' },
      signature: { passed: false, message: '' },
      hash: { passed: false, message: '' },
      timestamp: { passed: false, message: '' },
      legalTimestamp: { passed: false, message: '', optional: true }
    },
    data: {
      originalFileHash: null,  // New: Store original file hash if provided
      manifestHash: null       // New: Store manifest hash for comparison
    },
    errors: []
  };

  try {
    // ===== LAYER 1: Format Verification =====
    console.log('📋 Layer 1: Verifying file format...');

    const manifest = await readEcoxFile(ecoxFile);

    if (!manifest.format || manifest.format !== 'ecox') {
      result.checks.format.message = 'Not a valid .ecox file';
      result.errors.push('Invalid format field');
      return result;
    }

    result.checks.format.passed = true;
    result.checks.format.message = 'Valid .ecox format';
    console.log('✅ Format OK');

    // ===== LAYER 2: Manifest Structure Verification =====
    console.log('📋 Layer 2: Verifying manifest structure...');

    if (!manifest.manifest || !manifest.signatures || !Array.isArray(manifest.signatures)) {
      result.checks.manifest.message = 'Invalid manifest structure';
      result.errors.push('Missing required fields');
      return result;
    }

    const projectManifest = manifest.manifest;
    const signatures = manifest.signatures;

    if (signatures.length === 0) {
      result.checks.manifest.message = 'No signatures found';
      result.errors.push('Document not signed');
      return result;
    }

    result.checks.manifest.passed = true;
    result.checks.manifest.message = `${signatures.length} signature(s) found`;
    console.log('✅ Manifest structure OK');

    // Extract signature data
    const signature = signatures[0]; // Use first signature
    const { publicKey, signature: signatureHex, algorithm, timestamp, legalTimestamp } = signature;

    // Store data for display
    result.data = {
      fileName: projectManifest.metadata?.title || 'Unknown',
      createdAt: timestamp,
      author: projectManifest.metadata?.author || 'Unknown',
      publicKey: publicKey,
      algorithm: algorithm,
      hasLegalTimestamp: !!legalTimestamp,
      legalTimestampInfo: legalTimestamp || null,
      assets: projectManifest.assets || [],
      version: manifest.version,
      originalFileHash: null,  // Initialize
      manifestHash: null       // Initialize
    };

    // ===== LAYER 3: Ed25519 Signature Verification =====
    console.log('🔐 Layer 3: Verifying Ed25519 signature...');

    // Recreate the signed message (manifest JSON)
    const manifestJSON = JSON.stringify(projectManifest, null, 2);

    const signatureValid = await verifyEd25519Signature(manifestJSON, signatureHex, publicKey);

    if (!signatureValid) {
      result.checks.signature.message = 'Invalid digital signature - document may have been tampered';
      result.errors.push('Signature verification failed');
      return result;
    }

    result.checks.signature.passed = true;
    result.checks.signature.message = 'Digital signature valid (Ed25519)';
    console.log('✅ Signature valid');

    // Get manifest hash for comparison
    const asset = projectManifest.assets[0];
    const manifestHash = asset?.hash;
    result.data.manifestHash = manifestHash;

    // ===== LAYER 4: Hash Verification (if original file provided) =====
    if (originalFile) {
      console.log('🔍 Layer 4: Verifying file hash...');

      // Calculate hash of the original file
      const calculatedHash = await calculateFileHash(originalFile);
      result.data.originalFileHash = calculatedHash;

      if (!manifestHash) {
        result.checks.hash.message = 'No hash found in manifest';
        result.errors.push('Missing hash in asset');
        return result;
      }

      if (calculatedHash !== manifestHash) {
        result.checks.hash.message = 'Hash mismatch - file has been modified';
        result.errors.push(`Expected: ${manifestHash}, Got: ${calculatedHash}`);
        result.data.hashMismatch = {
          expected: manifestHash,
          actual: calculatedHash
        };
        result.data.hash = calculatedHash;
        return result;
      }

      result.checks.hash.passed = true;
      result.checks.hash.message = 'File hash matches (SHA-256) - byte-to-byte verification passed';
      result.data.hash = calculatedHash;
      console.log('✅ Hash matches');
    } else {
      // Without original file, we can only verify the manifest hash exists
      result.checks.hash.passed = !!manifestHash;
      if (manifestHash) {
        result.checks.hash.message = 'Hash declared in manifest';
        result.data.hash = manifestHash;
        console.log('✅ Hash declared in manifest');
      } else {
        result.checks.hash.message = 'No hash found in manifest';
        result.errors.push('Missing hash in asset');
      }
    }

    // ===== LAYER 5: Timestamp Verification =====
    console.log('🕐 Layer 5: Verifying timestamp...');

    if (timestamp) {
      const timestampDate = new Date(timestamp);
      const now = new Date();

      // Basic sanity check: timestamp shouldn't be in the future
      if (timestampDate > now) {
        result.checks.timestamp.message = 'Warning: Timestamp is in the future';
        result.errors.push('Suspicious timestamp');
      } else {
        result.checks.timestamp.passed = true;
        result.checks.timestamp.message = `Timestamp valid: ${timestampDate.toLocaleString()}`;
        console.log('✅ Timestamp OK');
      }
    }

    // ===== LAYER 6: Legal Timestamp Verification (RFC 3161) =====
    if (legalTimestamp && legalTimestamp.token) {
      console.log('⚖️ Layer 6: Verifying legal timestamp (RFC 3161)...');

      try {
        // Try server-side verification first for better security (uses node-forge)
        const manifestAssetHash = projectManifest.assets?.[0]?.hash || null;
        const serverResponse = await fetch('/api/verify-tsr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tsrTokenB64: legalTimestamp.token,
            manifestHashHex: manifestAssetHash
          })
        });

        let tsrReport;
        if (serverResponse.ok) {
          const serverResult = await serverResponse.json();
          if (serverResult.success) {
            tsrReport = serverResult.tsrReport;
          } else {
            console.warn('Server TSR verification failed, falling back to client-side:', serverResult.error);
          }
        }

        // Fallback to client-side verification if server verification fails
        if (!tsrReport) {
          console.log('Using client-side TSR verification as fallback...');
          tsrReport = await verifyTSRToken(legalTimestamp.token, manifestAssetHash);
        }

        result.data.legalTimestampReport = tsrReport;

        if (tsrReport.success === false) {
          result.checks.legalTimestamp.message = tsrReport.message || 'Legal timestamp verification failed';
          result.errors.push('Legal timestamp verification failed');
        } else if (tsrReport.hashMatches === false) {
          result.checks.legalTimestamp.message = 'Hash sellado no coincide con el declarado en el manifiesto';
          result.errors.push('Legal timestamp hash mismatch');
        } else {
          result.checks.legalTimestamp.passed = true;
          const tsaLabel = legalTimestamp.tsa || legalTimestamp.tsaUrl || tsrReport.meta?.tsa || 'TSA';
          result.checks.legalTimestamp.message = tsrReport.message || `Legal timestamp emitido por ${tsaLabel}`;
          result.data.legalValidity = true;
          console.log('✅ Legal timestamp válido');
        }
      } catch (error) {
        result.checks.legalTimestamp.message = 'Legal timestamp verification failed';
        result.errors.push(error.message);
        console.error('⚠️ Legal timestamp error:', error);
      }
    } else {
      result.checks.legalTimestamp.passed = false;
      result.checks.legalTimestamp.message = 'No legal timestamp (informational timestamp only)';
      result.data.legalValidity = false;
    }

    // ===== FINAL RESULT =====
    // Document is valid if all non-optional checks pass
    const requiredChecks = ['format', 'manifest', 'signature', 'hash', 'timestamp'];
    const allRequiredPass = requiredChecks.every(check => result.checks[check].passed);

    result.valid = allRequiredPass;

    if (result.valid) {
      console.log('✅ VERIFICATION SUCCESSFUL - Document is valid!');
    } else {
      console.log('❌ VERIFICATION FAILED');
    }

    return result;

  } catch (error) {
    console.error('❌ Verification error:', error);
    result.errors.push(error.message);
    result.checks.format.message = 'Error during verification';
    return result;
  }
}

// Helper function to calculate file hash (avoiding circular imports)
async function calculateFileHash(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      try {
        const arrayBuffer = reader.result;
        const uint8Array = new Uint8Array(arrayBuffer);
        const hash = sha256(uint8Array);
        const hashHex = bytesToHex(hash);
        resolve(hashHex);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Extracts basic info from .ecox without full verification
 *
 * @param {File} ecoxFile - The .ecox file
 * @returns {Promise<Object>} Basic info
 */
export async function extractEcoxInfo(ecoxFile) {
  try {
    const manifest = await readEcoxFile(ecoxFile);

    return {
      success: true,
      format: manifest.format,
      version: manifest.version,
      fileName: manifest.manifest?.metadata?.title,
      createdAt: manifest.signatures?.[0]?.timestamp,
      author: manifest.manifest?.metadata?.author,
      hasLegalTimestamp: !!manifest.signatures?.[0]?.legalTimestamp,
      assets: manifest.manifest?.assets?.length || 0
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
