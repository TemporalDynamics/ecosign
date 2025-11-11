/**
 * Basic Certification Service - Browser Compatible
 *
 * Uses browser-compatible libraries instead of Node.js crypto:
 * - @noble/ed25519 for signatures (pure JavaScript)
 * - @noble/hashes for SHA-256 (pure JavaScript)
 * - pack() from eco-packer (should work after polyfills)
 */

import * as ed from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { requestSimpleTimestamp } from './tsaService.js';
import { createBlockchainTimestamp } from './openTimestampsService.js';
// Note: We're not using pack() from eco-packer because it has Node.js dependencies
// Instead, we'll create a simple .ecox format manually

/**
 * Reads a file and returns its ArrayBuffer
 */
async function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generates a new Ed25519 key pair (browser-compatible)
 * Returns keys as hex strings
 */
export async function generateKeys() {
  // In @noble/ed25519 v3.x, use crypto.getRandomValues for private key
  const privateKey = new Uint8Array(32);
  crypto.getRandomValues(privateKey);

  const publicKey = await ed.getPublicKeyAsync(privateKey);

  return {
    privateKey: bytesToHex(privateKey),
    publicKey: bytesToHex(publicKey)
  };
}

/**
 * Calculates SHA-256 hash (browser-compatible)
 * @param {Uint8Array} data - Data to hash
 * @returns {string} Hex string
 */
function calculateSHA256(data) {
  const hash = sha256(data);
  return bytesToHex(hash);
}

/**
 * Signs a message with Ed25519 (browser-compatible)
 * @param {string} message - Message to sign
 * @param {string} privateKeyHex - Private key as hex string
 * @returns {Promise<string>} Signature as hex string
 */
async function signMessage(message, privateKeyHex) {
  const messageBytes = utf8ToBytes(message);
  const privateKeyBytes = hexToBytes(privateKeyHex);
  const signature = await ed.signAsync(messageBytes, privateKeyBytes);
  return bytesToHex(signature);
}

/**
 * Converts Uint8Array to base64 string
 */
function uint8ArrayToBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts base64 string to Uint8Array
 */
function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Certifies a file and returns certification data
 *
 * @param {File} file - The file to certify
 * @param {Object} options - Certification options
 * @param {string} options.privateKey - Hex-encoded private key (optional, will generate if not provided)
 * @param {string} options.publicKey - Hex-encoded public key (optional)
 * @param {string} options.userId - User ID (optional)
 * @param {string} options.userEmail - User email (optional)
 * @param {boolean} options.useLegalTimestamp - Request RFC 3161 timestamp (default: false)
 * @param {boolean} options.useBlockchainAnchoring - Use OpenTimestamps blockchain anchoring (default: false)
 * @returns {Promise<Object>} Certification result with hash, timestamp, and .ecox data
 */
