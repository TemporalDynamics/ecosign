/**
 * NDA Events Library
 * 
 * Funciones para generar eventos probatorios de aceptación de NDA
 * según R4, R5, R6 del contrato NDA canónico.
 * 
 * Principios:
 * - NDA acceptance es un evento probatorio (con hash + timestamp + IP)
 * - Orden inmutable: NDA → OTP → Acceso → Firma
 * - No se cifra el NDA (visible antes de OTP)
 * - Cada aceptación genera un evento único e inmutable
 */

import { getSupabase } from './supabaseClient';

/**
 * Contexto donde se acepta el NDA
 */
export type NdaContext = 'share-link' | 'signature-flow' | 'internal-review';

/**
 * Metadata de la aceptación del NDA
 */
export interface NdaAcceptanceMetadata {
  token?: string;              // Para share-link legacy
  signerId?: string;            // Para signature-flow
  accessToken?: string;         // Token del firmante para validar aceptación
  context: NdaContext;
  ndaText: string;
  signerName: string;
  signerEmail: string;
  browserFingerprint?: string;
  linkId?: string;              // Para asociar a un link específico (document_shares)
}

/**
 * Resultado de la aceptación
 */
export interface NdaAcceptanceResult {
  success: boolean;
  acceptanceId?: string;
  ndaHash?: string;
  acceptedAt?: string;
  alreadyAccepted?: boolean;
  error?: string;
}

/**
 * Genera un hash SHA-256 del contenido del NDA + metadata
 * Este hash es la evidencia probatoria de QUÉ se aceptó
 */
async function generateNdaHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Acepta un NDA en el contexto de un link compartido
 * 
 * R4: Genera evento probatorio con hash + timestamp + IP
 * R5: Valida que es previo a acceso
 * 
 * @param metadata - Metadata de la aceptación
 * @returns Resultado de la aceptación
 */
export async function acceptShareLinkNda(
  metadata: NdaAcceptanceMetadata
): Promise<NdaAcceptanceResult> {
  // Determinar qué Edge Function usar según si hay linkId (document_shares)
  const useNewShareFlow = Boolean(metadata.linkId);
  const supabase = getSupabase();

  try {
    if (useNewShareFlow) {
      // Flujo nuevo: document_shares (E2E)
      const { data, error } = await supabase.functions.invoke('accept-share-nda', {
        body: {
          share_id: metadata.linkId,
          signer_email: metadata.signerEmail,
          signer_name: metadata.signerName,
          browser_fingerprint: metadata.browserFingerprint,
        },
      });

      if (error) {
        console.error('Error accepting share-link NDA (new flow):', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        acceptanceId: data.acceptance_id,
        ndaHash: data.nda_hash,
        acceptedAt: data.accepted_at,
        alreadyAccepted: data.already_accepted || false,
      };
    } else {
      // Flujo legacy: links + recipients via token
      if (!metadata.token) {
        return { success: false, error: 'token es requerido para flujo legacy' };
      }

      const { data, error } = await supabase.functions.invoke('accept-nda', {
        body: {
          token: metadata.token,
          signer_name: metadata.signerName,
          signer_email: metadata.signerEmail,
          browser_fingerprint: metadata.browserFingerprint,
        },
      });

      if (error) {
        console.error('Error accepting share-link NDA (old flow):', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        acceptanceId: data.acceptance_id,
        ndaHash: data.nda_hash,
        acceptedAt: data.accepted_at,
        alreadyAccepted: data.already_accepted || false,
      };
    }
  } catch (err) {
    console.error('Exception accepting share-link NDA:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Acepta un NDA en el contexto de un flujo de firmas
 * 
 * R5: NDA es previo a firma
 * R6: Cada firmante debe aceptar individualmente
 * 
 * @param metadata - Metadata de la aceptación
 * @returns Resultado de la aceptación
 */
export async function acceptSignatureFlowNda(
  metadata: NdaAcceptanceMetadata
): Promise<NdaAcceptanceResult> {
  if (!metadata.signerId) {
    return { success: false, error: 'signerId es requerido para signature-flow' };
  }
  if (!metadata.accessToken) {
    return { success: false, error: 'accessToken es requerido para signature-flow' };
  }

  const supabase = getSupabase();

  try {
    // Llamar a la Edge Function existente
    const { data, error } = await supabase.functions.invoke('accept-workflow-nda', {
      body: {
        signer_id: metadata.signerId,
        signer_email: metadata.signerEmail,
        access_token: metadata.accessToken,
      },
    });

    if (error) {
      console.error('Error accepting signature-flow NDA:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      alreadyAccepted: data.alreadyAccepted || false,
    };
  } catch (err) {
    console.error('Exception accepting signature-flow NDA:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Función unificada para aceptar NDA según contexto
 * 
 * Determina automáticamente qué flujo usar según metadata
 * 
 * @param metadata - Metadata de la aceptación
 * @returns Resultado de la aceptación
 */
export async function acceptNda(
  metadata: NdaAcceptanceMetadata
): Promise<NdaAcceptanceResult> {
  switch (metadata.context) {
    case 'share-link':
      return acceptShareLinkNda(metadata);
    
    case 'signature-flow':
      return acceptSignatureFlowNda(metadata);
    
    case 'internal-review':
      // TODO: Implementar cuando sea necesario
      return { success: false, error: 'internal-review no implementado aún' };
    
    default:
      return { success: false, error: `Contexto desconocido: ${metadata.context}` };
  }
}

/**
 * Valida si un receptor/firmante ya aceptó el NDA
 * 
 * @param context - Contexto de la validación
 * @param id - recipient_id interno o signerId según contexto
 * @returns true si ya aceptó, false si no
 */
export async function hasAcceptedNda(
  context: NdaContext,
  id: string
): Promise<boolean> {
  try {
    const supabase = getSupabase();
    
    if (context === 'share-link') {
      const { data, error } = await supabase
        .from('nda_acceptances')
        .select('id')
        .eq('recipient_id', id)
        .single();
      
      return !error && !!data;
    }
    
    if (context === 'signature-flow') {
      const { data, error } = await supabase
        .from('workflow_signers')
        .select('nda_accepted')
        .eq('id', id)
        .single();
      
      return !error && data?.nda_accepted === true;
    }
    
    return false;
  } catch (err) {
    console.error('Error checking NDA acceptance:', err);
    return false;
  }
}

/**
 * Genera el contenido canónico para el hash del NDA
 * (usado internamente por el backend, pero útil para debug)
 */
export function generateNdaContent(metadata: NdaAcceptanceMetadata): string {
  return JSON.stringify({
    signer_name: metadata.signerName,
    signer_email: metadata.signerEmail,
    nda_text: metadata.ndaText,
    context: metadata.context,
    timestamp: new Date().toISOString(),
  });
}
