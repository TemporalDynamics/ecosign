// client/src/lib/verificationService.js
// Servicio de verificación REAL que conecta con Edge Functions de Supabase
// NO utiliza mocks ni datos simulados

import { getSupabase } from './supabaseClient';
import { verifyEcoV2, type VerificationResult } from './eco/v2';

type VerificationBaseResult = {
  valid: boolean;
  fileName?: string;
  originalFileName?: string | null;
  hash?: string;
  originalHash?: string | null;
  timestamp?: string;
  timestampType?: string;
  anchorChain?: string;
  signature?: { algorithm?: string; valid?: boolean };
  signedAuthority?: 'internal' | 'external';
  signedAuthorityRef?: Record<string, unknown> | null;
  documentIntegrity?: boolean;
  signatureValid?: boolean;
  timestampValid?: boolean;
  originalFileMatches?: boolean | null;
  legalTimestamp?: Record<string, unknown> | { enabled?: boolean };
  anchors?: unknown; // Derived from eco.v2 events
  manifest?: unknown;
  errors?: string[];
  warnings?: string[];
  error?: string;
  originalFileProvided?: boolean | null;
};

type OnlineRevocationState = {
  checked: boolean;
  endpoint?: string;
  revoked?: boolean;
  keyId?: string;
  updatedAt?: string;
  error?: string;
};

const getViteEnv = (name: string): string => {
  try {
    const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
    return (env?.[name] ?? '').trim();
  } catch {
    return '';
  }
};

const shouldCheckOnlineRevocation = (): boolean => {
  const raw = getViteEnv('VITE_ECOSIGN_ONLINE_REVOCATION_CHECK').toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
};

const getRevocationEndpointFromEco = (eco: unknown, result: VerificationResult): string => {
  if (result.institutional_signature?.revocation_endpoint) {
    return result.institutional_signature.revocation_endpoint;
  }
  if (!eco || typeof eco !== 'object') return '';
  const policy = (eco as Record<string, unknown>)['ecosign_signature_policy'];
  if (!policy || typeof policy !== 'object') return '';
  const endpoint = (policy as Record<string, unknown>)['revocation_endpoint'];
  return typeof endpoint === 'string' ? endpoint.trim() : '';
};

const checkOnlineRevocationStatus = async (
  eco: unknown,
  result: VerificationResult,
): Promise<OnlineRevocationState> => {
  const keyId = result.institutional_signature?.public_key_id;
  if (!keyId || !result.institutional_signature?.present) return { checked: false };
  if (!shouldCheckOnlineRevocation()) return { checked: false };

  const endpoint = getRevocationEndpointFromEco(eco, result) || getViteEnv('VITE_ECOSIGN_REVOCATION_ENDPOINT');
  if (!endpoint) return { checked: false };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(endpoint, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) {
      return { checked: true, endpoint, keyId, error: `http_${response.status}` };
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const revokedKeys = Array.isArray(payload['revoked_keys'])
      ? (payload['revoked_keys'] as unknown[]).filter((k): k is string => typeof k === 'string')
      : [];
    const keys = (typeof payload['keys'] === 'object' && payload['keys'])
      ? (payload['keys'] as Record<string, unknown>)
      : {};
    const keyEntry = (typeof keys[keyId] === 'object' && keys[keyId])
      ? (keys[keyId] as Record<string, unknown>)
      : null;
    const status = typeof keyEntry?.['status'] === 'string' ? keyEntry['status'].toLowerCase() : '';
    const revoked = revokedKeys.includes(keyId) || status === 'revoked';
    const updatedAt = typeof payload['updated_at'] === 'string' ? payload['updated_at'] : undefined;
    return { checked: true, endpoint, keyId, revoked, updatedAt };
  } catch (error) {
    return {
      checked: true,
      endpoint,
      keyId,
      error: error instanceof Error ? error.name : 'fetch_error',
    };
  } finally {
    clearTimeout(timeout);
  }
};

const parseEcoJson = async (file: File): Promise<unknown | null> => {
  try {
    const text = await file.text();
    return JSON.parse(text);
  } catch (error) {
    console.warn('Unable to parse .eco JSON locally', error);
    return null;
  }
};

