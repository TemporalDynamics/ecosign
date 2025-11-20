// client/src/lib/verificationService.js
// Servicio de verificación REAL que conecta con Edge Functions de Supabase
// NO utiliza mocks ni datos simulados

import { supabase } from './supabaseClient';

/**
 * Verifica un archivo .ECO usando la Edge Function real
 * @param {File} file - Archivo .ECO a verificar
 * @returns {Promise<Object>} Resultado de verificación con datos reales
 */
export async function verifyEcoFile(file) {
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
      error: error.message,
      errors: [error.message],
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
export async function verifyEcoWithOriginal(ecoFile, originalFile) {
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
      error: error.message,
      errors: [error.message],
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
export async function verifyEcoFileComplete(ecoFile, originalFile = null) {
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
