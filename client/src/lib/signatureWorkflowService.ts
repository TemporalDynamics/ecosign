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
type WorkflowSigner = {
  email: string;
  name?: string;
  signingOrder: number;
  requireLogin?: boolean;
  requireNda?: boolean;
  quickAccess?: boolean;
};

type ForensicConfig = {
  rfc3161?: boolean;
  polygon?: boolean;
  bitcoin?: boolean;
};

type StartWorkflowParams = {
  documentUrl: string;
  documentHash: string;
  originalFilename: string;
  documentEntityId?: string;
  signatureType?: 'ECOSIGN' | 'SIGNNOW';
  deliveryMode?: 'email' | 'link';
  ndaText?: string | null;
  ndaEnabled?: boolean;
  signers: WorkflowSigner[];
  forensicConfig?: ForensicConfig;
};

export async function startSignatureWorkflow(params: StartWorkflowParams) {
  const {
    documentUrl,
    documentHash,
    originalFilename,
    documentEntityId,
    signatureType,
    deliveryMode,
    ndaText,
    ndaEnabled,
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
        documentEntityId,
        signatureType,
        deliveryMode,
        ndaText,
        ndaEnabled,
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

    // Los emails se envían automáticamente vía triggers de base de datos
    // y el cron job send-pending-emails que corre cada minuto

    return data;

  } catch (error) {
    console.error('❌ Error en startSignatureWorkflow:', error);
    throw error instanceof Error ? error : new Error('Error desconocido en startSignatureWorkflow');
  }
}

/**
 * ZK Mode - Genera wrapped keys para firmantes
 * 
 * Esta función debe llamarse cuando el owner tiene acceso al documentKey
 * para generar los materiales criptográficos para cada firmante.
 * 
 * El flujo es:
 * 1. Owner tiene documentKey (del documento cifrado)
 * 2. Para cada signer:
 *    - Generar recipient_salt
 *    - Generar OTP
 *    - Derivar KEK desde OTP
 *    - Envolver documentKey con KEK
 * 3. Enviar wrapped_key + wrap_iv + recipient_salt al servidor
 * 
 * NOTA: Esta función requiere integración adicional con el documentKey
 * del documento. Por ahora, el sistema usa modo legacy.
 */
export async function generateSignerZkMaterials(
  documentKey: CryptoKey,
  signers: WorkflowSigner[]
): Promise<Array<{
  email: string;
  wrappedKey?: string;
  wrapIv?: string;
  recipientSalt?: string;
  otp?: string;
}>> {
  console.warn('[ZK] generateSignerZkMaterials called but requires documentKey integration');
  
  // TODO: Implementar cuando se tenga acceso al documentKey
  // const { generateOTP, deriveKeyFromOTP, wrapDocumentKey, randomBytes } = await import('./e2e');
  // 
  // return signers.map(signer => {
  //   const recipientSalt = randomBytes(16);
  //   const otp = generateOTP();
  //   const recipientKey = deriveKeyFromOTP(otp, recipientSalt);
  //   const { wrappedKey, wrapIv } = wrapDocumentKey(documentKey, recipientKey);
  //   
  //   return {
  //     email: signer.email,
  //     wrappedKey,
  //     wrapIv,
  //     recipientSalt: Array.from(recipientSalt),
  //     otp
  //   };
  // });
  
  return [];
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
