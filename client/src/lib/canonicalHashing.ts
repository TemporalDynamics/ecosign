/**
 * Canonical hashing (WebCrypto-only).
 *
 * Returns lowercase hex SHA-256 for exact byte inputs.
 */

const toArrayBuffer = async (
  input: ArrayBuffer | Uint8Array | Blob | File
): Promise<ArrayBuffer> => {
  if (input instanceof ArrayBuffer) {
    return input;
  }

  if (input instanceof Uint8Array) {
    return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  }

  return await input.arrayBuffer();
};

const bufferToHex = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
};

const hashBytes = async (bytes: ArrayBuffer): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return bufferToHex(digest);
};

export async function hashSource(
  input: ArrayBuffer | Uint8Array | Blob | File
): Promise<string> {
  const bytes = await toArrayBuffer(input);
  return await hashBytes(bytes);
}

export async function hashWitness(
  pdfBytes: ArrayBuffer | Uint8Array
): Promise<string> {
  const bytes = await toArrayBuffer(pdfBytes);
  return await hashBytes(bytes);
}

export async function hashSigned(
  pdfBytes: ArrayBuffer | Uint8Array
): Promise<string> {
  const bytes = await toArrayBuffer(pdfBytes);
  return await hashBytes(bytes);
}
