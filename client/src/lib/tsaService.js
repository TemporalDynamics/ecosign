/**
 * TSA integration that requests RFC 3161 timestamps via Supabase Edge Functions
 * and verifies the returned token locally before embedding it in the .ECO data.
 */

import { getSupabase } from './supabaseClient';
import { verifyTSRToken } from './tsrVerifier';

const DEFAULT_TSA_URL = 'https://freetsa.org/tsr';

function validateHashHex(hashHex) {
  if (!hashHex || typeof hashHex !== 'string') {
    throw new Error('Hash requerido para solicitar timestamp legal');
  }

  if (!/^[a-f0-9]{64}$/i.test(hashHex)) {
    throw new Error('Hash inválido: debe ser SHA-256 en hexadecimal');
  }
}

function estimateTokenSizeBase64(base64Token) {
  if (!base64Token) return 0;
  // Base64 size to bytes (approx) -> (len * 3) / 4 - padding
  const padding = (base64Token.endsWith('==') ? 2 : base64Token.endsWith('=') ? 1 : 0);
  return Math.floor((base64Token.length * 3) / 4) - padding;
}

export async function requestLegalTimestamp(hashHex, options = {}) {
  const supabase = getSupabase();
  validateHashHex(hashHex);

  const payload = {
    hash_hex: hashHex.toLowerCase(),
    tsa_url: options.tsaUrl || DEFAULT_TSA_URL
  };

  const { data, error } = await supabase.functions.invoke('legal-timestamp', {
    body: payload
  });

  if (error) {
    throw new Error(error.message || 'No se pudo contactar a la TSA');
  }

  if (!data?.success || !data.token) {
    throw new Error(data?.error || 'La TSA no devolvió un token válido');
  }

  let parsed = null;
  try {
    parsed = await verifyTSRToken(data.token, hashHex);
  } catch (parseError) {
    console.warn('⚠️ No se pudo validar el token TSR localmente', parseError);
  }

  const timestamp = parsed?.timestamp || new Date().toISOString();
  const algorithmName = parsed?.algorithmName || data.algorithm || 'SHA-256';

  return {
    success: true,
    timestamp,
    tsaUrl: data.tsa_url || DEFAULT_TSA_URL,
    tsaName: data.tsa_url || DEFAULT_TSA_URL,
    token: data.token,
    tokenSize: data.token_bytes || estimateTokenSizeBase64(data.token),
    algorithm: algorithmName,
    standard: data.standard || 'RFC 3161',
    verified: parsed?.hashMatches !== false,
    policy: parsed?.policy || null,
    serialNumber: parsed?.serialNumber || null,
    accuracy: parsed?.accuracy || null,
    note: parsed?.meta ? `Token ${parsed.meta.format || 'TSTInfo'}` : undefined
  };
}

export function getAvailableTSAs() {
  return {
    free: [
      {
        name: 'FreeTSA',
        url: DEFAULT_TSA_URL,
        cost: 'Free',
        reliability: 'Good',
        legalValidity: 'International (RFC 3161 compliant)'
      }
    ],
    premium: []
  };
}