import { supabase } from './supabaseClient';

export interface BitcoinAnchorResponse {
  anchorId: string;
  status: string;
  record: any;
}

interface AnchorContext {
  documentId?: string | null;
  userId?: string | null;
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
    userId: context.userId ?? null,
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
