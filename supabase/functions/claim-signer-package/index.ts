import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { sha256Hex } from '../_shared/canonicalHash.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { normalizeEmail } from '../_shared/email.ts';

const jsonResponse = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });

async function resolveAuthUser(supabase: any, authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

const isHttpUrl = (value: string | null | undefined) =>
  typeof value === 'string' && /^https?:\/\//i.test(value);

const normalizeFileName = (value: string | null | undefined) => {
  const safe = String(value || 'documento_firmado')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\\/]+/g, '_')
    .replace(/[^a-zA-Z0-9._ -]/g, '_');
  if (!safe.toLowerCase().endsWith('.pdf')) return `${safe}.pdf`;
  return safe;
};

const readBytes = async (resp: Response) => new Uint8Array(await resp.arrayBuffer());

const ensureArray = (value: unknown) => (Array.isArray(value) ? value : []);

serve(async (req) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined);

  if (req.method === 'OPTIONS') {
    if (!isAllowed) return new Response('Forbidden', { status: 403, headers: corsHeaders });
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (!isAllowed) {
    return jsonResponse({ success: false, error: 'Origin not allowed' }, 403, corsHeaders);
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405, corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const body = (await req.json().catch(() => ({}))) as { claim_token?: string };
    const claimToken = String(body?.claim_token ?? '').trim();
    if (!claimToken) {
      return jsonResponse({ success: false, error: 'claim_token_required' }, 400, corsHeaders);
    }

    const authUser = await resolveAuthUser(supabase, req.headers.get('Authorization'));
    if (!authUser?.id || !authUser.email) {
      return jsonResponse({ success: false, error: 'unauthorized' }, 401, corsHeaders);
    }

    const claimTokenHash = await sha256Hex(claimToken);
    const { data: claimRow, error: claimError } = await supabase
      .from('signer_package_claims')
      .select('*')
      .eq('claim_token_hash', claimTokenHash)
      .single();

    if (claimError || !claimRow) {
      return jsonResponse({ success: false, error: 'claim_not_found' }, 404, corsHeaders);
    }

    if (claimRow.claimed_by && claimRow.claimed_by !== authUser.id) {
      return jsonResponse({ success: false, error: 'claim_already_used' }, 409, corsHeaders);
    }

    if (claimRow.claimed_by && claimRow.claimed_document_entity_id) {
      return jsonResponse(
        {
          success: true,
          claimed: true,
          documentName: claimRow.document_name ?? null,
          documentEntityId: claimRow.claimed_document_entity_id,
        },
        200,
        corsHeaders,
      );
    }

    const normalizedUserEmail = normalizeEmail(authUser.email);
    const normalizedSignerEmail = normalizeEmail(claimRow.signer_email ?? '');
    if (normalizedSignerEmail && normalizedSignerEmail !== normalizedUserEmail) {
      return jsonResponse({ success: false, error: 'claim_email_mismatch' }, 403, corsHeaders);
    }

    const pdfPath = claimRow.pdf_path as string | null;
    if (!pdfPath) {
      return jsonResponse({ success: false, error: 'claim_missing_pdf' }, 400, corsHeaders);
    }

    const { data: workflow } = await supabase
      .from('signature_workflows')
      .select('id, document_entity_id, title, original_filename, document_path')
      .eq('id', claimRow.workflow_id)
      .single();

    const sourceEntityId = workflow?.document_entity_id ?? null;
    let sourceEntity: any = null;
    if (sourceEntityId) {
      const { data: entityRow } = await supabase
        .from('document_entities')
        .select(
          'id, source_name, source_mime, source_size, source_hash, witness_hash, witness_current_hash, signed_hash, signed_authority, signed_authority_ref, lifecycle_status, events, witness_history, transform_log, hash_chain'
        )
        .eq('id', sourceEntityId)
        .single();
      sourceEntity = entityRow ?? null;
    }

    let pdfBytes: Uint8Array;
    if (isHttpUrl(pdfPath)) {
      const pdfResp = await fetch(pdfPath);
      if (!pdfResp.ok) {
        return jsonResponse({ success: false, error: 'claim_pdf_fetch_failed' }, 502, corsHeaders);
      }
      pdfBytes = await readBytes(pdfResp);
    } else {
      const { data: pdfBlob, error: pdfErr } = await supabase.storage
        .from('user-documents')
        .download(pdfPath);
      if (pdfErr || !pdfBlob) {
        return jsonResponse({ success: false, error: 'claim_pdf_download_failed' }, 502, corsHeaders);
      }
      pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());
    }

    const pdfHash = await sha256Hex(pdfBytes);
    const expectedWitnessHash = claimRow?.witness_hash || null;
    if (expectedWitnessHash && String(expectedWitnessHash).toLowerCase() !== pdfHash.toLowerCase()) {
      return jsonResponse({ success: false, error: 'claim_witness_hash_mismatch' }, 409, corsHeaders);
    }

    const safeName = normalizeFileName(
      claimRow.document_name || workflow?.original_filename || workflow?.title || 'documento_firmado'
    );
    const nowIso = new Date().toISOString();
    const targetPath = `claims/${authUser.id}/${claimRow.id}/${Date.now()}_${safeName}`;

    const { error: uploadErr } = await supabase.storage
      .from('user-documents')
      .upload(targetPath, new Blob([pdfBytes], { type: 'application/pdf' }), {
        upsert: true,
        contentType: 'application/pdf',
      });

    if (uploadErr) {
      return jsonResponse({ success: false, error: 'claim_pdf_upload_failed' }, 500, corsHeaders);
    }

    const events = ensureArray(sourceEntity?.events);
    const witnessHistory = ensureArray(sourceEntity?.witness_history);

    const sourceHashForInsert = sourceEntity?.source_hash ?? pdfHash;
    let insertedId: string | null = null;
    const { data: inserted, error: insertErr } = await supabase
      .from('document_entities')
      .insert({
        owner_id: authUser.id,
        source_name: sourceEntity?.source_name ?? safeName,
        source_mime: sourceEntity?.source_mime ?? 'application/pdf',
        source_size: sourceEntity?.source_size ?? pdfBytes.length,
        source_hash: sourceHashForInsert,
        custody_mode: 'hash_only',
        lifecycle_status: sourceEntity?.lifecycle_status ?? 'signed',
        witness_hash: pdfHash,
        witness_current_hash: pdfHash,
        witness_current_mime: 'application/pdf',
        witness_current_status: 'signed',
        witness_current_storage_path: targetPath,
        witness_current_generated_at: nowIso,
        witness_history: witnessHistory,
        signed_hash: sourceEntity?.signed_hash ?? null,
        signed_authority: sourceEntity?.signed_authority ?? null,
        signed_authority_ref: sourceEntity?.signed_authority_ref ?? null,
        events,
        transform_log: sourceEntity?.transform_log ?? undefined,
        hash_chain: sourceEntity?.hash_chain ?? undefined,
        metadata: {
          claimed_from_signer_package: claimRow.id,
          claimed_at: nowIso,
          claimed_pdf_path: targetPath,
          claimed_pdf_hash: pdfHash,
        },
      })
      .select('id')
      .single();

    if (insertErr) {
      const code = (insertErr as any)?.code ?? '';
      if (code === '23505') {
        const { data: existing } = await supabase
          .from('document_entities')
          .select('id')
          .eq('owner_id', authUser.id)
          .eq('source_hash', sourceHashForInsert)
          .maybeSingle();
        insertedId = existing?.id ?? null;
      } else {
        return jsonResponse({ success: false, error: 'claim_document_insert_failed' }, 500, corsHeaders);
      }
    } else {
      insertedId = inserted?.id ?? null;
    }

    if (!insertedId) {
      return jsonResponse({ success: false, error: 'claim_document_insert_failed' }, 500, corsHeaders);
    }

    await supabase
      .from('signer_package_claims')
      .update({
        claimed_at: claimRow.claimed_at ?? nowIso,
        claimed_by: authUser.id,
        claimed_document_entity_id: insertedId,
      })
      .eq('id', claimRow.id);

    return jsonResponse(
      {
        success: true,
        claimed: true,
        documentName: claimRow.document_name ?? null,
        documentEntityId: insertedId,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('claim-signer-package error:', message);
    return jsonResponse({ success: false, error: message }, 500, corsHeaders);
  }
});
