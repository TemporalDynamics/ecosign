import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import JSZip from 'npm:jszip@3.10.1'
import * as ed from 'npm:@noble/ed25519@2.0.0'
import { sha256 } from 'npm:@noble/hashes@1.3.2/sha256'
import { bytesToHex, hexToBytes } from 'npm:@noble/hashes@1.3.2/utils'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface VerificationResult {
  valid: boolean
  fileName: string
  hash: string
  timestamp: string
  timestampType: string
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

  // Load ZIP
  const zip = await JSZip.loadAsync(fileBuffer)

  // Extract manifest.json
  const manifestFile = zip.file('manifest.json')
  if (!manifestFile) {
    throw new Error('Archivo .ECOX corrupto: falta manifest.json')
  }
  const manifestJson = await manifestFile.async('string')
  const manifest = JSON.parse(manifestJson)

  // Extract signatures.json
  const signaturesFile = zip.file('signatures.json')
  if (!signaturesFile) {
    throw new Error('Archivo .ECOX corrupto: falta signatures.json')
  }
  const signaturesJson = await signaturesFile.async('string')
  const signatures = JSON.parse(signaturesJson)

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
      errors.push('Timestamp legal declarado pero sin token RFC 3161')
      legalTimestamp.verified = false
    }
  }

  // Determine timestamp type
  const timestampType = legalTimestamp.enabled
    ? 'RFC 3161 Legal Timestamp'
    : 'Local (Informational)'

  // Extract metadata
  const metadataFile = zip.file('metadata.json')
  let hasLegalTimestampMetadata = false
  if (metadataFile) {
    try {
      const metadataJson = await metadataFile.async('string')
      const metadata = JSON.parse(metadataJson)
      hasLegalTimestampMetadata = metadata.hasLegalTimestamp === true
    } catch {
      warnings.push('No se pudo leer metadata.json')
    }
  }

  // Cross-check: metadata says legal timestamp but signature doesn't have it
  if (hasLegalTimestampMetadata && !legalTimestamp.enabled) {
    errors.push('Inconsistencia: metadata indica timestamp legal pero no hay token')
  }

  const result: VerificationResult = {
    valid: signatureValid && errors.length === 0,
    fileName: asset.name || manifest.metadata?.title || 'Unknown',
    hash: asset.hash,
    timestamp: primarySignature.timestamp || manifest.metadata?.createdAt,
    timestampType,
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
