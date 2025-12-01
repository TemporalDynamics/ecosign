import { getSupabase } from './supabaseClient';

/**
 * Inicia un flujo de firmas en cascada con múltiples firmantes
 * @param {Object} params - Parámetros del workflow
 * @param {string} params.documentUrl - URL del documento en Supabase Storage
 * @param {string} params.documentHash - Hash SHA-256 del documento
 * @param {string} params.originalFilename - Nombre del archivo original
 * @param {Array} params.signers - Lista de firmantes ordenados
 * @param {Object} params.forensicConfig - Configuración de blindaje forense
 * @returns {Promise<Object>} - Resultado del workflow creado
 */
export async function startSignatureWorkflow(params) {
  const {
    documentUrl,
    documentHash,
    originalFilename,
    signers,
    forensicConfig = {
      rfc3161: true,
      polygon: true,
      bitcoin: false
    }
  } = params;

  // Validaciones
  if (!documentUrl || !documentHash || !originalFilename) {
    throw new Error('Faltan campos requeridos: documentUrl, documentHash, originalFilename');
  }

  if (!signers || signers.length === 0) {
    throw new Error('Se requiere al menos un firmante');
  }

  // Validar estructura de firmantes
  signers.forEach((signer, index) => {
    if (!signer.email) {
      throw new Error(`Firmante ${index + 1} no tiene email`);
    }
    if (!signer.signingOrder) {
      throw new Error(`Firmante ${index + 1} no tiene orden de firma`);
    }
  });

  try {
    const supabase = getSupabase();
    // Obtener token de sesión
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('No hay sesión activa');
    }

    // Llamar a la Edge Function
    const { data, error } = await supabase.functions.invoke('start-signature-workflow', {
      body: {
        documentUrl,
        documentHash,
        originalFilename,
        signers,
        forensicConfig
      }
    });

    if (error) {
      console.error('Error en start-signature-workflow:', error);
      console.error('Error completo:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('Respuesta de start-signature-workflow:', data);

    if (!data.success) {
      console.error('Workflow falló:', data);
      throw new Error(data.error || 'Error desconocido al iniciar workflow');
    }

    console.log('✅ Workflow iniciado:', data);

    // Después de crear el workflow, enviar los emails pendientes
    try {
      await supabase.functions.invoke('send-pending-emails');
      console.log('✅ Emails enviados');
    } catch (emailError) {
      console.warn('⚠️  Error enviando emails (el workflow se creó correctamente):', emailError);
      // No lanzar error aquí, el workflow se creó exitosamente
    }

    return data;

  } catch (error) {
    console.error('❌ Error en startSignatureWorkflow:', error);
    throw error;
  }
}

/**
 * Ejemplo de uso:
 * 
 * const result = await startSignatureWorkflow({
 *   documentUrl: 'https://....storage.supabase.co/...',
 *   documentHash: 'abc123...',
 *   originalFilename: 'contrato.pdf',
 *   signers: [
 *     {
 *       email: 'juan@empresa.com',
 *       name: 'Juan Pérez',
 *       signingOrder: 1,
 *       requireLogin: true,   // Default: true
 *       requireNda: true,     // Default: true
 *       quickAccess: false    // Default: false (si es true, desactiva login y NDA)
 *     },
 *     {
 *       email: 'maria@empresa.com',
 *       name: 'María González',
 *       signingOrder: 2
 *     }
 *   ],
 *   forensicConfig: {
 *     rfc3161: true,    // Timestamp legal
 *     polygon: true,    // Blockchain Polygon
 *     bitcoin: false    // Bitcoin (más lento y caro)
 *   }
 * });
 * 
 * console.log('Workflow ID:', result.workflowId);
 * console.log('URL para primer firmante:', result.firstSignerUrl);
 */