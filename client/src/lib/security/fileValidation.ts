const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.txt', '.zip'];
const MIME_EXTENSION_MAP: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.txt': ['text/plain'],
  '.zip': ['application/zip', 'application/x-zip-compressed']
};
const MAGIC_BYTES: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF, 0xE0],
    [0xFF, 0xD8, 0xFF, 0xE1]
  ],
  'application/zip': [[0x50, 0x4B, 0x03, 0x04]]
};

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  size?: number;
  type?: string;
  name?: string;
}

function hasValidMagicBytes(fileBytes: Uint8Array, mimeType: string): boolean {
  const expected = MAGIC_BYTES[mimeType];
  if (!expected) return true;
  return expected.some(bytes => bytes.every((value, idx) => fileBytes[idx] === value));
}

export async function validateFile(file: File): Promise<FileValidationResult> {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  if (file.size === 0) {
    return { valid: false, error: 'Archivo vacío' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Archivo demasiado grande: ${(file.size / 1024 / 1024).toFixed(2)}MB. Máximo permitido: 100MB`
    };
  }

  const extension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { valid: false, error: `Tipo de archivo no permitido: ${extension}` };
  }

  const mimeType = file.type.toLowerCase();
  const expectedMimes = MIME_EXTENSION_MAP[extension];
  if (!expectedMimes || !expectedMimes.includes(mimeType)) {
    return { valid: false, error: `La extensión ${extension} no coincide con el tipo MIME ${mimeType}` };
  }

  if (MAGIC_BYTES[mimeType]) {
    const buffer = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (!hasValidMagicBytes(bytes, mimeType)) {
      return { valid: false, error: 'Archivo corrupto o disfrazado detectado' };
    }
  }

  return {
    valid: true,
    size: file.size,
    type: mimeType,
    name: file.name
  };
}
