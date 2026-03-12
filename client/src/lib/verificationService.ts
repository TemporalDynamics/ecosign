// client/src/lib/verificationService.js
// Servicio de verificación REAL que conecta con Edge Functions de Supabase
// NO utiliza mocks ni datos simulados

import { getSupabase } from './supabaseClient';
import { verifyEcoV2, type VerificationResult } from './eco/v2';
import { hashSource } from './canonicalHashing';

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
  originalFileMismatchReason?: 'signed_version' | 'other_witness' | 'source_version' | 'unknown';
  legalTimestamp?: Record<string, unknown> | { enabled?: boolean };
  anchors?: unknown; // Derived from eco.v2 events
  epi?: {
    level: 1 | 2;
    status: 'valid' | 'tampered' | 'unknown';
    root_hash?: string;
    computed_root_hash?: string;
    algorithm?: string;
  };
  manifest?: unknown;
  eco?: unknown;
  errors?: string[];
  warnings?: string[];
  error?: string;
  originalFileProvided?: boolean | null;
};

const extractWitnessHashesFromEco = (eco: unknown): string[] => {
  if (!eco || typeof eco !== 'object') return [];
  const raw = eco as Record<string, unknown>;
  const candidates: string[] = [];

  const maybePush = (value: unknown) => {
    if (typeof value === 'string' && value.length > 0) {
      candidates.push(value);
    }
  };

  const scanEvents = (events: unknown) => {
    if (!Array.isArray(events)) return;
    events.forEach((event) => {
      if (!event || typeof event !== 'object') return;
      const e = event as Record<string, unknown>;
      maybePush(e['witness_hash']);
      const payload = e['payload'];
      if (payload && typeof payload === 'object') {
        maybePush((payload as Record<string, unknown>)['witness_hash']);
      }
      const evidence = e['evidence'];
      if (evidence && typeof evidence === 'object') {
        maybePush((evidence as Record<string, unknown>)['witness_pdf_hash']);
        maybePush((evidence as Record<string, unknown>)['witness_hash']);
      }
    });
  };

  scanEvents(raw['events']);
  if (raw['document'] && typeof raw['document'] === 'object') {
    scanEvents((raw['document'] as Record<string, unknown>)['events']);
  }

  const doc = raw['document'];
  if (doc && typeof doc === 'object') {
    maybePush((doc as Record<string, unknown>)['witness_hash']);
    maybePush((doc as Record<string, unknown>)['source_hash']);
  }

  return Array.from(new Set(candidates));
};

