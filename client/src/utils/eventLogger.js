/**
 * Event Logger - ChainLog Universal
 *
 * Registra todos los eventos del sistema en la tabla `events`
 * para crear una cadena de custodia completa.
 *
 * Uso:
 *   import { logEvent } from './utils/eventLogger';
 *   await logEvent('created', documentId, { filename: 'contrato.pdf' });
 */

import { supabase } from '../lib/supabaseClient';

/**
 * Tipos de eventos válidos (sincronizado con la migración 012)
 */
export const EVENT_TYPES = {
  CREATED: 'created',           // Documento creado
  SENT: 'sent',                 // Link enviado a firmante
  OPENED: 'opened',             // Link abierto por firmante
  IDENTIFIED: 'identified',     // Firmante completó identificación
  SIGNED: 'signed',             // Firmante aplicó firma
  ANCHORED_POLYGON: 'anchored_polygon', // Anclado en Polygon
  ANCHORED_BITCOIN: 'anchored_bitcoin', // Anclado en Bitcoin
  VERIFIED: 'verified',         // Documento verificado
  DOWNLOADED: 'downloaded',     // .ECO descargado
  EXPIRED: 'expired'            // Link expirado
};

/**
 * Get Supabase Functions URL from environment
 * @returns {string}
 */
function getSupabaseFunctionsUrl() {
  const url = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || import.meta.env.VITE_SUPABASE_URL;
  if (url.includes('.supabase.co')) {
    return url.replace('.supabase.co', '.supabase.co/functions/v1');
  }
  return url.endsWith('/functions/v1') ? url : `${url}/functions/v1`;
}

/**
 * Registra un evento en la tabla events
 *
 * @param {string} eventType - Tipo de evento (usar EVENT_TYPES)
 * @param {string} documentId - UUID del documento
 * @param {Object} options - Opciones adicionales
 * @param {string} options.userId - UUID del usuario (si aplica)
 * @param {string} options.signerLinkId - UUID del signer_link (si aplica)
 * @param {string} options.actorEmail - Email del actor
 * @param {string} options.actorName - Nombre del actor
 * @param {string} options.ipAddress - IP del cliente (si ya la tenés)
 * @param {Object} options.metadata - Datos adicionales en formato JSON
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function logEvent(eventType, documentId, options = {}) {
  try {
    // Validar tipo de evento
    if (!Object.values(EVENT_TYPES).includes(eventType)) {
      throw new Error(`Tipo de evento inválido: ${eventType}`);
    }

    // Validar documentId
    if (!documentId) {
      throw new Error('documentId es obligatorio');
    }

    // Preparar payload (sin IP ni timestamp - se capturan server-side)
    const eventData = {
      eventType,
      documentId,
      userId: options.userId || null,
      signerLinkId: options.signerLinkId || null,
      actorEmail: options.actorEmail || null,
      actorName: options.actorName || null,
      metadata: options.metadata || {}
    };

    console.log(`📝 [EventLogger] Registrando evento: ${eventType}`, {
      documentId,
      actor: options.actorEmail || options.actorName || 'Unknown',
      metadata: options.metadata
    });

    // Get authentication token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No hay sesión activa');
    }

    // Call secure edge function (server-side IP capture)
    const functionsUrl = getSupabaseFunctionsUrl();
    const response = await fetch(`${functionsUrl}/log-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(eventData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ [EventLogger] Error al registrar evento:', errorData);
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}`
      };
    }

    const result = await response.json();
    console.log(`✅ [EventLogger] Evento registrado exitosamente:`, result.data);

    return {
      success: true,
      data: result.data
    };

  } catch (error) {
    console.error('❌ [EventLogger] Error inesperado:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Registra múltiples eventos en batch
 * Útil cuando querés registrar varios eventos al mismo tiempo
 *
 * @param {Array<{eventType: string, documentId: string, options?: Object}>} events
 * @returns {Promise<{success: boolean, count: number, errors?: Array}>}
 */
