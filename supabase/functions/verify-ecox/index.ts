import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import JSZip from 'npm:jszip@3.10.1'
import * as ed from 'npm:@noble/ed25519@2.0.0'
import { sha256 } from 'npm:@noble/hashes@1.3.2/sha256'
import { bytesToHex, hexToBytes } from 'npm:@noble/hashes@1.3.2/utils'
import { createClient } from 'npm:@supabase/supabase-js@2.42.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
)

// Define interface for Anchor Data from DB
interface AnchorData {
  project_id: string; // Corresponds to manifest.projectId
  polygon_confirmed_at: string | null;
  bitcoin_confirmed_at: string | null;
  // Add any other relevant anchor fields that indicate request/status
}

interface VerificationResult {
  valid: boolean
  fileName: string
  hash: string
  timestamp: string
  timestampType: string
  certificateSchemaVersion?: string
  identityAssurance?: {
    level?: string
    provider?: string
    method?: string | null
    timestamp?: string
    signals?: string[]
    label?: string
  }
  timeAssurance?: {
    source?: string
    confidence?: string
  }
  intent?: {
    intentConfirmed?: boolean
    intentMethod?: string
  }
  environment?: {
    deviceType?: string
    osFamily?: string
    networkType?: string
  }
  systemCapabilities?: {
    biometricVerification?: boolean
    inPersonVerification?: boolean
  }
  limitations?: string[]
  probativeSignals?: { // REPLACED probativeState
    anchorRequested: boolean,
    polygonConfirmed: boolean,
    bitcoinConfirmed: boolean,
    fetchError: boolean,
  }
  policySnapshotId?: string
  eventLineage?: {
    eventId?: string
    previousEventId?: string | null
    cause?: string
  }
  signature: {
    algorithm: string
    valid: boolean
    publicKey?: string
  }
  legalTimestamp?: {
    enabled: boolean
    standard?: string
    tsa?: string
    tokenSize?: number
    verified?: boolean
  }
  manifest?: {
    projectId: string
    title: string
    author: string
    createdAt: string
    assets: Array<{
      name: string
      size: number
      hash: string
    }>
  }
  errors: string[]
  warnings: string[]
}

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })

async function verifyEd25519Signature(
  message: string,
  signatureHex: string,
  publicKeyHex: string
): Promise<boolean> {
  try {
    const messageBytes = new TextEncoder().encode(message)
    const signatureBytes = hexToBytes(signatureHex)
    const publicKeyBytes = hexToBytes(publicKeyHex)
    return await ed.verifyAsync(signatureBytes, messageBytes, publicKeyBytes)
  } catch {
    return false
  }
}

