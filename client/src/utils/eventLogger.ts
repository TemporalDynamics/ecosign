/**
 * Event Logger - ChainLog Universal
 *
 * Registra eventos en `events` (y/o vía edge function) para mantener la cadena de custodia.
 * Diseño conservador: valida tipos, maneja errores como strings y no asume presencia de sesión.
 */

import { getSupabase } from '../lib/supabaseClient';

export const EVENT_TYPES = {
  CREATED: 'created',
  SENT: 'sent',
  OPENED: 'opened',
  IDENTIFIED: 'identified',
  SIGNED: 'signed',
  ANCHORED_POLYGON: 'anchored_polygon',
  ANCHORED_BITCOIN: 'anchored_bitcoin',
  ANCHOR_ATTEMPT: 'anchor.attempt',      // ← NUEVO: Intento de anchoring
  ANCHOR_CONFIRMED: 'anchor.confirmed',  // ← NUEVO: Confirmación de anchor
  ANCHOR_FAILED: 'anchor.failed',        // ← NUEVO: Fallo de anchoring
  VERIFIED: 'verified',
  DOWNLOADED: 'downloaded',
  EXPIRED: 'expired'
} as const;

type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

type LogEventOptions = {
  userId?: string | null;
  signerLinkId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown> | null;
};

type LogResult = { success: boolean; data?: unknown; error?: string };

const asMessage = (err: unknown) =>
  err instanceof Error ? err.message : typeof err === 'string' ? err : 'Error desconocido';

function getSupabaseFunctionsUrl(): string {
  let url = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || import.meta.env.VITE_SUPABASE_URL;
  if (!url) throw new Error('Supabase URL environment variable is not set.');
  url = url.replace(/\/+$/, '');
  if (!url.includes('/functions/v1')) {
    url = `${url}/functions/v1`;
  }
  return url.replace(/\/functions\/v1\/functions\/v1/g, '/functions/v1');
}

