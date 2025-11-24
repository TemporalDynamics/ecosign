import { supabase } from './supabaseClient';

export interface BitcoinAnchorResponse {
  anchorId: string;
  status: string;
  record: any;
}

interface AnchorContext {
  documentId?: string | null;
  userDocumentId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  metadata?: Record<string, unknown>;
}

export async function requestBitcoinAnchor(
  documentHash: string,
  context: AnchorContext = {}
): Promise<BitcoinAnchorResponse | null> {
  if (!documentHash) {
    return null;
  }

  const payload = {
    documentHash,
    documentId: context.documentId ?? null,
    userDocumentId: context.userDocumentId ?? null,
    userId: context.userId ?? null,
    userEmail: context.userEmail ?? null,
    metadata: context.metadata ?? {}
  };

  const { data, error } = await supabase.functions.invoke<BitcoinAnchorResponse>('anchor-bitcoin', {
    body: payload
  });

  if (error) {
    throw new Error(error.message || 'No se pudo crear la solicitud de anclaje');
  }

  return data ?? null;
}
