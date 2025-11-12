import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper: Save certification to DB
export async function saveCertification(certData, userId) {
  const { data, error } = await supabase
    .from('certifications')
    .insert({
      user_id: userId,
      file_name: certData.fileName,
      file_hash: certData.hash,
      file_size: certData.fileSize,
      public_key: certData.publicKey,
      signature: certData.signature,
      ecox_data: certData.ecoxManifest || {},
      local_timestamp: certData.timestamp,
      tsa_token: certData.legalTimestamp?.token,
      ots_proof: certData.blockchainAnchoring?.otsProof,
      ots_status: certData.blockchainAnchoring?.enabled ? 'pending' : 'none',
      estimated_ots_confirmation: certData.blockchainAnchoring?.estimatedConfirmation,
      nda_required: certData.ndaRequired || false,
      shared_url: `${window.location.origin}/verify/${certData.hash.substring(0, 16)}`
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Helper: Get user certifications
export async function getUserCertifications(userId) {
  const { data, error } = await supabase
    .from('certifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Helper: Get verification logs for cert
export async function getVerificationLogs(certificationId) {
  const { data, error } = await supabase
    .from('verification_logs')
    .select('*')
    .eq('certification_id', certificationId)
    .order('accessed_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Helper: Update OTS status
export async function updateOTSStatus(certId, otsStatus, otsProof, blockHeight) {
  const updateData = {
    ots_status: otsStatus,
    ots_confirmed_at: otsStatus === 'confirmed' ? new Date().toISOString() : null
  };
  
  if (otsProof) updateData.ots_proof = otsProof;
  if (blockHeight) updateData.ots_block_height = blockHeight;

  const { data, error } = await supabase
    .from('certifications')
    .update(updateData)
    .eq('id', certId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Helper: Save NDA acceptance
export async function saveNDAAcceptance(documentHash, userId) {
  const { data: certData, error: certError } = await supabase
    .from('certifications')
    .select('id')
    .eq('file_hash', documentHash)
    .single();

  if (certError) return { success: false, error: certError.message };

  const { error } = await supabase
    .from('verification_logs')
    .insert({
      certification_id: certData.id,
      document_hash: documentHash,
      nda_accepted: true,
      nda_accepted_at: new Date().toISOString(),
      user_id: userId
    });

  if (error) return { success: false, error: error.message };

  return { success: true };
}

// Helper: Increment download count
export async function incrementDownloadCount(certId) {
  const { data, error } = await supabase
    .from('certifications')
    .select('download_count')
    .eq('id', certId)
    .single();

  if (error) {
    console.error('Error getting download count:', error);
    return;
  }

  const newCount = (data.download_count || 0) + 1;
  const { error: updateError } = await supabase
    .from('certifications')
    .update({ download_count: newCount })
    .eq('id', certId);

  if (updateError) console.error('Error incrementing download count:', updateError);
}

// Helper: Increment verification count
export async function incrementVerificationCount(certId) {
  const { data, error } = await supabase
    .from('certifications')
    .select('verification_count')
    .eq('id', certId)
    .single();

  if (error) {
    console.error('Error getting verification count:', error);
    return;
  }

  const newCount = (data.verification_count || 0) + 1;
  const { error: updateError } = await supabase
    .from('certifications')
    .update({ verification_count: newCount })
    .eq('id', certId);

  if (updateError) console.error('Error incrementing verification count:', updateError);
}

// Helper: Create/update user profile
export async function createUserProfile(user) {
  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      id: user.id,
      email: user.email,
      created_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (error) console.error('Error creating user profile:', error);
}