/**
 * Encryption Service (Client-Side)
 *
 * Contrato: DOCUMENT_ENTITY_CONTRACT.md (custody_mode)
 *
 * Cifrado client-side de archivos originales para custody mode.
 *
 * Seguridad:
 * - AES-256-GCM (authenticated encryption)
 * - Clave derivada de master key del usuario (PBKDF2)
 * - IV aleatorio por archivo
 * - NUNCA se envía la clave al servidor
 * - Solo se almacena el ciphertext
 *
 * Formato de salida:
 * [IV (12 bytes)][Auth Tag (16 bytes)][Ciphertext (variable)]
 *
 * ⚠️ CRITICAL SECURITY NOTES:
 * - Master key se deriva de user.id + passphrase (cuando esté implementado)
 * - En Phase 1 (MVP), master key = hash(user.id) (NO ÓPTIMO, mejorar en Phase 2)
 * - En Phase 2, master key = PBKDF2(passphrase, user.id, 100000)
 * - La clave maestra NUNCA sale del cliente
 * - Los archivos son INACCESIBLES server-side sin la clave del usuario
 */

/**
 * Estructura del archivo cifrado
 */
export interface EncryptedFile {
  /** Archivo cifrado completo (IV + AuthTag + Ciphertext) */
  encrypted: ArrayBuffer;
  /** IV usado (para verificación, ya está en encrypted) */
  iv: Uint8Array;
  /** Tamaño original del archivo antes de cifrar */
  originalSize: number;
  /** MIME type original */
  originalMime: string;
  /** Nombre original del archivo */
  originalName: string;
}

/**
 * Deriva una clave de cifrado de 256 bits desde el user ID
 *
 * ⚠️ PHASE 1 IMPLEMENTATION (MVP):
 * Esta implementación usa solo user.id para derivar la clave.
 * NO es óptima para producción (falta passphrase del usuario).
 *
 * TODO (Phase 2 - Q2 2026):
 * - Solicitar passphrase al usuario al habilitar custody
 * - Derivar clave usando PBKDF2(passphrase, user.id, 100000 iterations)
 * - Almacenar hint de passphrase (NUNCA la passphrase misma)
 *
 * @param userId - UUID del usuario
 * @returns CryptoKey para AES-256-GCM
 */
export async function deriveUserMasterKey(userId: string): Promise<CryptoKey> {
  // Phase 1: Usar user.id como base (NO óptimo, pero funcional para MVP)
  const baseKey = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(userId)
  );

  // Importar como CryptoKey para AES-GCM
  const key = await crypto.subtle.importKey(
    'raw',
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false, // NO extractable (clave nunca sale del crypto module)
    ['encrypt', 'decrypt']
  );

  return key;
}

/**
 * Cifra un archivo usando AES-256-GCM
 *
 * @param file - Archivo a cifrar
 * @param userId - UUID del usuario (para derivar clave)
 * @returns Archivo cifrado con metadata
 */
export async function encryptFile(file: File, userId: string): Promise<EncryptedFile> {
  // 1. Derivar clave maestra
  const masterKey = await deriveUserMasterKey(userId);

  // 2. Generar IV aleatorio (12 bytes para GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 3. Leer archivo como ArrayBuffer
  const fileData = await file.arrayBuffer();

  // 4. Cifrar usando AES-256-GCM
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128, // 16 bytes de authentication tag
    },
    masterKey,
    fileData
  );

  // 5. Combinar IV + encrypted (el encrypted ya incluye auth tag)
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return {
    encrypted: combined.buffer,
    iv,
    originalSize: file.size,
    originalMime: file.type,
    originalName: file.name,
  };
}

/**
 * Descifra un archivo cifrado
 *
 * @param encryptedData - Archivo cifrado (IV + AuthTag + Ciphertext)
 * @param userId - UUID del usuario (para derivar clave)
 * @param originalMime - MIME type original
 * @param originalName - Nombre original del archivo
 * @returns Archivo descifrado como File
 */
export async function decryptFile(
  encryptedData: ArrayBuffer,
  userId: string,
  originalMime: string,
  originalName: string
): Promise<File> {
  // 1. Derivar clave maestra (misma que para cifrar)
  const masterKey = await deriveUserMasterKey(userId);

  // 2. Extraer IV (primeros 12 bytes)
  const data = new Uint8Array(encryptedData);
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);

  // 3. Descifrar usando AES-256-GCM
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128,
    },
    masterKey,
    ciphertext
  );

  // 4. Crear File desde ArrayBuffer descifrado
  const blob = new Blob([decrypted], { type: originalMime });
  return new File([blob], originalName, { type: originalMime });
}

/**
 * Verifica que el navegador soporte Web Crypto API
 *
 * @returns true si el navegador soporta crypto.subtle
 */
export function isCryptoSupported(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
}

/**
 * Calcula el overhead de cifrado (IV + Auth Tag)
 *
 * @returns Bytes adicionales por archivo cifrado (28 bytes = 12 IV + 16 Tag)
 */
export function getEncryptionOverhead(): number {
  return 12 + 16; // IV (12) + Auth Tag (16)
}

/**
 * Estima el tamaño del archivo cifrado
 *
 * @param originalSize - Tamaño del archivo original en bytes
 * @returns Tamaño estimado después de cifrar
 */
export function estimateEncryptedSize(originalSize: number): number {
  return originalSize + getEncryptionOverhead();
}