export async function logEvent(eventType: EventType, documentId: string, options: LogEventOptions = {}): Promise<LogResult> {
  const supabase = getSupabase();
  try {
    if (!Object.values(EVENT_TYPES).includes(eventType)) {
      throw new Error(`Tipo de evento inválido: ${eventType}`);
    }
    if (!documentId) {
      throw new Error('documentId es obligatorio');
    }

    const eventData = {
      eventType,
      documentId,
      userId: options.userId || null,
      signerLinkId: options.signerLinkId || null,
      actorEmail: options.actorEmail || null,
      actorName: options.actorName || null,
      metadata: options.metadata || {}
    };

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No hay sesión activa');
    }

    const functionsUrl = getSupabaseFunctionsUrl();
    const response = await fetch(`${functionsUrl}/log-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify(eventData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = (errorData as { error?: string }).error || `HTTP ${response.status}`;
      return { success: false, error: msg };
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: asMessage(error) };
  }
}

export async function logEventsBatch(
  events: { eventType: EventType; documentId: string; options?: LogEventOptions }[]
): Promise<LogResult> {
  try {
    const settled = await Promise.allSettled(
      events.map(({ eventType, documentId, options }) => logEvent(eventType, documentId, options))
    );

    const errors = settled
      .filter((r) => r.status === 'fulfilled' && !r.value.success)
      .map((r) => (r.status === 'fulfilled' ? r.value.error : null))
      .filter(Boolean);

    const rejected = settled
      .filter((r) => r.status === 'rejected')
      .map((r) => (r.status === 'rejected' ? asMessage(r.reason) : null))
      .filter(Boolean);

    const totalErrors = [...errors, ...rejected] as string[];

    if (totalErrors.length > 0) {
      return { success: false, error: totalErrors.join(' | ') };
    }

    return { success: true, data: settled };
  } catch (error) {
    return { success: false, error: asMessage(error) };
  }
}

export async function getDocumentEvents(documentId: string): Promise<LogResult> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('document_id', documentId)
      .order('timestamp', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: asMessage(error) };
  }
}

export const EventHelpers = {
  logDocumentCreated: (documentId: string, userId: string, metadata: Record<string, unknown> = {}) =>
    logEvent(EVENT_TYPES.CREATED, documentId, {
      userId,
      actorEmail: (metadata as { userEmail?: string }).userEmail,
      actorName: (metadata as { userName?: string }).userName,
      metadata: {
        filename: (metadata as { filename?: string }).filename,
        fileSize: (metadata as { fileSize?: number }).fileSize,
        fileType: (metadata as { fileType?: string }).fileType,
        ...metadata
      }
    }),

  logLinkSent: (documentId: string, signerLinkId: string, signerEmail: string, metadata: Record<string, unknown> = {}) =>
    logEvent(EVENT_TYPES.SENT, documentId, {
      signerLinkId,
      actorEmail: signerEmail,
      metadata: {
        linkToken: (metadata as { linkToken?: string }).linkToken,
        expiresAt: (metadata as { expiresAt?: string }).expiresAt,
        ...metadata
      }
    }),

  logLinkOpened: (documentId: string, signerLinkId: string, signerEmail: string, ipAddress: string | null) =>
    logEvent(EVENT_TYPES.OPENED, documentId, {
      signerLinkId,
      actorEmail: signerEmail,
      ipAddress
    }),

  logSignerIdentified: (documentId: string, signerLinkId: string, signerData: Record<string, unknown>) =>
    logEvent(EVENT_TYPES.IDENTIFIED, documentId, {
      signerLinkId,
      actorEmail: (signerData as { email?: string }).email || null,
      actorName: (signerData as { name?: string }).name || null,
      metadata: {
        company: (signerData as { company?: string }).company,
        jobTitle: (signerData as { jobTitle?: string }).jobTitle,
        ndaAccepted: (signerData as { ndaAccepted?: boolean }).ndaAccepted
      }
    }),

  logDocumentSigned: (documentId: string, signerLinkId: string, signerData: Record<string, unknown>, ipAddress: string | null) =>
    logEvent(EVENT_TYPES.SIGNED, documentId, {
      signerLinkId,
      actorEmail: (signerData as { email?: string }).email || null,
      actorName: (signerData as { name?: string }).name || null,
      ipAddress,
      metadata: {
        signatureType: (signerData as { signatureType?: string }).signatureType,
        company: (signerData as { company?: string }).company,
        jobTitle: (signerData as { jobTitle?: string }).jobTitle
      }
    }),

  logPolygonAnchor: (documentId: string, txHash: string, blockNumber: number | string, metadata: Record<string, unknown> = {}) =>
    logEvent(EVENT_TYPES.ANCHORED_POLYGON, documentId, {
      metadata: {
        transactionHash: txHash,
        blockNumber,
        documentHash: (metadata as { documentHash?: string }).documentHash,
        chainId: (metadata as { chainId?: string | number }).chainId || 137,
        ...metadata
      }
    }),

  // ========================================================================
  // WORKSTREAM 3: Observable Anchoring Events
  // ========================================================================

  logAnchorAttempt: (
    documentId: string,
    network: 'polygon' | 'bitcoin',
    witnessHash: string,
    metadata: Record<string, unknown> = {}
  ) =>
    logEvent(EVENT_TYPES.ANCHOR_ATTEMPT, documentId, {
      metadata: {
        network,
        witness_hash: witnessHash,
        status: 'pending',
        attempted_at: new Date().toISOString(),
        ...metadata
      }
    }),

  logAnchorConfirmed: (
    documentId: string,
    network: 'polygon' | 'bitcoin',
    txHash: string,
    blockHeight: number | null,
    witnessHash: string,
    metadata: Record<string, unknown> = {}
  ) =>
    logEvent(EVENT_TYPES.ANCHOR_CONFIRMED, documentId, {
      metadata: {
        network,
        witness_hash: witnessHash,
        txid: txHash,
        block_height: blockHeight,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        ...metadata
      }
    }),

  logAnchorFailed: (
    documentId: string,
    network: 'polygon' | 'bitcoin',
    error: string,
    witnessHash: string,
    metadata: Record<string, unknown> = {}
  ) =>
    logEvent(EVENT_TYPES.ANCHOR_FAILED, documentId, {
      metadata: {
        network,
        witness_hash: witnessHash,
        status: 'failed',
        error_message: error,
        failed_at: new Date().toISOString(),
        ...metadata
      }
    }),

  // ========================================================================

  logEcoDownloaded: (documentId: string, userId: string, userEmail: string) =>
    logEvent(EVENT_TYPES.DOWNLOADED, documentId, {
      userId,
      actorEmail: userEmail
    })
};
