import { getSupabase } from './supabaseClient';

export type SignerPackageSummary = {
  id: string;
  signerId: string;
  workflowId: string;
  documentName: string;
  createdAt?: string | null;
  claimedAt?: string | null;
  pdfUrl?: string | null;
  ecoUrl?: string | null;
};

export async function claimSignerPackage(claimToken: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('claim-signer-package', {
    body: { claim_token: claimToken },
  });

  if (error) {
    throw error;
  }

  if (!data?.success) {
    throw new Error(data?.error || 'claim_failed');
  }

  return data;
}

export async function listSignerPackages(): Promise<SignerPackageSummary[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('list-signer-packages', {
    body: {},
  });

  if (error) {
    throw error;
  }

  if (!data?.success) {
    throw new Error(data?.error || 'list_failed');
  }

  return Array.isArray(data?.packages) ? data.packages : [];
}