export async function certifyFile(file, options = {}) {
  try {
    console.log('📄 Starting file certification (browser mode)...');
    console.log('  File name:', file.name);
    console.log('  File size:', file.size, 'bytes');

    // Step 1: Read file as ArrayBuffer
    const fileBuffer = await readFileAsArrayBuffer(file);
    const fileArray = new Uint8Array(fileBuffer);
    console.log('✅ File read successfully');

    // Step 2: Calculate SHA-256 hash
    const hash = calculateSHA256(fileArray);
    console.log('✅ Hash calculated:', hash);

    // Step 3: Generate or use provided keys
    let privateKeyHex, publicKeyHex;
    if (options.privateKey && options.publicKey) {
      privateKeyHex = options.privateKey;
      publicKeyHex = options.publicKey;
    } else {
      const keys = await generateKeys();
      privateKeyHex = keys.privateKey;
      publicKeyHex = keys.publicKey;
    }
    console.log('✅ Keys ready');
    console.log('  Public key (hex):', publicKeyHex.substring(0, 32) + '...');

    // Step 4: Create timestamp (with optional RFC 3161 legal timestamp)
    let timestamp = new Date().toISOString();
    let tsaResponse = null;

    if (options.useLegalTimestamp) {
      console.log('🕐 Requesting RFC 3161 legal timestamp...');
      try {
        tsaResponse = await requestSimpleTimestamp(hash);
        if (tsaResponse.success) {
          timestamp = tsaResponse.timestamp;
          console.log('✅ Legal timestamp received from TSA');
          console.log('  TSA:', tsaResponse.tsaUrl);
          console.log('  Standard:', tsaResponse.standard);
        } else {
          console.log('⚠️ TSA request failed, using local timestamp');
        }
      } catch (error) {
        console.error('⚠️ TSA error:', error);
        console.log('  Falling back to local timestamp');
      }
    } else {
      console.log('✅ Local timestamp:', timestamp);
    }

    // Step 4.5: Blockchain anchoring (with optional OpenTimestamps)
    let blockchainResponse = null;

    if (options.useBlockchainAnchoring) {
      console.log('⛓️ Requesting blockchain anchoring (OpenTimestamps)...');
      try {
        blockchainResponse = await createBlockchainTimestamp(hash);
        if (blockchainResponse.success) {
          console.log('✅ Blockchain timestamp created!');
          console.log('  Blockchain:', blockchainResponse.blockchain);
          console.log('  Protocol:', blockchainResponse.protocol);
          console.log('  Status:', blockchainResponse.status);
        } else {
          console.log('⚠️ Blockchain anchoring failed');
        }
      } catch (error) {
        console.error('⚠️ Blockchain anchoring error:', error);
        console.log('  Continuing without blockchain anchoring');
      }
    }

    // Step 5: Create EcoProject manifest
    const assetId = `asset-${Date.now()}`;
    const projectId = `doc-${Date.now()}`;

    const project = {
      version: '1.1.0',
      projectId: projectId,
      metadata: {
        title: file.name,
        description: `Certified document: ${file.name}`,
        createdAt: timestamp,
        modifiedAt: timestamp,
        author: options.userEmail || 'anonymous',
        tags: ['certified', 'verifysign', 'browser']
      },
      assets: [
        {
          assetId: assetId,
          type: 'document',
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          hash: hash,
          metadata: {
            originalName: file.name,
            uploadedAt: timestamp
          }
        }
      ],
      segments: [
        {
          segmentId: 'seg-1',
          startTime: 0,
          duration: 0,
          sourceAssetId: assetId,
          metadata: {
            description: 'Original document'
          }
        }
      ],
      timeline: {
        duration: 0,
        fps: 0,
        segments: ['seg-1']
      }
    };

    console.log('✅ Manifest created');

    // Step 6: Create asset hashes map
    const assetHashes = new Map();
    assetHashes.set(assetId, hash);

    // Step 7: Sign the manifest
    const manifestJSON = JSON.stringify(project, null, 2);
    const signature = await signMessage(manifestJSON, privateKeyHex);
    console.log('✅ Manifest signed');

    // Step 8: Create .ecox format manually (simplified version)
    // Instead of using pack(), we create a JSON manifest with signature
    const ecoxManifest = {
      format: 'ecox',
      version: '1.1.0',
      manifest: project,
      signatures: [
        {
          keyId: options.userId || 'temp-key',
          signerId: options.userEmail || 'anonymous@verifysign.pro',
          publicKey: publicKeyHex,
          signature: signature,
          algorithm: 'Ed25519',
          timestamp: timestamp,
          // RFC 3161 legal timestamp (if requested)
          ...(tsaResponse && tsaResponse.success ? {
            legalTimestamp: {
              standard: 'RFC 3161',
              tsa: tsaResponse.tsaName || tsaResponse.tsaUrl,
              tsaUrl: tsaResponse.tsaUrl || 'https://freetsa.org/tsr',
              token: tsaResponse.token,
              tokenSize: tsaResponse.tokenSize,
              algorithm: tsaResponse.algorithm,
              verified: tsaResponse.verified,
              note: tsaResponse.note
            }
          } : {}),
          // Blockchain anchoring (if requested)
          ...(blockchainResponse && blockchainResponse.success ? {
            blockchainAnchoring: {
              blockchain: blockchainResponse.blockchain,
              protocol: blockchainResponse.protocol,
              status: blockchainResponse.status,
              otsProof: blockchainResponse.otsProof,
              otsProofSize: blockchainResponse.otsProofSize,
              calendarServers: blockchainResponse.calendarServers,
              timestamp: blockchainResponse.timestamp,
              estimatedConfirmation: blockchainResponse.estimatedConfirmation,
              verificationUrl: blockchainResponse.verificationUrl,
              note: blockchainResponse.note
            }
          } : {})
        }
      ],
      metadata: {
        createdWith: 'VerifySign Browser Client',
        browserVersion: navigator.userAgent,
        hasLegalTimestamp: tsaResponse && tsaResponse.success,
        hasBlockchainAnchoring: blockchainResponse && blockchainResponse.success,
        timestampType: tsaResponse && tsaResponse.success ? 'RFC 3161 (Legal)' : 'Local (Informational)',
        anchoringType: blockchainResponse && blockchainResponse.success ? 'Bitcoin (OpenTimestamps)' : 'None'
      }
    };

    // Convert to ArrayBuffer
    const ecoxJSON = JSON.stringify(ecoxManifest, null, 2);
    const encoder = new TextEncoder();
    const ecoxBuffer = encoder.encode(ecoxJSON).buffer;

    console.log('✅ .ecox file created:', ecoxBuffer.byteLength, 'bytes');

    // Return certification data
    return {
      success: true,
      hash: hash,
      timestamp: timestamp,
      projectId: projectId,
      fileName: file.name,
      fileSize: file.size,
      publicKey: publicKeyHex,
      privateKey: privateKeyHex, // Include for debugging (remove in production!)
      signature: signature,
      ecoxBuffer: ecoxBuffer,
      ecoxSize: ecoxBuffer.byteLength,
      // Legal timestamp info (if requested)
      legalTimestamp: tsaResponse && tsaResponse.success ? {
        enabled: true,
        standard: 'RFC 3161',
        tsa: tsaResponse.tsaName || tsaResponse.tsaUrl,
        tokenSize: tsaResponse.tokenSize
      } : {
        enabled: false,
        note: 'Local timestamp only (informational)'
      },
      // Blockchain anchoring info (if requested)
      blockchainAnchoring: blockchainResponse && blockchainResponse.success ? {
        enabled: true,
        blockchain: blockchainResponse.blockchain,
        protocol: blockchainResponse.protocol,
        status: blockchainResponse.status,
        otsProofSize: blockchainResponse.otsProofSize,
        estimatedConfirmation: blockchainResponse.estimatedConfirmation,
        verificationUrl: blockchainResponse.verificationUrl
      } : {
        enabled: false,
        note: 'No blockchain anchoring'
      }
    };

  } catch (error) {
    console.error('❌ Certification error:', error);
    console.error('Stack:', error.stack);
    throw new Error(`Certification failed: ${error.message}`);
  }
}

