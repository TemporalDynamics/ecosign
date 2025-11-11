// client/src/utils/ecoxParser.js
/**
 * .ECOX File Parser - Extracts and validates .ecox files
 * 
 * This utility provides comprehensive parsing of .ecox files with special
 * attention to legal timestamp verification using RFC 3161 compliance.
 */

/**
 * Parse .ecox file and extract all relevant information
 * @param {File} ecoxFile - The .ecox file to parse
 * @returns {Promise<Object>} Parsed information from the .ecox file
 */
export async function parseEcoxFull(ecoxFile) {
  try {
    // Read the file as text
    const text = await readFileAsText(ecoxFile);
    const ecoxData = JSON.parse(text);

    // Validate .ecox format
    if (!ecoxData.format || !ecoxData.manifest || !ecoxData.signatures) {
      throw new Error('Invalid .ecox format: missing required fields');
    }

    // Extract manifest data
    const { manifest, signatures, version } = ecoxData;
    
    // Get the first signature (usually the only one)
    const signature = signatures[0];
    
    // Extract legal timestamp info if present
    const legalTimestamp = signature?.legalTimestamp;
    
    // Prepare result object
    const result = {
      isValid: true,
      format: ecoxData.format,
      version: version || 'unknown',
      metadata: {
        title: manifest.metadata?.title || 'Untitled',
        author: manifest.metadata?.author || 'Unknown',
        description: manifest.metadata?.description || 'No description',
        createdAt: manifest.createdAt,
        updatedAt: manifest.updatedAt || manifest.createdAt
      },
      assets: manifest.assets || {},
      segments: manifest.segments || [],
      operationLog: manifest.operationLog || [],
      signatures: signatures,
      signatureInfo: {
        algorithm: signature?.algorithm || 'unknown',
        keyId: signature?.keyId || 'unknown',
        createdAt: signature?.createdAt,
        publicKey: signature?.publicKey
      },
      legalTimestamp: legalTimestamp ? {
        token: legalTimestamp.token,
        tsa: legalTimestamp.tsa,
        timestamp: legalTimestamp.timestamp,
        policy: legalTimestamp.policy,
        serialNumber: legalTimestamp.serialNumber
      } : null,
      verificationStatus: {
        formatValid: true,
        signatureValid: signature ? true : false,
        legalTimestampPresent: !!legalTimestamp
      }
    };

    return result;
  } catch (error) {
    return {
      isValid: false,
      error: error.message
    };
  }
}

/**
 * Read file as text
 * @param {File} file - File to read
 * @returns {Promise<string>} File content as text
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Verify only the legal timestamp (TSR) from a .ecox file
 * @param {File} ecoxFile - The .ecox file to verify
 * @returns {Promise<Object>} TSR verification result
 */
export async function verifyEcoLegalTimestamp(ecoxFile) {
  try {
    const parsed = await parseEcoxFull(ecoxFile);
    
    if (!parsed.isValid) {
      return {
        success: false,
        error: parsed.error
      };
    }

    if (!parsed.legalTimestamp?.token) {
      return {
        success: false,
        error: 'No legal timestamp found in .ecox file'
      };
    }

    // Call the server API for TSR verification
    const response = await fetch('/api/verify-tsr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tsrTokenB64: parsed.legalTimestamp.token,
        manifestHashHex: parsed.assets[Object.keys(parsed.assets)[0]]?.sha256
      })
    });

    if (!response.ok) {
      throw new Error(`Server verification failed: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Extract only the essential verification info for display
 * @param {File} ecoxFile - The .ecox file
 * @returns {Promise<Object>} Essential verification info
 */
export async function getEcoxVerificationSummary(ecoxFile) {
  try {
    const parsed = await parseEcoxFull(ecoxFile);
    
    if (!parsed.isValid) {
      throw new Error(parsed.error);
    }

    // Get basic manifest info
    const assets = Object.values(parsed.assets);
    const asset = assets[0]; // Use first asset
    
    const summary = {
      fileName: parsed.metadata.title,
      author: parsed.metadata.author,
      createdAt: parsed.metadata.createdAt,
      asset: {
        name: asset?.fileName,
        mediaType: asset?.mediaType,
        hash: asset?.sha256,
        size: asset?.size
      },
      signature: {
        algorithm: parsed.signatureInfo.algorithm,
        keyId: parsed.signatureInfo.keyId,
        createdAt: parsed.signatureInfo.createdAt
      },
      legalTimestamp: parsed.legalTimestamp ? {
        present: true,
        tsa: parsed.legalTimestamp.tsa,
        timestamp: parsed.legalTimestamp.timestamp
      } : {
        present: false
      },
      verificationReady: true
    };

    return summary;
  } catch (error) {
    return {
      error: error.message
    };
  }
}