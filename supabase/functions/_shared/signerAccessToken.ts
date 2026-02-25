import { createTokenHash } from './cryptoHelper.ts';

type SignerTokenState = {
  id: string;
  access_token_hash: string | null;
  token_expires_at?: string | null;
  token_revoked_at?: string | null;
};

type FailedValidation = {
  ok: false;
  status: number;
  error: string;
};

type SuccessfulValidation<T> = {
  ok: true;
  signer: T;
  matchedHash: string;
};

export type SignerTokenValidationResult<T> = FailedValidation | SuccessfulValidation<T>;

const isTokenHash = (value?: string | null) =>
  Boolean(value && /^[a-f0-9]{64}$/i.test(value));

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function buildTokenHashCandidates(accessToken: string): Promise<string[]> {
  const normalized = accessToken.trim();
  if (!normalized) return [];
  if (isTokenHash(normalized)) return [normalized.toLowerCase()];

  const candidates = new Set<string>();

  try {
    candidates.add((await createTokenHash(normalized)).toLowerCase());
  } catch {
    // Keep compatibility fallback below when TOKEN_SECRET is unavailable.
  }

  candidates.add((await sha256Hex(normalized)).toLowerCase());
  return Array.from(candidates);
}

function isExpired(value: string | null | undefined): boolean {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() < Date.now();
}

export async function validateSignerAccessToken<T extends SignerTokenState>(
  supabase: any,
  signerId: string,
  accessToken: string,
  selectClause = 'id, access_token_hash, token_expires_at, token_revoked_at',
): Promise<SignerTokenValidationResult<T>> {
  const normalizedSignerId = signerId.trim();
  const normalizedAccessToken = accessToken.trim();

  if (!normalizedSignerId) {
    return { ok: false, status: 400, error: 'signerId is required' };
  }

  if (!normalizedAccessToken) {
    return { ok: false, status: 400, error: 'accessToken is required' };
  }

  const { data: signer, error: signerError } = await supabase
    .from('workflow_signers')
    .select(selectClause)
    .eq('id', normalizedSignerId)
    .single();

  if (signerError || !signer) {
    return { ok: false, status: 404, error: 'Signer not found' };
  }

  const candidates = await buildTokenHashCandidates(normalizedAccessToken);
  const signerHash = typeof signer.access_token_hash === 'string'
    ? signer.access_token_hash.toLowerCase()
    : null;

  const matchedHash = signerHash && candidates.includes(signerHash) ? signerHash : null;
  if (!matchedHash) {
    return { ok: false, status: 403, error: 'Invalid or expired access token' };
  }

  if (signer.token_revoked_at) {
    return { ok: false, status: 403, error: 'Invalid or expired access token' };
  }

  if (isExpired(signer.token_expires_at)) {
    return { ok: false, status: 403, error: 'Invalid or expired access token' };
  }

  return { ok: true, signer: signer as T, matchedHash };
}