/**
 * Downloads the .ecox file to the user's computer
 *
 * @param {ArrayBuffer} ecoxBuffer - The .ecox file data
 * @param {string} originalFileName - Original file name (for naming the .ecox)
 */
export function downloadEcox(ecoxBuffer, originalFileName) {
  try {
    // Create blob from ArrayBuffer
    const blob = new Blob([ecoxBuffer], { type: 'application/octet-stream' });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    // Generate .ecox filename
    const baseName = originalFileName.replace(/\.[^/.]+$/, ''); // Remove extension
    const ecoxFileName = `${baseName}.ecox`;

    link.href = url;
    link.download = ecoxFileName;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('✅ Download initiated:', ecoxFileName);
    return ecoxFileName;

  } catch (error) {
    console.error('❌ Download error:', error);
    throw new Error(`Download failed: ${error.message}`);
  }
}

/**
 * Complete certification flow: certify + download
 *
 * @param {File} file - The file to certify
 * @param {Object} options - Certification options
 * @returns {Promise<Object>} Certification result
 */
export async function certifyAndDownload(file, options = {}) {
  const result = await certifyFile(file, options);
  const downloadedFileName = downloadEcox(result.ecoxBuffer, result.fileName);

  return {
    ...result,
    downloadedFileName: downloadedFileName
  };
}
