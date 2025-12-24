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

const CERTIFICATE_SCHEMA_VERSION = '1.0';
const POLICY_SNAPSHOT_ID = 'policy_2025_11';
const IDENTITY_ASSURANCE_BASE = {
  level: 'IAL-1',
  provider: 'ecosign',
  method: null,
  signals: []
};

interface TsaResponse {
  success: boolean;
  timestamp?: string; // ISO string
  tsaName?: string;
  tsaUrl?: string;
  token?: string;
  tokenSize?: number;
  algorithm?: string;
  verified?: boolean;
  note?: string;
  message?: string; // For error messages
  standard?: string; // Added this property
}

interface CertificationOptions {
  privateKey?: string;
  publicKey?: string;
  userId?: string;
  userEmail?: string;
  signatureData?: string | null;
  signNowDocumentId?: string | null;
  signNowStatus?: string | null;
  useLegalTimestamp?: boolean;
  usePolygonAnchor?: boolean;
  useBitcoinAnchor?: boolean;
  tsaResponse?: TsaResponse | null;
  identityAssurance?: any; // To be refined if needed later
  intendedUse?: {
    legal_context: string;
    jurisdiction: string;
    not_a_qes: boolean;
  };
  humanSummary?: {
    summary: string;
  } | null;
}

/**
 * Reads a file and returns its ArrayBuffer
 */
async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file as ArrayBuffer."));
      }
    };
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
function calculateSHA256(data: Uint8Array): string {
  const hash = sha256(data);
  return bytesToHex(hash);
}

/**
 * Signs a message with Ed25519 (browser-compatible)
 * @param {string} message - Message to sign
 * @param {string} privateKeyHex - Private key as hex string
 * @returns {Promise<string>} Signature as hex string
 */
async function signMessage(message: string, privateKeyHex: string): Promise<string> {
  const messageBytes = utf8ToBytes(message);
  const privateKeyBytes = hexToBytes(privateKeyHex);
  const signature = await ed.signAsync(messageBytes, privateKeyBytes);
  return bytesToHex(signature);
}