async function extractAndVerifyEcox(fileBuffer: ArrayBuffer): Promise<VerificationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  let manifest: any
  let signatures: any[]
    let metadata: any
  let manifestJson: string
  let identityAssurance: {
    level?: string
    provider?: string
    method?: string | null
    timestamp?: string
    signals?: string[]
  } | undefined
  let timeAssurance: { source?: string; confidence?: string } | undefined
  let intent: { intent_confirmed?: boolean; intent_method?: string } | undefined
  let environment: { device_type?: string; os_family?: string; network_type?: string } | undefined
  let systemCapabilities: { biometric_verification?: boolean; in_person_verification?: boolean } | undefined
  let limitations: string[] | undefined
  let policySnapshotId: string | undefined
  let eventLineage: { event_id?: string; previous_event_id?: string | null; cause?: string } | undefined
  let certificateSchemaVersion: string | undefined

  // Try to parse as unified JSON format first (new format)
  try {
    const textContent = new TextDecoder().decode(fileBuffer)
    const ecoData = JSON.parse(textContent)

    // Check if it's the new unified format
    if (ecoData.version && ecoData.manifest && ecoData.signatures && ecoData.metadata) {
      console.log('✅ Detected unified .eco format (JSON)')
      manifest = ecoData.manifest
      signatures = ecoData.signatures
      metadata = ecoData.metadata
      manifestJson = JSON.stringify(manifest, null, 2)
      identityAssurance = ecoData.identity_assurance || ecoData.metadata?.identity_assurance
      timeAssurance = ecoData.time_assurance || ecoData.metadata?.time_assurance
      intent = ecoData.intent || ecoData.metadata?.intent
      environment = ecoData.environment || ecoData.metadata?.environment
      systemCapabilities = ecoData.system_capabilities || ecoData.metadata?.system_capabilities
      limitations = ecoData.limitations || ecoData.metadata?.limitations
      policySnapshotId = ecoData.policy_snapshot_id || ecoData.metadata?.policy_snapshot_id
      eventLineage = ecoData.event_lineage || ecoData.metadata?.event_lineage
      certificateSchemaVersion = ecoData.certificate_schema_version
    } else {
      throw new Error('Not unified format')
    }
  } catch {
    // If JSON parsing fails, try legacy ZIP format
    console.log('📦 Trying legacy .ecox format (ZIP)')
    try {
      const zip = await JSZip.loadAsync(fileBuffer)

      // Extract manifest.json
      const manifestFile = zip.file('manifest.json')
      if (!manifestFile) {
        throw new Error('Archivo .ECOX corrupto: falta manifest.json')
      }
      manifestJson = await manifestFile.async('string')
      manifest = JSON.parse(manifestJson)

      // Extract signatures.json
      const signaturesFile = zip.file('signatures.json')
      if (!signaturesFile) {
        throw new Error('Archivo .ECOX corrupto: falta signatures.json')
      }
      const signaturesJson = await signaturesFile.async('string')
      signatures = JSON.parse(signaturesJson)

      // Extract metadata.json (optional)
      const metadataFile = zip.file('metadata.json')
      if (metadataFile) {
        const metadataJson = await metadataFile.async('string')
        metadata = JSON.parse(metadataJson)
      }
    } catch (zipError) {
      throw new Error('Formato de archivo no reconocido. Debe ser .eco (JSON) o .ecox (ZIP)')
    }
  }

  if (!Array.isArray(signatures) || signatures.length === 0) {
    throw new Error('No se encontraron firmas en el archivo')
  }

  const primarySignature = signatures[0]

  // Verify Ed25519 signature
  let signatureValid = false
  if (primarySignature.signature && primarySignature.publicKey) {
    signatureValid = await verifyEd25519Signature(
      manifestJson,
      primarySignature.signature,
      primarySignature.publicKey
    )
  }

  if (!signatureValid) {
    errors.push('La firma Ed25519 no es válida o ha sido alterada')
  }

  // Extract asset hash from manifest
  const asset = manifest.assets?.[0]
  if (!asset) {
    throw new Error('El manifiesto no contiene información del documento')
  }

  // Check legal timestamp
  let legalTimestamp: VerificationResult['legalTimestamp'] = { enabled: false }

  if (primarySignature.legalTimestamp) {
    const lt = primarySignature.legalTimestamp
    legalTimestamp = {
      enabled: true,
      standard: lt.standard || 'RFC 3161',
      tsa: lt.tsa || lt.tsaUrl,
      tokenSize: lt.tokenSize,
      verified: lt.verified !== false
    }

    // Validate TSA token exists and has reasonable size
    if (lt.token && lt.tokenSize > 1000) {
      // Token present and has size (real TSA tokens are 4-6KB)
      if (lt.tokenSize < 3000) {
        warnings.push('El token TSA es inusualmente pequeño')
      }
    } else if (lt.token) {
      warnings.push('Token TSA presente pero podría ser simulado')
    } else {
      // Don't mark as error if null, just disabled
      if (lt.token === undefined) {
        legalTimestamp.enabled = false
      }
    }
  }

  // Determine timestamp type
  const timestampType = legalTimestamp.enabled
    ? 'RFC 3161 Legal Timestamp'
    : metadata?.timestampType || 'Local (Informational)'

  // Check metadata for forensic info
  const hasLegalTimestampMetadata = metadata?.forensicEnabled === true || metadata?.hasLegalTimestamp === true

  // Cross-check: metadata says legal timestamp but signature doesn't have it
  if (hasLegalTimestampMetadata && !legalTimestamp.enabled) {
    warnings.push('Metadata indica blindaje forense pero timestamp legal no está presente')
  }

  // Identity assurance metadata (optional, defaults to IAL-1)
  const rawIdentity = identityAssurance
    || metadata?.identity_assurance
    || {}
  const computedIdentityLevel = rawIdentity.level || 'IAL-1'
  const computedIdentity = {
    level: computedIdentityLevel,
    provider: rawIdentity.provider || 'ecosign',
    method: rawIdentity.method ?? null,
    timestamp: rawIdentity.timestamp,
    signals: Array.isArray(rawIdentity.signals) ? rawIdentity.signals : [],
    label: 'Estándar' // UI-friendly, not part of canonical hashing rules
  }

  const computedTimeAssurance = timeAssurance || metadata?.time_assurance || {
    source: 'local_clock',
    confidence: 'informational'
  }

  const intentSource = intent || metadata?.intent
  const computedIntent = intentSource ? {
    intentConfirmed: intentSource.intent_confirmed ?? false,
    intentMethod: intentSource.intent_method
  } : undefined

  const rawEnvironment = environment || metadata?.environment
  const computedEnvironment = rawEnvironment ? {
    deviceType: rawEnvironment.device_type,
    osFamily: rawEnvironment.os_family,
    networkType: rawEnvironment.network_type
  } : undefined

  const rawCapabilities = systemCapabilities || metadata?.system_capabilities
  const computedCapabilities = rawCapabilities ? {
    biometricVerification: rawCapabilities.biometric_verification ?? false,
    inPersonVerification: rawCapabilities.in_person_verification ?? false
  } : undefined

  const computedLimitations = Array.isArray(limitations || metadata?.limitations)
    ? (limitations || metadata?.limitations)
    : undefined

  const computedPolicySnapshotId = policySnapshotId || metadata?.policy_snapshot_id

  // --- Proof Resolver Logic ---
  const probativeSignals: VerificationResult['probativeSignals'] = {
    anchorRequested: false,
    polygonConfirmed: false,
    bitcoinConfirmed: false,
    fetchError: false,
  };

  if (manifest.projectId) { // Only query if projectId is available
    try {
      const { data, error } = await supabase
        .from('anchors') // Assuming 'anchors' is the table name
        .select('polygon_confirmed_at, bitcoin_confirmed_at')
        .eq('project_id', manifest.projectId)
        .maybeSingle();

      if (error) {
        console.error('Error querying anchor data:', error.message);
        warnings.push(`No se pudo consultar el estado de anclaje: ${error.message}`);
        probativeSignals.fetchError = true;
      } else if (data) {
        probativeSignals.anchorRequested = true; // Record found means anchor was requested
        probativeSignals.polygonConfirmed = !!data.polygon_confirmed_at;
        probativeSignals.bitcoinConfirmed = !!data.bitcoin_confirmed_at;
      }
      // If data is null, anchorRequested remains false, which is correct.

    } catch (dbError) {
      console.error('Unexpected database error during anchor query:', dbError);
      warnings.push(`Error inesperado al consultar anclajes: ${(dbError as Error).message}`);
      probativeSignals.fetchError = true;
    }
  } else {
    warnings.push('No se encontró projectId en el manifiesto. No se consultarán los anclajes.');
  }
  // --- End of Proof Resolver Logic ---

  const result: VerificationResult = {
    valid: signatureValid && errors.length === 0,
    fileName: asset.name || manifest.metadata?.title || 'Unknown',
    hash: asset.hash,
    timestamp: primarySignature.timestamp || manifest.metadata?.createdAt,
    timestampType,
    certificateSchemaVersion: certificateSchemaVersion,
    identityAssurance: computedIdentity,
    timeAssurance: computedTimeAssurance,
    intent: computedIntent,
    environment: computedEnvironment,
    systemCapabilities: computedCapabilities,
    limitations: computedLimitations,
    probativeSignals: probativeSignals, // Add new field
    policySnapshotId: computedPolicySnapshotId,
    eventLineage: computedEventLineage,
    signature: {
      algorithm: primarySignature.algorithm || 'Ed25519',
      valid: signatureValid,
      publicKey: primarySignature.publicKey?.substring(0, 16) + '...'
    },
    legalTimestamp,
    manifest: {
      projectId: manifest.projectId,
      title: manifest.metadata?.title,
      author: manifest.metadata?.author,
      createdAt: manifest.metadata?.createdAt,
      assets: manifest.assets?.map((a: any) => ({
        name: a.name,
        size: a.size,
        hash: a.hash
      })) || []
    },
    errors,
    warnings
  }

  return result
}

