/**
 * SignNow Service
 * Integración con SignNow API para firmas legales con validez internacional
 * (eIDAS, ESIGN, UETA)
 *
 * Este servicio se conecta a la Edge Function /supabase/functions/signnow
 */

import { getSupabase } from './supabaseClient';

/**
 * Crea un documento firmado con SignNow (firma legal con validez internacional)
 * @param {File} file - Archivo PDF a firmar
 * @param {Object} options - Opciones de firma
 * @returns {Promise<Object>} - Resultado de SignNow con PDF firmado
 */
type Signer = {
  email: string;
  name: string;
  role?: string;
  order?: number;
};

type SignNowOptions = {
  documentName?: string;
  documentHash?: string | null;
  userId?: string | null;
  action?: string;
  signers?: Signer[];
  userEmail?: string;
  userName?: string;
  signature?: unknown;
  message?: string;
  subject?: string;
  requireNdaEmbed?: boolean;
  metadata?: Record<string, unknown>;
};

export async function signWithSignNow(file: File, options: SignNowOptions = {}) {
  try {
    const supabase = getSupabase();
    // Convertir archivo a base64
    const base64File = await fileToBase64(file);

    // Preparar payload para la Edge Function
    const payload = {
      documentFile: {
        name: file.name,
        type: file.type || 'application/pdf',
        size: file.size,
        base64: base64File
      },
      documentName: options.documentName || file.name,
      documentHash: options.documentHash || null,
      userId: options.userId || null,
      action: options.action || 'esignature', // 'esignature' o 'workflow'
      signers: options.signers || [
        {
          email: options.userEmail || 'user@example.com',
          name: options.userName || 'Usuario',
          role: 'Signer',
          order: 1
        }
      ],
      signature: options.signature || null, // { image: base64, placement: {...} }
      message: options.message || 'Por favor, revisá el documento adjunto y firmalo usando el enlace de abajo.',
      subject: options.subject || `Firma de documento: ${file.name}`,
      requireNdaEmbed: options.requireNdaEmbed || false,
      metadata: options.metadata || {}
    };

    console.log('📤 Enviando documento a SignNow...', {
      fileName: file.name,
      hasSignature: !!payload.signature,
      signerCount: payload.signers.length
    });

    // Llamar a la Edge Function
    const { data, error } = await supabase.functions.invoke('signnow', {
      body: payload
    });

    if (error) {
      throw new Error(`Error al procesar con SignNow: ${error.message}`);
    }

    console.log('✅ SignNow completado:', {
      status: data.status,
      documentId: data.signnow_document_id,
      hasPdf: !!data.signed_pdf_base64
    });

    return data;
  } catch (error) {
    console.error('Error en signWithSignNow:', error);
    throw error instanceof Error ? error : new Error('Error desconocido en signWithSignNow');
  }
}


/**
 * Helper: Convierte un File a base64
 * @param {File} file
 * @returns {Promise<string>}
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Extraer solo el contenido base64 (sin el prefijo data:...)
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('No se pudo leer el archivo como base64'));
        return;
      }
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Error leyendo el archivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Helper: Convierte base64 a File
 * @param {string} base64
 * @param {string} fileName
 * @returns {File}
 */
export function base64ToFile(base64: string, fileName: string): File {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'application/pdf' });
  return new File([blob], fileName, { type: 'application/pdf' });
}