const enforceOriginalFileMatch = async (
  base: VerificationBaseResult,
  result: VerificationResult,
  originalFile?: File | null,
  parsedEco?: unknown
): Promise<VerificationBaseResult> => {
  if (!originalFile) {
    return {
      ...base,
      originalFileProvided: false,
      originalFileName: null,
      originalFileMatches: null,
      originalHash: null
    };
  }

  const originalHash = await hashSource(originalFile);
  const expectedHash = result.witness_hash || result.source_hash;
  const originalFileMatches = !!expectedHash && originalHash === expectedHash;

  const errors = [...(base.errors ?? [])];
  const warnings = [...(base.warnings ?? [])];

  let mismatchReason: VerificationBaseResult['originalFileMismatchReason'] = undefined;

  if (!expectedHash) {
    warnings.push('No hay hash esperado en el ECO para comparar contra el archivo subido.');
  } else if (!originalFileMatches) {
    if (result.signed_hash && originalHash === result.signed_hash) {
      mismatchReason = 'signed_version';
        errors.push(
          'El PDF subido corresponde a una versión posterior del flujo (con firmas adicionales). Este ECO valida una etapa anterior del mismo proceso.'
        );
    } else if (result.source_hash && originalHash === result.source_hash) {
      mismatchReason = 'source_version';
        errors.push(
          'El PDF subido es el original sin transformaciones. Este ECO valida la etapa del PDF testigo generado por el flujo.'
        );
    } else {
      const witnessHashes = extractWitnessHashesFromEco(parsedEco);
      if (witnessHashes.includes(originalHash)) {
        mismatchReason = 'other_witness';
        errors.push(
          'El PDF subido coincide con otra etapa del proceso. Este ECO valida una etapa específica del flujo.'
        );
      } else {
        mismatchReason = 'unknown';
        errors.push(
          'El PDF subido no coincide con la etapa registrada en este ECO.'
        );
      }
    }
  }

  return {
    ...base,
    valid: base.valid && originalFileMatches,
    documentIntegrity: (base.documentIntegrity ?? base.valid) && originalFileMatches,
    originalFileProvided: true,
    originalFileName: originalFile.name,
    originalHash,
    originalFileMatches,
    originalFileMismatchReason: mismatchReason,
    errors,
    warnings
  };
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
  onlineRevocation?: OnlineRevocationState,
  parsedEco?: unknown,
): VerificationBaseResult => {
  const valid = result.status === 'valid';
  const errors: string[] = [];
  const warnings: string[] = [];

  // --- Narrative layer (user-facing) ---
  if (result.status === 'tampered') {
    errors.push('No pudimos confirmar la integridad de esta evidencia. El archivo .ECO podría haber sido modificado, estar incompleto o no corresponder a un certificado válido de EcoSign.');
  } else if (result.status === 'unknown') {
    errors.push('No pudimos reconocer este archivo como un certificado EcoSign válido. Verificá que sea un archivo .ECO emitido por EcoSign.');
  }

  if (result.status === 'incomplete') {
    warnings.push('Este certificado tiene evidencia parcial. El proceso de protección puede no haber finalizado.');
  }
  if (result.authoritative === false) {
    warnings.push('Este certificado es una vista previa, no el certificado oficial emitido por EcoSign.');
  }

  // Institutional signature: narrative first, technical detail in parentheses
  if (result.institutional_signature?.present) {
    if (result.institutional_signature.valid === true) {
      if (result.institutional_signature.trusted) {
        warnings.push('El certificado fue emitido y firmado por EcoSign. La firma institucional es válida.');
      } else {
        warnings.push('La firma institucional es criptográficamente correcta, pero este verificador no tiene configuradas las claves de confianza para confirmarla.');
      }
    } else {
      const reason = result.institutional_signature.reason ?? 'unknown';
      if (reason === 'institutional_signature_key_not_trusted') {
        warnings.push('La firma institucional no pudo ser confirmada porque la clave utilizada no está registrada como confiable en este verificador.');
      } else if (reason === 'institutional_signature_key_revoked') {
        errors.push('La firma institucional fue emitida con una clave que ha sido revocada. Este certificado ya no es confiable.');
      } else {
        errors.push(`La firma institucional del certificado no es válida (${reason}).`);
      }
    }
  }

  if (result.hash_chain_mismatch) {
    errors.push('La cadena de integridad interna del certificado es inconsistente. El documento o su evidencia fueron alterados.');
  }

  if (result.epi?.level === 1) {
    warnings.push('Nivel probatorio: EPI 1 (evidencia básica sin hash de estado del canvas).');
  }

  let finalValid = valid;
  let finalSignatureValid = !!result.signed_hash;
  if (onlineRevocation?.checked) {
    if (onlineRevocation.error) {
      warnings.push('No se pudo verificar el estado de revocación en línea. La verificación offline se conserva.');
    } else if (onlineRevocation.revoked) {
      errors.push('La clave institucional fue revocada públicamente. Este certificado ya no es confiable.');
      finalValid = false;
      finalSignatureValid = false;
    } else {
      warnings.push('Verificación de revocación en línea: la clave institucional está vigente.');
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
    epi: result.epi,
    eco: parsedEco ?? undefined,
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
    const isEcoV2 = parsed && typeof parsed === 'object' && (
      (parsed as { version?: string }).version === 'eco.v2' ||
      ((parsed as { format?: string }).format === 'eco' && typeof (parsed as { document?: unknown }).document === 'object')
    );
    if (isEcoV2) {
      const signedAuthority = (parsed as { signed?: { authority?: 'internal' | 'external' } }).signed?.authority;
      const signedAuthorityRef = (parsed as { signed?: { authority_ref?: Record<string, unknown> } }).signed?.authority_ref ?? null;
      const result = verifyEcoV2(parsed);
      const onlineRevocation = await checkOnlineRevocationStatus(parsed, result);
      return mapEcoV2Result(result, file.name, signedAuthority, signedAuthorityRef, onlineRevocation, parsed);
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
    const isEcoV2 = parsed && typeof parsed === 'object' && (
      (parsed as { version?: string }).version === 'eco.v2' ||
      ((parsed as { format?: string }).format === 'eco' && typeof (parsed as { document?: unknown }).document === 'object')
    );
    if (isEcoV2) {
      const signedAuthority = (parsed as { signed?: { authority?: 'internal' | 'external' } }).signed?.authority;
      const signedAuthorityRef = (parsed as { signed?: { authority_ref?: Record<string, unknown> } }).signed?.authority_ref ?? null;
      const result = verifyEcoV2(parsed);
      const onlineRevocation = await checkOnlineRevocationStatus(parsed, result);
      const mapped = mapEcoV2Result(result, ecoFile.name, signedAuthority, signedAuthorityRef, onlineRevocation, parsed);
      return await enforceOriginalFileMatch(mapped, result, originalFile, parsed);
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
