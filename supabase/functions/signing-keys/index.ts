import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import * as ed from 'https://esm.sh/@noble/ed25519@2.0.0'
import { sha512 } from 'https://esm.sh/@noble/hashes@1.5.0/sha512'

// Required by @noble/ed25519 in non-browser environments
if (typeof (ed as any).etc?.sha512Sync !== 'function') {
  ;(ed as any).etc.sha512Sync = (...messages: Uint8Array[]) => {
    const total = messages.reduce((sum, m) => sum + m.length, 0)
    const merged = new Uint8Array(total)
    let offset = 0
    for (const m of messages) { merged.set(m, offset); offset += m.length }
    return sha512(merged)
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

function base64ToBytes(input: string): Uint8Array {
  const raw = atob(input)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function getPrivateKeyBytes(): Uint8Array | null {
  const primary = (Deno.env.get('ECO_SIGNING_PRIVATE_KEY_B64') || '').trim()
  const legacy = (Deno.env.get('ECO_SIGNING_PRIVATE_KEY') || '').trim()
  const raw = primary || legacy
  if (!raw) return null
  try {
    const normalized = raw.includes('BEGIN')
      ? raw.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
      : raw.replace(/\s+/g, '')
    const bytes = base64ToBytes(normalized)
    if (bytes.length === 32 || bytes.length === 64) return bytes
    return null
  } catch {
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const privateKey = getPrivateKeyBytes()
    if (!privateKey) {
      return new Response(JSON.stringify({ error: 'signing_key_not_configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const signer = ed as unknown as { getPublicKey: (sk: Uint8Array) => Promise<Uint8Array> }
    const publicKeyBytes = await signer.getPublicKey(privateKey)
    const publicKeyB64 = bytesToBase64(publicKeyBytes)

    const keyId = (Deno.env.get('ECO_SIGNING_PUBLIC_KEY_ID') || 'k1').trim()
    const rotationPolicy = (Deno.env.get('ECO_SIGNING_ROTATION_POLICY') || '').trim()

    // Parse valid_from from rotation policy (e.g. "annual;valid_from=2026-02-15")
    const validFromMatch = rotationPolicy.match(/valid_from=(\d{4}-\d{2}-\d{2})/)
    const validFrom = validFromMatch ? validFromMatch[1] : null

    const payload = {
      keys: [
        {
          key_id: keyId,
          alg: 'ed25519',
          public_key_b64: publicKeyB64,
          status: 'active',
          valid_from: validFrom,
          valid_until: null,
          usage: ['eco_institutional_signature'],
        },
      ],
    }

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err: any) {
    console.error('signing-keys error', err)
    return new Response(JSON.stringify({ error: err?.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