const mapEcoV2Result = (
  result: VerificationResult,
  fileName: string,
  signedAuthority?: 'internal' | 'external',
  signedAuthorityRef?: Record<string, unknown> | null,
  onlineRevocation?: OnlineRevocationState
): VerificationBaseResult => {
  const valid = result.status === 'valid' || result.status === 'incomplete';
  const errors =
    result.status === 'tampered'
      ? ['Archivo .ECO inconsistente.']
      : result.status === 'unknown'
      ? ['Formato .ECO inválido o versión no soportada.']
      : [];
  const warnings =
    result.status === 'incomplete'
      ? ['Evidencia incompleta: faltan testigos o firmas.']
      : [];
  if (result.authoritative === false) {
    warnings.push('Verificación criptográfica: OK (hash consistente).');
    warnings.push('Certificado oficial: NO. Es una vista/proyección no autoritativa.');
    warnings.push('Para certificado oficial, descarga el ECO emitido por backend (artifact.finalized.eco_storage_path).');
  }
  if (result.institutional_signature?.present) {
    if (result.institutional_signature.valid === true) {
      if (result.institutional_signature.trusted) {
        warnings.push(
          `Firma institucional válida (key_id=${result.institutional_signature.public_key_id ?? 'unknown'}).`
        );
      } else {
        warnings.push(
          'Firma institucional criptográficamente válida, pero sin trust store configurado en este verificador.'
        );
      }
    } else {
      const reason = result.institutional_signature.reason ?? 'unknown';
      if (reason === 'institutional_signature_key_not_trusted') {
        warnings.push(
          `Firma institucional no confiable: key_id=${result.institutional_signature.public_key_id ?? 'unknown'} no está en claves confiables.`
        );
      } else if (reason === 'institutional_signature_key_revoked') {
        warnings.push(
          `Firma institucional revocada: key_id=${result.institutional_signature.public_key_id ?? 'unknown'}.`
        );
      } else {
        errors.push(`Firma institucional inválida (${reason}).`);
      }
    }
  }

  let finalValid = valid;
  let finalSignatureValid = !!result.signed_hash;
  if (onlineRevocation?.checked) {
    if (onlineRevocation.error) {
      warnings.push(
        `Chequeo online de revocación no disponible (${onlineRevocation.error}). Verificación offline conservada.`
      );
    } else if (onlineRevocation.revoked) {
      errors.push(
        `Clave institucional revocada en endpoint público (key_id=${onlineRevocation.keyId ?? 'unknown'}).`
      );
      finalValid = false;
      finalSignatureValid = false;
    } else {
      warnings.push(
        `Chequeo online de revocación OK (key_id=${onlineRevocation.keyId ?? 'unknown'}; updated_at=${onlineRevocation.updatedAt ?? 'unknown'}).`
      );
    }
  }

  return {
    valid: finalValid,
    fileName,
    hash: result.source_hash,
    timestamp: result.timestamps?.created_at,
    timestampType: 'Local',
    anchorChain: result.anchors ? 'local' : undefined,
    signature: {
      algorithm: 'hash-chain',
      valid: !!result.signed_hash
    },
    signedAuthority,
    signedAuthorityRef,
    documentIntegrity: valid,
    signatureValid: finalSignatureValid,
    timestampValid: true,
    legalTimestamp: { enabled: false },
    anchors: result.anchors,
    errors,
    warnings
  };
};

/**
 * Verifica un archivo .ECO usando la Edge Function real
 * @param {File} file - Archivo .ECO a verificar
 * @returns {Promise<Object>} Resultado de verificación con datos reales
 */
export async function verifyEcoFile(file: File): Promise<VerificationBaseResult> {
  const supabase = getSupabase();
  // Validar que sea un archivo .ECO
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.eco')) {
    return {
      valid: false,
      error: 'Formato de archivo no válido. Solo se aceptan archivos .ECO',
      errors: ['Formato de archivo no válido'],
      warnings: []
    };
  }

  try {
    const parsed = await parseEcoJson(file);
    if (parsed && typeof parsed === 'object' && (parsed as { version?: string }).version === 'eco.v2') {
      const signedAuthority = (parsed as { signed?: { authority?: 'internal' | 'external' } }).signed?.authority;
      const signedAuthorityRef = (parsed as { signed?: { authority_ref?: Record<string, unknown> } }).signed?.authority_ref ?? null;
      const result = verifyEcoV2(parsed);
      const onlineRevocation = await checkOnlineRevocationStatus(parsed, result);
      return mapEcoV2Result(result, file.name, signedAuthority, signedAuthorityRef, onlineRevocation);
    }

    // Crear FormData para enviar el archivo
    const formData = new FormData();
    formData.append('ecox', file);

    // Llamar a la Edge Function real
    const { data, error } = await supabase.functions.invoke('verify-ecox', {
      body: formData
    });

    if (error) {
      throw new Error(error.message || 'Error al verificar el archivo');
    }

    if (!data) {
      throw new Error('La verificación no devolvió datos');
    }

    // Transformar respuesta a formato compatible con UI existente
    return {
      valid: data.valid,
      fileName: data.fileName || file.name,
      hash: data.hash,
      timestamp: data.timestamp,
      timestampType: data.timestampType || 'Local',
      anchorChain: data.legalTimestamp?.enabled ? 'legal' : 'local',
      signature: {
        algorithm: data.signature?.algorithm || 'Ed25519',
        valid: data.signature?.valid || false
      },
      documentIntegrity: data.valid,
      signatureValid: data.signature?.valid || false,
      timestampValid: true,
      legalTimestamp: data.legalTimestamp || { enabled: false },
      manifest: data.manifest || null,
      errors: data.errors || [],
      warnings: data.warnings || []
    };
  } catch (error) {
    console.error('Error de verificación:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      errors: [error instanceof Error ? error.message : 'Error desconocido'],
      warnings: []
    };
  }
}

