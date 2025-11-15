/**
 * Lightweight OpenTimestamps helpers.
 *
 * This implementation intentionally acts as a placeholder so the UI
 * can surface Bitcoin anchoring states without depending on runtime
 * secrets or a dedicated backend yet.
 *
 * When the real OpenTimestamps flow is ready, replace the internals of
 * createOTSProof/verifyOTSProof with actual API calls.
 */

export interface OTSResult {
  ots: Uint8Array;
  pending: boolean;
  timestamp?: number;
}

function hexToUint8Array(hex: string): Uint8Array {
  const sanitized = hex.replace(/[^0-9a-f]/gi, '');
  const length = Math.floor(sanitized.length / 2);
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = parseInt(sanitized.substr(i * 2, 2), 16);
  }
  return bytes;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createOTSProof(fileHash: string): Promise<OTSResult> {
  try {
    // Placeholder implementation: mimic async anchoring without hitting
    // external APIs so the UI flow is ready.
    await delay(300);
    const bytes = hexToUint8Array(fileHash);
    return {
      ots: bytes,
      pending: true,
      timestamp: undefined,
    };
  } catch (error) {
    console.error('Bitcoin anchoring placeholder error:', error);
    throw new Error('No se pudo iniciar el anclaje en Bitcoin');
  }
}

export async function verifyOTSProof(_fileHash: string, _otsProof: Uint8Array): Promise<{ verified: boolean; timestamp?: number }>
{
  // Placeholder – until the real verification is wired, always return
  // pending status so cron jobs / polling won’t break.
  return { verified: false, timestamp: undefined };
}