/**
 * Converts Uint8Array to base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
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
function base64ToUint8Array(base64: string): Uint8Array {
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
async function createEcoXFormat(
  project: any, // Keeping as any for now to avoid cascade errors, will refine later if needed
  publicKeyHex: string,
  signature: string,
  timestamp: string,
  options: CertificationOptions = {} // ADDING options parameter back
): Promise<ArrayBuffer> { // Changing return type back to ArrayBuffer
  const tsa = options.tsaResponse;
  const intendedUse = options.intendedUse || {
    legal_context: 'evidence_of_integrity_and_time',
    jurisdiction: 'unspecified',
    not_a_qes: true
  };
  const humanSummary = options.humanSummary || null;
  const identityAssurance = options.identityAssurance || {
    ...IDENTITY_ASSURANCE_BASE,
    timestamp,
    subject: {
      userId: options.userId || 'anonymous',
      email: options.userEmail || 'anonymous@email.ecosign.app'
    }
  };

  // Create the signatures array
  const signatures = [
    {
      signatureId: `sig-${Date.now()}`,
      signerId: options.userEmail || 'anonymous@email.ecosign.app',
      keyId: options.userId || 'temp-key',
      publicKey: publicKeyHex,
      signature: signature,
      algorithm: 'Ed25519',
      timestamp: timestamp,
      // Legal timestamp certification (if requested)
      legalTimestamp: tsa && tsa.success ? {
        standard: 'RFC 3161',
        tsa: tsa.tsaName || tsa.tsaUrl,
        tsaUrl: tsa.tsaUrl || 'https://freetsa.org/tsr',
        token: tsa.token,
        tokenSize: tsa.tokenSize,
        algorithm: tsa.algorithm,
        verified: tsa.verified,
        note: tsa.note
      } : null
    }
  ];

  // Create metadata with forensic information
  const metadata = {
    certifiedAt: timestamp,
    certifiedBy: 'EcoSign',
    identity_assurance: identityAssurance,
    clientInfo: {
      userAgent: navigator?.userAgent || 'Unknown',
      platform: navigator?.platform || 'Unknown',
      language: navigator?.language || 'Unknown',
      createdWith: 'EcoSign Web Client'
    },
    forensicEnabled: options.useLegalTimestamp || options.usePolygonAnchor || options.useBitcoinAnchor || false,
    anchoring: {
      polygon: options.usePolygonAnchor || false,
      bitcoin: options.useBitcoinAnchor || false
    },
    timestampType: tsa && tsa.success ? 'RFC 3161 Legal' : 'Local (Informational)'
  };

  // Create unified .eco structure
  const ecoPayload = {
    version: project.version || '1.1.0',
    projectId: project.projectId,
    certificate_schema_version: CERTIFICATE_SCHEMA_VERSION,
    identity_assurance: identityAssurance,
    manifest: project,
    signatures: signatures,
    metadata: metadata,
    intent: {
      intent_confirmed: true,
      intent_method: 'explicit_acceptance'
    },
    time_assurance: tsa && tsa.success ? {
      source: 'RFC3161',
      confidence: 'high'
    } : {
      source: 'local_clock',
      confidence: 'informational'
    },
    environment: {
      device_type: /Mobi|Android/i.test(navigator?.userAgent || '') ? 'mobile' : 'desktop',
      os_family: navigator?.platform || 'unknown',
      network_type: 'unknown'
    },
    system_capabilities: {
      biometric_verification: false,
      in_person_verification: false
    },
    limitations: [
      'identity_not_biometrically_verified',
      'no_in_person_validation'
    ],
    policy_snapshot_id: POLICY_SNAPSHOT_ID,
    intended_use: intendedUse,
    ...(humanSummary ? { human_summary: humanSummary } : {}),
    event_lineage: {
      event_id: crypto.randomUUID(),
      previous_event_id: null,
      cause: 'certification_created'
    }
  };

  // Convert to JSON string and then to ArrayBuffer
  const ecoJson = JSON.stringify(ecoPayload, null, 2);
  const encoder = new TextEncoder();
  const arrayBuffer = encoder.encode(ecoJson); // This is a Uint8Array

  return arrayBuffer.buffer; // Correct return for ArrayBuffer
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
export async function certifyFile(file: File, options: CertificationOptions = {}): Promise<any> { // Keeping return any for now
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
    let privateKeyHex: string;
    let publicKeyHex: string;
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
    let tsaResponse: TsaResponse | null = null;
    const identityAssurance = {
      ...IDENTITY_ASSURANCE_BASE,
      timestamp,
      subject: {
        userId: options.userId || 'anonymous',
        email: options.userEmail || 'anonymous@email.ecosign.app'
      }
    };

    if (options.useLegalTimestamp) {
      console.log('🕐 Requesting legal timestamp certification...');
      try {
        const response = await requestLegalTimestamp(hash);
        if (response.success) {
          tsaResponse = response;
          timestamp = tsaResponse.timestamp!; // Asserting non-null as success implies timestamp
          console.log('✅ Legal timestamp received from TSA');
          console.log('  TSA:', tsaResponse.tsaUrl);
          console.log('  Standard:', tsaResponse.standard);
        } else {
          console.log('⚠️ TSA request failed, using local timestamp');
        }
      } catch (error: unknown) {
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
        tags: ['certified', 'ecosign', 'web']
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
    const intendedUse = options.intendedUse || {
      legal_context: 'evidence_of_integrity_and_time',
      jurisdiction: 'unspecified',
      not_a_qes: true
    };
    const humanSummary = options.humanSummary || {
      summary: `This certificate proves that the document named '${file.name}' existed in this exact form on ${timestamp} and has not been altered since.`
    };
    const ecoxBuffer = await createEcoXFormat(project, publicKeyHex, signature, timestamp, {
      userId: options.userId,
      userEmail: options.userEmail,
      tsaResponse: tsaResponse,
      identityAssurance,
      intendedUse,
      humanSummary
    });

    console.log('✅ .ecox file created:', ecoxBuffer.byteLength, 'bytes');

    // ✅ REFACTOR: Blockchain anchors moved to async post-certification
    // Bitcoin and Polygon anchoring now happens AFTER certifyFile() completes
    // This ensures certificate delivery is never blocked by external infrastructure

    // Create signatures structure for DB storage
    const signaturesData = [
      {
        keyId: options.userId || 'temp-key',
        signerId: options.userEmail || 'anonymous@email.ecosign.app',
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
      certificate_schema_version: CERTIFICATE_SCHEMA_VERSION,
      manifest: project,
      signatures: signaturesData,
      metadata: {
        createdWith: 'EcoSign Web Client',
        browserVersion: navigator.userAgent,
        hasLegalTimestamp: tsaResponse && tsaResponse.success,
        timestampType: tsaResponse && tsaResponse.success ? 'Legal Certification' : 'Local (Informational)',
        certifiedAt: timestamp,
        identity_assurance: identityAssurance,
        policy_snapshot_id: POLICY_SNAPSHOT_ID
      },
      intended_use: intendedUse,
      human_summary: humanSummary,
      intent: {
        intent_confirmed: true,
        intent_method: 'explicit_acceptance'
      },
      time_assurance: tsaResponse && tsaResponse.success ? {
        source: 'RFC3161',
        confidence: 'high'
      } : {
        source: 'local_clock',
        confidence: 'informational'
      },
      environment: {
        device_type: /Mobi|Android/i.test(navigator?.userAgent || '') ? 'mobile' : 'desktop',
        os_family: navigator?.platform || 'unknown',
        network_type: 'unknown'
      },
      system_capabilities: {
        biometric_verification: false,
        in_person_verification: false
      },
      limitations: [
        'identity_not_biometrically_verified',
        'no_in_person_validation'
      ],
      policy_snapshot_id: POLICY_SNAPSHOT_ID,
      event_lineage: {
        event_id: crypto.randomUUID(),
        previous_event_id: null,
        cause: 'certification_created'
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

  } catch (error: unknown) { // Type 'error' as unknown
    console.error('❌ Certification error:', error);
    if (error instanceof Error) { // Type guard
      console.error('Stack:', error.stack);
      throw new Error(`Certification failed: ${error.message}`);
    } else {
      throw new Error('Certification failed: An unknown error occurred.');
    }
  }
}
/**
 * Downloads the .ecox file to the user's computer
 *
 * @param {ArrayBuffer} ecoxBuffer - The .ecox file data
 * @param {string} originalFileName - Original file name (for naming the .ecox)
 */
export function downloadEcox(ecoxBuffer: ArrayBuffer, originalFileName: string): string {
  try {
    // Create blob from ArrayBuffer
    const blob = new Blob([new Uint8Array(ecoxBuffer)], { type: 'application/octet-stream' });

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

  } catch (error: unknown) {
    console.error('❌ Download error:', error);
    if (error instanceof Error) {
      throw new Error(`Download failed: ${error.message}`);
    } else {
      throw new Error('Download failed: An unknown error occurred.');
    }
  }
}

/**
 * Complete certification flow: certify + download
 *
 * NOTE: Blockchain anchoring (Bitcoin/Polygon) happens asynchronously AFTER
 * certification completes. The .eco file is always immediately available.
 *
 * @param {File} file - The file to certify
 * @param {Object} options - Certification options
 * @returns {Promise<Object>} Certification result
 */
export async function certifyAndDownload(file: File, options: CertificationOptions = {}): Promise<any> {
  const result = await certifyFile(file, options);

  // Download .eco immediately (blockchain anchoring happens async)
  const downloadedFileName = downloadEcox(result.ecoxBuffer, result.fileName);

  return {
    ...result,
    downloadedFileName: downloadedFileName,
    downloadStatus: 'completed'
  };
}
