import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export interface EcoRecord {
  id: string;
  created_at: string;
  user_email: string;
  document_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  sha256_hash: string;
  eco_metadata: any;
  blockchain_tx_id?: string;
  status: 'pending' | 'anchored' | 'verified';
}

export interface AccessLog {
  id: string;
  created_at: string;
  document_id: string;
  user_email: string;
  action: 'created' | 'accessed' | 'verified' | 'downloaded';
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
}

export interface NdaSignature {
  id: string;
  created_at: string;
  document_id: string;
  signer_name: string;
  signer_email: string;
  signature_data: string;
  ip_address?: string;
  user_agent?: string;
  nda_accepted: boolean;
  access_token: string;
  expires_at: string;
}

export class SupabaseService {
  static async saveEcoRecord(ecoRecord: Omit<EcoRecord, 'id' | 'created_at'>): Promise<EcoRecord> {
    const { data, error } = await supabase
      .from('eco_records')
      .insert(ecoRecord)
      .select()
      .single();

    if (error) {
      console.error('Error saving ECO record:', error);
      throw new Error(`Failed to save ECO record: ${error.message}`);
    }

    return data;
  }

  static async getEcoRecord(documentId: string): Promise<EcoRecord | null> {
    const { data, error } = await supabase
      .from('eco_records')
      .select('*')
      .eq('document_id', documentId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching ECO record:', error);
      throw new Error(`Failed to fetch ECO record: ${error.message}`);
    }

    return data;
  }

  static async getEcoRecordsByEmail(email: string): Promise<EcoRecord[]> {
    const { data, error } = await supabase
      .from('eco_records')
      .select('*')
      .eq('user_email', email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ECO records:', error);
      throw new Error(`Failed to fetch ECO records: ${error.message}`);
    }

    return data || [];
  }

  static async logAccess(log: Omit<AccessLog, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase.from('access_logs').insert(log);

    if (error) {
      console.error('Error logging access:', error);
    }
  }

  static async getAccessLogs(documentId: string): Promise<AccessLog[]> {
    const { data, error } = await supabase
      .from('access_logs')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching access logs:', error);
      return [];
    }

    return data || [];
  }

  static async saveNdaSignature(
    signature: Omit<NdaSignature, 'id' | 'created_at'>
  ): Promise<NdaSignature> {
    const { data, error } = await supabase
      .from('nda_signatures')
      .insert(signature)
      .select()
      .single();

    if (error) {
      console.error('Error saving NDA signature:', error);
      throw new Error(`Failed to save NDA signature: ${error.message}`);
    }

    return data;
  }

  static async verifyAccessToken(token: string): Promise<NdaSignature | null> {
    const { data, error } = await supabase
      .from('nda_signatures')
      .select('*')
      .eq('access_token', token)
      .maybeSingle();

    if (error) {
      console.error('Error verifying access token:', error);
      throw new Error(`Failed to verify access token: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      return null;
    }

    return data;
  }
}

export default SupabaseService;