/**
 * Verifica un archivo .ECO contra el documento original
 * @param {File} ecoFile - Archivo .ECO
 * @param {File} originalFile - Documento original para comparar huella digital
 * @returns {Promise<Object>} Resultado de verificación completa
 */
export async function verifyEcoWithOriginal(ecoFile: File, originalFile?: File | null): Promise<VerificationBaseResult> {
  const supabase = getSupabase();
  if (!ecoFile) {
    return {
      valid: false,
      error: 'Archivo .ECO es requerido',
      errors: ['Archivo .ECO es requerido'],
      warnings: []
    };
  }

  // Validar extensión
  const fileName = ecoFile.name.toLowerCase();
  if (!fileName.endsWith('.eco')) {
    return {
      valid: false,
      error: 'Formato de archivo no válido. Solo se aceptan archivos .ECO',
      errors: ['Formato de archivo no válido'],
      warnings: []
    };
  }

  try {
    const parsed = await parseEcoJson(ecoFile);
    if (parsed && typeof parsed === 'object' && (parsed as { version?: string }).version === 'eco.v2') {
      const signedAuthority = (parsed as { signed?: { authority?: 'internal' | 'external' } }).signed?.authority;
      const signedAuthorityRef = (parsed as { signed?: { authority_ref?: Record<string, unknown> } }).signed?.authority_ref ?? null;
      const result = verifyEcoV2(parsed);
      const onlineRevocation = await checkOnlineRevocationStatus(parsed, result);
      return {
        ...mapEcoV2Result(result, ecoFile.name, signedAuthority, signedAuthorityRef, onlineRevocation),
        originalFileProvided: !!originalFile,
        originalFileName: originalFile?.name || null
      };
    }

    // Crear FormData con ambos archivos
    const formData = new FormData();
    formData.append('ecox', ecoFile);
    if (originalFile) {
      formData.append('original', originalFile);
    }

    // Llamar a la Edge Function real
    const { data, error } = await supabase.functions.invoke('verify-ecox', {
      body: formData
    });

    if (error) {
      throw new Error(error.message || 'Error al verificar el archivo');
    }

    if (!data) {
      throw new Error('La verificación no devolvió datos');
    }

    // Transformar respuesta
    return {
      valid: data.valid,
      fileName: data.fileName || ecoFile.name,
      originalFileName: originalFile?.name || null,
      hash: data.hash,
      originalHash: data.originalHash || null,
      timestamp: data.timestamp,
      timestampType: data.timestampType || 'Local',
      anchorChain: data.legalTimestamp?.enabled ? 'legal' : 'local',
      signature: {
        algorithm: data.signature?.algorithm || 'Ed25519',
        valid: data.signature?.valid || false
      },
      documentIntegrity: data.valid,
      signatureValid: data.signature?.valid || false,
      timestampValid: true,
      originalFileMatches: data.originalFileMatches || false,
      legalTimestamp: data.legalTimestamp || { enabled: false },
      manifest: data.manifest || null,
      errors: data.errors || [],
      warnings: data.warnings || []
    };
  } catch (error) {
    console.error('Error de verificación completa:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      errors: [error instanceof Error ? error.message : 'Error desconocido'],
      warnings: []
    };
  }
}

/**
 * Función principal de verificación que combina ambos modos
 * @param {File} ecoFile - Archivo .ECO
 * @param {File|null} originalFile - Documento original (opcional)
 * @returns {Promise<Object>} Resultado de verificación
 */
export async function verifyEcoFileComplete(ecoFile: File, originalFile: File | null = null): Promise<VerificationBaseResult> {
  if (!ecoFile) {
    throw new Error('Archivo .ECO es requerido');
  }

  // Si se proporciona el archivo original, hacer verificación completa
  if (originalFile) {
    return await verifyEcoWithOriginal(ecoFile, originalFile);
  }

  // Solo verificación del certificado
  const result = await verifyEcoFile(ecoFile);
  return {
    ...result,
    originalFileProvided: false,
    originalFileMatches: null // No se puede verificar sin archivo original
  };
}

// Mantener compatibilidad con imports existentes
export const verifyEcoxFile = verifyEcoFileComplete;