async function verifyWithOriginal(
  ecoxBuffer: ArrayBuffer,
  originalBuffer: ArrayBuffer
): Promise<VerificationResult> {
  // First verify the ECOX
  const result = await extractAndVerifyEcox(ecoxBuffer)

  // Calculate hash of original file
  const originalBytes = new Uint8Array(originalBuffer)
  const originalHash = bytesToHex(sha256(originalBytes))

  // Compare with manifest hash
  const manifestHash = result.hash?.toLowerCase()
  const calculatedHash = originalHash.toLowerCase()

  if (manifestHash !== calculatedHash) {
    result.valid = false
    result.errors.push(
      `Hash del documento original (${calculatedHash.substring(0, 16)}...) no coincide con el certificado (${manifestHash?.substring(0, 16)}...)`
    )
  } else {
    // Add success indicator
    (result as any).originalFileMatches = true
  }

  return result
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ valid: false, error: 'Method not allowed' }, 405)
  }

  try {
    const formData = await req.formData()
    const ecoxFile = formData.get('ecox') as File
    const originalFile = formData.get('original') as File | null

    if (!ecoxFile) {
      throw new Error('Archivo .ECOX requerido')
    }

    const ecoxBuffer = await ecoxFile.arrayBuffer()

    let result: VerificationResult
    if (originalFile) {
      const originalBuffer = await originalFile.arrayBuffer()
      result = await verifyWithOriginal(ecoxBuffer, originalBuffer)
    } else {
      result = await extractAndVerifyEcox(ecoxBuffer)
    }

    return jsonResponse(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error de verificación'
    console.error('verify-ecox error:', message)
    return jsonResponse({
      valid: false,
      error: message,
      errors: [message],
      warnings: []
    }, 400)
  }
})