export async function logEventsBatch(events) {
  try {
    const results = await Promise.allSettled(
      events.map(({ eventType, documentId, options }) =>
        logEvent(eventType, documentId, options)
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const errors = results
      .filter(r => r.status === 'rejected' || !r.value?.success)
      .map(r => r.reason || r.value?.error);

    console.log(`📊 [EventLogger] Batch completado: ${successful}/${events.length} exitosos`);

    return {
      success: successful === events.length,
      count: successful,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    console.error('❌ [EventLogger] Error en batch:', error);
    return {
      success: false,
      count: 0,
      errors: [error.message]
    };
  }
}

/**
 * Obtiene todos los eventos de un documento
 * Útil para mostrar el timeline completo
 *
 * @param {string} documentId - UUID del documento
 * @returns {Promise<{success: boolean, events?: Array, error?: string}>}
 */
export async function getDocumentEvents(documentId) {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('document_id', documentId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('❌ [EventLogger] Error al obtener eventos:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      events: data || []
    };

  } catch (error) {
    console.error('❌ [EventLogger] Error inesperado:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Helpers para eventos comunes
 */
export const EventHelpers = {
  /**
   * Registra cuando un documento es creado
   */
  logDocumentCreated: (documentId, userId, metadata = {}) =>
    logEvent(EVENT_TYPES.CREATED, documentId, {
      userId,
      actorEmail: metadata.userEmail,
      actorName: metadata.userName,
      metadata: {
        filename: metadata.filename,
        fileSize: metadata.fileSize,
        fileType: metadata.fileType,
        ...metadata
      }
    }),

  /**
   * Registra cuando se envía un link de firma
   */
  logLinkSent: (documentId, signerLinkId, signerEmail, metadata = {}) =>
    logEvent(EVENT_TYPES.SENT, documentId, {
      signerLinkId,
      actorEmail: signerEmail,
      metadata: {
        linkToken: metadata.linkToken,
        expiresAt: metadata.expiresAt,
        ...metadata
      }
    }),

  /**
   * Registra cuando un firmante abre el link
   */
  logLinkOpened: (documentId, signerLinkId, signerEmail, ipAddress) =>
    logEvent(EVENT_TYPES.OPENED, documentId, {
      signerLinkId,
      actorEmail: signerEmail,
      ipAddress
    }),

  /**
   * Registra cuando un firmante se identifica
   */
  logSignerIdentified: (documentId, signerLinkId, signerData) =>
    logEvent(EVENT_TYPES.IDENTIFIED, documentId, {
      signerLinkId,
      actorEmail: signerData.email,
      actorName: signerData.name,
      metadata: {
        company: signerData.company,
        jobTitle: signerData.jobTitle,
        ndaAccepted: signerData.ndaAccepted
      }
    }),

  /**
   * Registra cuando un firmante aplica la firma
   */
  logDocumentSigned: (documentId, signerLinkId, signerData, ipAddress) =>
    logEvent(EVENT_TYPES.SIGNED, documentId, {
      signerLinkId,
      actorEmail: signerData.email,
      actorName: signerData.name,
      ipAddress,
      metadata: {
        signatureType: signerData.signatureType, // 'draw' | 'type' | 'upload'
        company: signerData.company,
        jobTitle: signerData.jobTitle
      }
    }),

  /**
   * Registra cuando se ancla en Polygon
   */
  logPolygonAnchor: (documentId, txHash, blockNumber, metadata = {}) =>
    logEvent(EVENT_TYPES.ANCHORED_POLYGON, documentId, {
      metadata: {
        transactionHash: txHash,
        blockNumber: blockNumber,
        documentHash: metadata.documentHash,
        chainId: metadata.chainId || 137, // Polygon Mainnet
        ...metadata
      }
    }),

  /**
   * Registra cuando se descarga el .ECO
   */
  logEcoDownloaded: (documentId, userId, userEmail) =>
    logEvent(EVENT_TYPES.DOWNLOADED, documentId, {
      userId,
      actorEmail: userEmail
    })
};
