/**
 * Basic Certification Service - Web Optimized
 *
 * Combines browser-compatible libraries with unified .eco format:
 * - @noble/ed25519 for signatures (pure JavaScript)
 * - @noble/hashes for SHA-256 (pure JavaScript)
 * - Unified .eco format (single JSON file) for easy verification
 */

import * as ed from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { requestLegalTimestamp } from './tsaService.js';
import { requestBitcoinAnchor } from './opentimestamps';
import { anchorToPolygon } from './polygonAnchor.js';

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
 * Calculates digital fingerprint (browser-compatible)
 * @param {Uint8Array} data - Data to fingerprint
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
 * Creates a unified .eco format (single JSON file)
 *
 * Instead of ZIP with 3 files, this creates one JSON with:
 * - manifest (document description + hash)
 * - signatures (Ed25519 + RFC 3161 legal timestamp)
 * - metadata (forensic info: browser, user-agent, anchoring)
 *
 * @param {Object} project - EcoProject manifest
 * @param {string} publicKeyHex - Public key as hex string
 * @param {string} signature - Signature as hex string
 * @param {string} timestamp - Timestamp
 * @param {Object} options - Additional options
 * @returns {ArrayBuffer} .eco file data (JSON as ArrayBuffer)
 */
async function createEcoXFormat(project, publicKeyHex, signature, timestamp, options = {}) {
  // Create the signatures array
  const signatures = [
    {
      signatureId: `sig-${Date.now()}`,
      signerId: options.userEmail || 'anonymous@verifysign.pro',
      keyId: options.userId || 'temp-key',
      publicKey: publicKeyHex,
      signature: signature,
      algorithm: 'Ed25519',
      timestamp: timestamp,
      // Legal timestamp certification (if requested)
      legalTimestamp: options.tsaResponse && options.tsaResponse.success ? {
        standard: 'RFC 3161',
        tsa: options.tsaResponse.tsaName || options.tsaResponse.tsaUrl,
        tsaUrl: options.tsaResponse.tsaUrl || 'https://freetsa.org/tsr',
        token: options.tsaResponse.token,
        tokenSize: options.tsaResponse.tokenSize,
        algorithm: options.tsaResponse.algorithm,
        verified: options.tsaResponse.verified,
        note: options.tsaResponse.note
      } : null
    }
  ];

  // Create metadata with forensic information
  const metadata = {
    certifiedAt: timestamp,
    certifiedBy: 'VerifySign',
    clientInfo: {
      userAgent: navigator?.userAgent || 'Unknown',
      platform: navigator?.platform || 'Unknown',
      language: navigator?.language || 'Unknown',
      createdWith: 'VerifySign Web Client'
    },
    forensicEnabled: options.useLegalTimestamp || options.usePolygonAnchor || options.useBitcoinAnchor || false,
    anchoring: {
      polygon: options.usePolygonAnchor || false,
      bitcoin: options.useBitcoinAnchor || false
    },
    timestampType: options.tsaResponse && options.tsaResponse.success ? 'RFC 3161 Legal' : 'Local (Informational)'
  };

  // Create unified .eco structure
  const ecoPayload = {
    version: project.version || '1.1.0',
    projectId: project.projectId,
    manifest: project,
    signatures: signatures,
    metadata: metadata
  };

  // Convert to JSON string and then to ArrayBuffer
  const ecoJson = JSON.stringify(ecoPayload, null, 2);
  const encoder = new TextEncoder();
  const arrayBuffer = encoder.encode(ecoJson);

  return arrayBuffer.buffer;
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
 * @param {boolean} options.useLegalTimestamp - Request legal timestamp certification (default: false)
 * @param {boolean} options.useBitcoinAnchor - Request public verification (default: false)
 * @returns {Promise<Object>} Certification result with fingerprint, timestamp, and .ecox data
 */
export async function certifyFile(file, options = {}) {
  try {
    console.log('📄 Starting file certification (web-optimized)...');
    console.log('  File name:', file.name);
    console.log('  File size:', file.size, 'bytes');

    // Step 1: Read file as ArrayBuffer
    const fileBuffer = await readFileAsArrayBuffer(file);
    const fileArray = new Uint8Array(fileBuffer);
    console.log('✅ File read successfully');

    // Step 2: Calculate digital fingerprint
    const hash = calculateSHA256(fileArray); // "hash" is kept as variable name for code compatibility
    console.log('✅ Fingerprint calculated:', hash);

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

    // Step 4: Create timestamp (with optional legal timestamp certification)
    let timestamp = new Date().toISOString();
    let tsaResponse = null;

    if (options.useLegalTimestamp) {
      console.log('🕐 Requesting legal timestamp certification...');
      try {
        tsaResponse = await requestLegalTimestamp(hash);
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
        tags: ['certified', 'verifysign', 'web']
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

    // Step 8: Create .ecox format (compatible with verificationService)
    const ecoxBuffer = await createEcoXFormat(project, publicKeyHex, signature, timestamp, {
      userId: options.userId,
      userEmail: options.userEmail,
      tsaResponse
    });

    console.log('✅ .ecox file created:', ecoxBuffer.byteLength, 'bytes');

    let anchorJob = null;
    let polygonAnchor = null;

    // Bitcoin Anchoring (OpenTimestamps - 4-24h)
    if (options.useBitcoinAnchor) {
      try {
        console.log('🔗 Requesting Bitcoin anchoring (OpenTimestamps)...');
        console.log('⏱️  This process takes 4-24 hours for blockchain confirmation');

        // Import dynamically to avoid potential circular dependencies
        const { requestBitcoinAnchor } = await import('./opentimestamps');
        anchorJob = await requestBitcoinAnchor(hash, {
          documentId: projectId,
          userId: options.userId || null,
          userEmail: options.userEmail || null,
          metadata: {
            requestedFrom: 'certifyFile',
            documentName: file.name,
            requestedBitcoinAnchor: true
          }
        });

        if (anchorJob) {
          console.log('✅ Bitcoin anchoring queued successfully');
          console.log(`📧 Notification will be sent to: ${options.userEmail || 'No email provided'}`);
        }
      } catch (anchorError) {
        console.warn('⚠️ Bitcoin anchoring request failed:', anchorError);
      }
    }

    // Polygon Anchoring (Instant - 10-30s)
    if (options.usePolygonAnchor) {
      try {
        console.log('🔗 Requesting Polygon anchoring (Mainnet)...');
        console.log('⏱️  This process takes 10-30 seconds for blockchain confirmation');

        polygonAnchor = await anchorToPolygon(hash, {
          documentId: projectId,
          userId: options.userId || null,
          userEmail: options.userEmail || null,
          metadata: {
            requestedFrom: 'certifyFile',
            documentName: file.name,
            requestedPolygonAnchor: true
          }
        });

        if (polygonAnchor?.success) {
          console.log('✅ Polygon anchoring confirmed');
          console.log(`🔍 Transaction: ${polygonAnchor.explorerUrl}`);
          console.log(`📦 Block: ${polygonAnchor.blockNumber}`);
        } else {
          console.warn('⚠️ Polygon anchoring queued (pending confirmation)');
        }
      } catch (anchorError) {
        console.warn('⚠️ Polygon anchoring request failed:', anchorError);
      }
    }

    // Create signatures structure for DB storage
    const signaturesData = [
      {
        keyId: options.userId || 'temp-key',
        signerId: options.userEmail || 'anonymous@verifysign.pro',
        publicKey: publicKeyHex,
        signature: signature,
        algorithm: 'Ed25519',
        timestamp: timestamp,
        // Legal timestamp certification (if requested)
        ...(tsaResponse && tsaResponse.success ? {
          legalTimestamp: {
            standard: 'Legal Certification',
            tsa: tsaResponse.tsaName || tsaResponse.tsaUrl,
            tsaUrl: tsaResponse.tsaUrl || 'https://freetsa.org/tsr',
            token: tsaResponse.token,
            tokenSize: tsaResponse.tokenSize,
            algorithm: tsaResponse.algorithm,
            verified: tsaResponse.verified,
            note: tsaResponse.note
          }
        } : {})
      }
    ];

    // ECO data structure for DB (JSONB column)
    const ecoData = {
      manifest: project,
      signatures: signaturesData,
      metadata: {
        createdWith: 'VerifySign Web Client',
        browserVersion: navigator.userAgent,
        hasLegalTimestamp: tsaResponse && tsaResponse.success,
        timestampType: tsaResponse && tsaResponse.success ? 'Legal Certification' : 'Local (Informational)',
        certifiedAt: timestamp
      }
    };

    // Return certification data
    return {
      success: true,
      hash: hash,
      timestamp: timestamp,
      projectId: projectId,
      fileName: file.name,
      fileSize: file.size,
      publicKey: publicKeyHex,
      signature: signature,
      ecoxBuffer: ecoxBuffer,
      ecoxSize: ecoxBuffer.byteLength,
      ecoData: ecoData,  // Structured data for DB storage
      // Blockchain anchoring
      bitcoinAnchor: anchorJob,
      polygonAnchor: polygonAnchor,
      // Legal timestamp info (if requested)
      legalTimestamp: tsaResponse && tsaResponse.success ? {
        enabled: true,
        standard: 'Legal Certification',
        tsa: tsaResponse.tsaName || tsaResponse.tsaUrl,
        tokenSize: tsaResponse.tokenSize
      } : {
        enabled: false,
        note: 'Local timestamp only (informational)'
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
