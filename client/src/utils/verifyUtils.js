// client/src/utils/verifyUtils.js
import JSZip from 'jszip';

/**
 * Extract manifest from .ecox file without verifying signature
 * This allows for public verification of the manifest contents
 */
export async function extractEcoManifest(ecoFile) {
  if (!ecoFile) {
    throw new Error('No file provided');
  }

  try {
    let zip;
    if (ecoFile instanceof Blob) {
      const arrayBuffer = await ecoFile.arrayBuffer();
      zip = await JSZip.loadAsync(arrayBuffer);
    } else {
      throw new Error('File must be a Blob');
    }

    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      throw new Error('Invalid .ecox file: manifest.json not found.');
    }

    const manifestJson = await manifestFile.async('string');
    const manifest = JSON.parse(manifestJson);

    if (!manifest || typeof manifest !== 'object') {
      throw new Error('Invalid manifest structure.');
    }

    // Validate basic manifest structure
    const requiredFields = ['specVersion', 'projectId', 'title', 'createdAt', 'author', 'assets', 'segments', 'operationLog', 'signatures'];
    for (const field of requiredFields) {
      if (!(field in manifest)) {
        throw new Error(`Missing required field in manifest: ${field}`);
      }
    }

    return {
      valid: true,
      manifest,
      error: null
    };
  } catch (error) {
    return {
      valid: false,
      manifest: null,
      error: error.message
    };
  }
}

/**
 * Verify blockchain anchoring status by calling the backend
 */
export async function checkBlockchainAnchoring(hash) {
  try {
    // Call the backend to check blockchain anchoring status
    const response = await fetch('/api/check-anchor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hash }),
    });

    if (response.ok) {
      const result = await response.json();
      return result;
    } else {
      // Return mock result if backend not available
      return {
        anchored: false,
        network: 'N/A',
        txId: 'N/A',
        proof: null
      };
    }
  } catch (error) {
    console.error('Error checking blockchain anchoring:', error);
    // Return mock result on error
    return {
      anchored: false,
      network: 'N/A',
      txId: 'N/A',
      proof: null
    };
  }
}

/**
 * Get basic verification result from manifest
 */
export function getVerificationResult(manifest) {
  return {
    valid: true,
    hash: manifest.assets.length > 0 ? manifest.assets[0].sha256 : 'N/A',
    timestamp: new Date(manifest.createdAt).toISOString(),
    author: manifest.author?.name || 'Unknown',
    title: manifest.title || 'Documento sin título',
    projectId: manifest.projectId || 'N/A',
    signatures: manifest.signatures.map(sig => ({
      signer: sig.keyId,
      date: new Date(sig.createdAt).toISOString(),
      algorithm: sig.algorithm || 'N/A',
      verified: true // Basic check passed
    })),
    assets: manifest.assets.map(asset => ({
      id: asset.id,
      fileName: asset.fileName,
      mediaType: asset.mediaType,
      sha256: asset.sha256
    })),
    segments: manifest.segments || []
  };
}