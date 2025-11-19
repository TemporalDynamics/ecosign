/**
 * Basic Certification Service
 *
 * Provides simple file certification using eco-packer:
 * - Upload file
 * - Calculate SHA-256 hash
 * - Generate .ecox with timestamp
 * - Download certified file
 */

import { generateEd25519KeyPair, sha256Hex } from '@temporaldynamics/eco-packer/eco-utils';
import { requestLegalTimestamp } from './tsaService.js';

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
 * Generates a new key pair for signing (temporary, for testing)
 * In production, this should use KeyManagementService to retrieve stored keys
 */
export function generateKeys() {
  const { privateKey, publicKey } = generateEd25519KeyPair();
  return {
    privateKey: privateKey.toString('base64'),
    publicKey: publicKey.toString('base64')
  };
}

/**
 * Certifies a file and returns certification data
 *
 * @param {File} file - The file to certify
 * @param {Object} options - Certification options
 * @param {string} options.privateKey - Base64-encoded private key (optional, will generate if not provided)
 * @param {string} options.userId - User ID (optional)
 * @param {string} options.userEmail - User email (optional)
 * @param {boolean} options.useLegalTimestamp - Request RFC 3161 timestamp (default: false)
 * @returns {Promise<Object>} Certification result with hash, timestamp, and .ecox data
 */
export async function certifyFile(file, options = {}) {
  try {
    console.log('📄 Starting file certification...');
    console.log('  File name:', file.name);
    console.log('  File size:', file.size, 'bytes');

    // Step 1: Read file as ArrayBuffer
    const fileBuffer = await readFileAsArrayBuffer(file);
    console.log('✅ File read successfully');

    // Step 2: Calculate SHA-256 hash
    const fileArray = new Uint8Array(fileBuffer);
    const hash = sha256Hex(fileArray);
    console.log('✅ Hash calculated:', hash);

    // Step 3: Generate or use provided keys
    let privateKey, publicKey;
    if (options.privateKey) {
      privateKey = Buffer.from(options.privateKey, 'base64');
      // For now, we'll generate public key from private (in production, store both)
      const keys = generateEd25519KeyPair();
      publicKey = keys.publicKey;
    } else {
      const keys = generateEd25519KeyPair();
      privateKey = keys.privateKey;
      publicKey = keys.publicKey;
    }
    console.log('✅ Keys ready');

    // Step 4: Create timestamp (with optional RFC 3161 legal timestamp)
    let timestamp = new Date().toISOString();
    let tsaResponse = null;

    if (options.useLegalTimestamp) {
      console.log('🕐 Requesting RFC 3161 legal timestamp...');
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
        tags: ['certified', 'verifysign']
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

    // Step 6: Create signatures array
    const signatures = [
      {
        signatureId: `sig-${Date.now()}`,
        signerId: options.userEmail || 'anonymous@verifysign.pro',
        timestamp: timestamp,
        algorithm: 'Ed25519',
        publicKey: publicKey.toString('base64'),
        // Sign the document hash
        signature: Buffer.from(
          await crypto.subtle.sign(
            'Ed25519',
            await crypto.subtle.importKey(
              'raw',
              privateKey,
              { name: 'Ed25519' },
              false,
              ['sign']
            ),
            Buffer.from(hash, 'hex')
          )
        ).toString('base64'),
        legalTimestamp: tsaResponse && tsaResponse.success ? {
          standard: 'RFC 3161',
          tsa: tsaResponse.tsaName || tsaResponse.tsaUrl,
          tsaUrl: tsaResponse.tsaUrl || 'https://freetsa.org/tsr',
          token: tsaResponse.token,
          tokenSize: tsaResponse.tokenSize,
          algorithm: tsaResponse.algorithm,
          verified: tsaResponse.verified,
          note: tsaResponse.note
        } : null
      }
    ];

    // Step 7: Create metadata
    const metadata = {
      certifiedAt: timestamp,
      certifiedBy: 'EcoSign',
      clientInfo: {
        userAgent: navigator?.userAgent || 'Unknown',
        platform: navigator?.platform || 'Unknown',
        language: navigator?.language || 'Unknown'
      },
      forensicEnabled: options.useLegalTimestamp || options.usePolygonAnchor || options.useBitcoinAnchor || false,
      anchoring: {
        polygon: options.usePolygonAnchor || false,
        bitcoin: options.useBitcoinAnchor || false
      }
    };

    // Step 8: Create .eco file as single JSON
    const ecoPayload = {
      version: project.version,
      projectId: projectId,
      manifest: project,
      signatures: signatures,
      metadata: metadata
    };

    // Convert to buffer
    const ecoJson = JSON.stringify(ecoPayload, null, 2);
    const ecoxBuffer = new TextEncoder().encode(ecoJson);

    console.log('✅ .eco file created:', ecoxBuffer.byteLength, 'bytes');

    let anchorJob = null;
    try {
      // Only import when needed to avoid circular dependencies
      const { requestBitcoinAnchor } = await import('./opentimestamps');
      anchorJob = await requestBitcoinAnchor(hash, {
        documentId: projectId,
        userId: options.userId || null,
        metadata: {
          requestedFrom: 'certifyFile',
          documentName: file.name
        }
      });
    } catch (anchorError) {
      console.warn('⚠️ Bitcoin anchoring request failed:', anchorError);
    }

    // Return certification data
    return {
      success: true,
      hash: hash,
      timestamp: timestamp,
      projectId: projectId,
      fileName: file.name,
      fileSize: file.size,
      publicKey: publicKey.toString('base64'),
      ecoxBuffer: ecoxBuffer,
      ecoxSize: ecoxBuffer.byteLength,
      anchorRequest: anchorJob,
      // Return the original file for download
      signedPdfFile: file,
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
      // Full ECO data for storage
      ecoData: {
        documentHash: hash,
        timestamp: timestamp,
        projectId: projectId,
        manifest: project,
        publicKey: publicKey.toString('base64'),
        legalTimestamp: tsaResponse && tsaResponse.success ? tsaResponse : null
      }
    };

  } catch (error) {
    console.error('❌ Certification error:', error);
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
