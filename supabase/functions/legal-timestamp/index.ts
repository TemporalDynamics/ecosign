import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface TimestampRequestBody {
  hash_hex: string
  tsa_url?: string
  nonce_bytes?: number
  cert_req?: boolean
}

const DEFAULT_TSA_URL = 'https://freetsa.org/tsr'
const HASH_ALGORITHM_OID = '2.16.840.1.101.3.4.2.1' // SHA-256

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.toLowerCase()
  if (!/^([0-9a-f]{2})+$/.test(clean)) {
    throw new Error('Invalid hex payload')
  }
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16)
  }
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

function encodeLength(length: number): Uint8Array {
  if (length < 0x80) {
    return new Uint8Array([length])
  }
  const bytes: number[] = []
  let value = length
  while (value > 0) {
    bytes.unshift(value & 0xff)
    value >>= 8
  }
  return new Uint8Array([0x80 | bytes.length, ...bytes])
}

function encodeTag(tag: number, content: Uint8Array): Uint8Array {
  return concatBytes(new Uint8Array([tag]), encodeLength(content.length), content)
}

function encodeInteger(value: number | bigint | Uint8Array): Uint8Array {
  let bytes: Uint8Array
  if (value instanceof Uint8Array) {
    bytes = value
  } else {
    let bigintVal = typeof value === 'number' ? BigInt(value) : value
    if (bigintVal < 0n) {
      throw new Error('Negative integers are not supported in RFC 3161 nonce encoding')
    }
    const temp: number[] = []
    if (bigintVal === 0n) {
      temp.push(0)
    } else {
      while (bigintVal > 0n) {
        temp.unshift(Number(bigintVal & 0xffn))
        bigintVal >>= 8n
      }
    }
    bytes = new Uint8Array(temp)
  }

  // Ensure the first bit indicates positive number
  if (bytes.length === 0 || bytes[0] & 0x80) {
    bytes = concatBytes(new Uint8Array([0x00]), bytes)
  }
  return encodeTag(0x02, bytes)
}

function encodeObjectIdentifier(oid: string): Uint8Array {
  const parts = oid.split('.').map((part) => parseInt(part, 10))
  if (parts.length < 2) {
    throw new Error('Invalid OID format')
  }
  const firstByte = parts[0] * 40 + parts[1]
  const encoded: number[] = [firstByte]

  for (let i = 2; i < parts.length; i++) {
    let value = parts[i]
    if (value < 0) {
      throw new Error('OID components must be positive')
    }
    const stack: number[] = []
    do {
      stack.unshift(value & 0x7f)
      value >>= 7
    } while (value > 0)
    for (let j = 0; j < stack.length - 1; j++) {
      stack[j] |= 0x80
    }
    encoded.push(...stack)
  }

  return encodeTag(0x06, new Uint8Array(encoded))
}

function encodeNull(): Uint8Array {
  return new Uint8Array([0x05, 0x00])
}

function encodeOctetString(data: Uint8Array): Uint8Array {
  return encodeTag(0x04, data)
}

function encodeBoolean(value: boolean): Uint8Array {
  return encodeTag(0x01, new Uint8Array([value ? 0xff : 0x00]))
}

function encodeSequence(...elements: Uint8Array[]): Uint8Array {
  const content = concatBytes(...elements)
  return encodeTag(0x30, content)
}

function buildMessageImprint(hashBytes: Uint8Array): Uint8Array {
  const algorithm = encodeSequence(
    encodeObjectIdentifier(HASH_ALGORITHM_OID),
    encodeNull()
  )
  return encodeSequence(
    algorithm,
    encodeOctetString(hashBytes)
  )
}

function randomNonce(byteLength: number): Uint8Array {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return bytes
}

function buildTimestampRequest(hashBytes: Uint8Array, nonceLength = 12, certReq = true): Uint8Array {
  const version = encodeInteger(1)
  const messageImprint = buildMessageImprint(hashBytes)
  const nonce = encodeInteger(randomNonce(nonceLength))
  const certReqBoolean = encodeBoolean(certReq)
  return encodeSequence(version, messageImprint, nonce, certReqBoolean)
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405)
  }

  try {
    const body = await req.json() as TimestampRequestBody
    const hashHex = body.hash_hex?.trim()

    if (!hashHex || !/^[a-f0-9]{64}$/i.test(hashHex)) {
      throw new Error('hash_hex must be a valid SHA-256 hex string')
    }

    const hashBytes = hexToBytes(hashHex)
    const tsaUrl = body.tsa_url || DEFAULT_TSA_URL
    const nonceLength = body.nonce_bytes && body.nonce_bytes >= 8 && body.nonce_bytes <= 32
      ? body.nonce_bytes
      : 12

    const tsrBytes = buildTimestampRequest(hashBytes, nonceLength, body.cert_req ?? true)

    const response = await fetch(tsaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/timestamp-query',
        'Accept': 'application/timestamp-reply'
      },
      body: tsrBytes
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`TSA request failed (${response.status}): ${text || response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const tokenBase64 = bufferToBase64(arrayBuffer)

    return jsonResponse({
      success: true,
      token: tokenBase64,
      tsa_url: tsaUrl,
      token_bytes: arrayBuffer.byteLength,
      algorithm: 'SHA-256',
      standard: 'RFC 3161'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    console.error('legal-timestamp error', message)
    return jsonResponse({ success: false, error: message }, 400)
  }
})
