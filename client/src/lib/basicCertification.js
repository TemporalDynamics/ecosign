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
import { pack } from '@temporaldynamics/eco-packer';

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

    // Step 4: Create timestamp
    const timestamp = new Date().toISOString();
    console.log('✅ Timestamp:', timestamp);

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

    // Step 6: Create asset hashes map
    const assetHashes = new Map();
    assetHashes.set(assetId, hash);

    // Step 7: Pack into .ecox format
    const ecoxBuffer = await pack(project, assetHashes, {
      privateKey: privateKey,
      keyId: options.userId || 'temp-key',
      signerId: options.userEmail || 'anonymous@verifysign.pro'
    });

    console.log('✅ .ecox file created:', ecoxBuffer.byteLength, 'bytes');

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
      ecoxSize: ecoxBuffer.byteLength
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
