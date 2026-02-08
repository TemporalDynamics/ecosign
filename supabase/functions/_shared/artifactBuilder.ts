/**
 * FASE C1.4 — Artifact Builder
 * 
 * Purpose: Assemble the final artifact from completed workflow data
 * Contract: FINAL_ARTIFACT_CONTRACT.md Section 3
 * 
 * Layers:
 * 1. Document Layer: Base PDF + applied signatures
 * 2. Evidence Layer: Witness metadata (human + machine readable)
 * 3. Identity Layer: Hash + unique identifiers
 */

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.42.0';
import { PDFDocument, StandardFonts, rgb } from 'https://cdn.skypack.dev/pdf-lib@1.17.1';

export interface ArtifactBuildResult {
  success: boolean;
  artifactId?: string;
  hash?: string;
  url?: string;
  error?: string;
}

export interface WorkflowData {
  id: string;
  document_entity_id: string;
  status: string;
}

/**
 * C1.4 — Main builder function
 * 
 * Steps:
 * 1. Fetch workflow data
 * 2. Fetch base document PDF
 * 3. Fetch signatures
 * 4. Apply signatures to PDF
 * 5. Generate evidence page
 * 6. Calculate SHA-256 hash
 * 7. Upload to storage
 * 
 * MUST:
 * - Be deterministic (same inputs → same output)
 * - Not modify base document content
 * - Not depend on external resources for interpretation
 * 
 * @param supabase - Supabase client with service role
 * @param workflow - Workflow metadata
 * @param artifactId - UUID for the artifact record
 * @returns Build result with artifact details or error
 */
export async function buildArtifact(
  supabase: SupabaseClient,
  workflow: WorkflowData,
  artifactId: string
): Promise<ArtifactBuildResult> {
  try {
    console.log(`[artifactBuilder] Starting build for workflow: ${workflow.id}`);

    // Step 1: Fetch complete workflow data
    const workflowDetails = await fetchWorkflowDetails(supabase, workflow.id);
    if (!workflowDetails.success) {
      return { success: false, error: workflowDetails.error };
    }

    // Step 2: Fetch base document from storage
    const baseDocument = await fetchBaseDocument(supabase, workflow.document_entity_id);
    if (!baseDocument.success) {
      return { success: false, error: baseDocument.error };
    }

    // Step 3: Fetch signatures
    const signatures = await fetchSignatures(supabase, workflow.id);
    if (!signatures.success) {
      return { success: false, error: signatures.error };
    }

    // Step 4: Apply signatures to PDF
    const signedPDF = await applySignaturesToPDF(
      baseDocument.pdfBytes!,
      signatures.data!,
      workflowDetails.data!
    );
    if (!signedPDF.success) {
      return { success: false, error: signedPDF.error };
    }

    // Step 5: Generate evidence page
    const withEvidence = await appendEvidencePage(
      signedPDF.pdfBytes!,
      workflowDetails.data!,
      signatures.data!,
      artifactId
    );
    if (!withEvidence.success) {
      return { success: false, error: withEvidence.error };
    }

    // Step 6: Calculate SHA-256 hash
    const hash = await calculateHash(withEvidence.pdfBytes!);

    // Step 7: Upload to storage
    const storagePath = `artifacts/${workflow.id}/${artifactId}.pdf`;
    const uploadResult = await uploadArtifact(
      supabase,
      storagePath,
      withEvidence.pdfBytes!
    );
    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error };
    }

    console.log(`[artifactBuilder] ✅ Artifact built successfully: ${artifactId}`);
    console.log(`[artifactBuilder]    Hash: ${hash}`);
    console.log(`[artifactBuilder]    URL: ${uploadResult.url}`);

    return {
      success: true,
      artifactId,
      hash,
      url: uploadResult.url,
    };

  } catch (error) {
    console.error('[artifactBuilder] Fatal error:', error);
    return {
      success: false,
      error: `Artifact builder failed: ${String(error)}`,
    };
  }
}

/**
 * Step 1: Fetch complete workflow details
 */
async function fetchWorkflowDetails(
  supabase: SupabaseClient,
  workflowId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const { data, error } = await supabase
    .from('signature_workflows')
    .select(`
      id,
      document_entity_id,
      status,
      created_at,
      updated_at,
      workflow_signers (
        id,
        email,
        status,
        signed_at
      )
    `)
    .eq('id', workflowId)
    .single();

  if (error) {
    return { success: false, error: `Failed to fetch workflow: ${error.message}` };
  }

  return { success: true, data };
}

/**
 * Step 2: Fetch base document PDF from storage
 */
async function fetchBaseDocument(
  supabase: SupabaseClient,
  documentEntityId: string
): Promise<{ success: boolean; pdfBytes?: Uint8Array; error?: string }> {
  // Get document path
  const { data: docEntity, error: docError } = await supabase
    .from('document_entities')
    .select('document_path, witness_current_storage_path')
    .eq('id', documentEntityId)
    .single();

  if (docError) {
    return { success: false, error: `Failed to fetch document entity: ${docError.message}` };
  }

  // Use witness if available, fallback to original
  const path = docEntity.witness_current_storage_path || docEntity.document_path;
  
  if (!path) {
    return { success: false, error: 'No document path found' };
  }

  // Download PDF from storage
  const { data: fileData, error: downloadError } = await supabase
    .storage
    .from('documents')
    .download(path);

  if (downloadError) {
    return { success: false, error: `Failed to download PDF: ${downloadError.message}` };
  }

  const pdfBytes = new Uint8Array(await fileData.arrayBuffer());
  return { success: true, pdfBytes };
}

/**
 * Step 3: Fetch signatures from P2.2 model
 */
async function fetchSignatures(
  supabase: SupabaseClient,
  workflowId: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  const { data, error } = await supabase
    .from('signature_instances')
    .select(`
      id,
      signer_id,
      batch_id,
      signature_payload,
      created_at,
      signature_application_events (
        id,
        field_id,
        applied_at,
        workflow_fields (
          id,
          field_type,
          label,
          value,
          position,
          apply_to_all_pages
        )
      )
    `)
    .eq('workflow_id', workflowId);

  if (error) {
    return { success: false, error: `Failed to fetch signatures: ${error.message}` };
  }

  return { success: true, data: data || [] };
}

/**
 * Step 4: Apply signatures to PDF
 * 
 * For each signature_instance:
 * - For each signature_application_event:
 *   - Apply signature to the field position
 */
async function applySignaturesToPDF(
  basePDFBytes: Uint8Array,
  signatures: any[],
  workflowData: any
): Promise<{ success: boolean; pdfBytes?: Uint8Array; error?: string }> {
  try {
    const pdfDoc = await PDFDocument.load(basePDFBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (const sigInstance of signatures) {
      const { signature_payload, signature_application_events } = sigInstance;

      if (!signature_application_events || signature_application_events.length === 0) {
        continue;
      }

      // Extract signature image from payload
      // Assuming signature_payload.dataUrl contains base64 image
      let signatureImage;
      try {
        if (signature_payload?.dataUrl) {
          const dataUrl = String(signature_payload.dataUrl);
          const base64 = dataUrl.split(',')[1];
          const imageBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
          const isPng = dataUrl.includes('png');
          signatureImage = isPng ? await pdfDoc.embedPng(imageBytes) : await pdfDoc.embedJpg(imageBytes);
        }
      } catch (imgError) {
        console.warn(`[applySignatures] Failed to embed signature image: ${imgError}`);
        continue;
      }

      // Apply to each field
      for (const appEvent of signature_application_events) {
        const field = appEvent.workflow_fields;
        if (!field) continue;
        const pos = field.position;
        if (!pos) continue;

        const applyOnPage = async (pageIndex: number) => {
          const page = pdfDoc.getPage(pageIndex);
          if (!page) return;
          const { width: pageW, height: pageH } = page.getSize();
          const w = pos.width * pageW;
          const h = pos.height * pageH;
          const x = pos.x * pageW;
          const yTop = pos.y * pageH;
          const y = pageH - yTop - h;

          if (field.field_type === 'signature') {
            if (signatureImage) {
              page.drawImage(signatureImage, { x, y, width: w, height: h });
            }
            return;
          }

          const value = typeof field.value === 'string' ? field.value.trim() : '';
          if (!value) return;

          const padding = 6;
          const fontSize = Math.max(10, Math.min(14, h - padding * 2));
          page.drawRectangle({ x, y, width: w, height: h, color: rgb(1, 1, 1), opacity: 1 });
          page.drawText(value, {
            x: x + padding,
            y: y + Math.max(padding, (h - fontSize) / 2),
            size: fontSize,
            font: field.field_type === 'date' ? boldFont : font,
            color: rgb(0.12, 0.12, 0.12),
            maxWidth: Math.max(0, w - padding * 2)
          });
        };

        const basePage = Math.max(0, (pos.page ?? 1) - 1);
        if (field.apply_to_all_pages) {
          for (let i = 0; i < pdfDoc.getPageCount(); i += 1) {
            await applyOnPage(i);
          }
        } else {
          await applyOnPage(Math.min(basePage, pdfDoc.getPageCount() - 1));
        }
      }
    }

    const finalBytes = await pdfDoc.save();
    return { success: true, pdfBytes: finalBytes };

  } catch (error) {
    return { success: false, error: `Failed to apply signatures: ${String(error)}` };
  }
}

/**
 * Step 5: Append evidence page (witness metadata)
 * 
 * MUST include (per FINAL_ARTIFACT_CONTRACT.md Section 3.2):
 * - Workflow ID
 * - Artifact ID
 * - Signer identifiers
 * - Timestamps
 * - Hashes
 * 
 * Format: Human-readable + structured for verification
 */
async function appendEvidencePage(
  pdfBytes: Uint8Array,
  workflowData: any,
  signatures: any[],
  artifactId: string
): Promise<{ success: boolean; pdfBytes?: Uint8Array; error?: string }> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const evidencePage = pdfDoc.addPage();
    const { width, height } = evidencePage.getSize();

    // Title
    evidencePage.drawText('EVIDENCIA DE FIRMA DIGITAL', {
      x: 50,
      y: height - 50,
      size: 16,
    });

    // Metadata
    let yOffset = height - 100;
    const lineHeight = 20;

    const metadata = [
      `Workflow ID: ${workflowData.id}`,
      `Artifact ID: ${artifactId}`,
      `Fecha de finalización: ${new Date().toISOString()}`,
      ``,
      `Firmantes:`,
    ];

    for (const signer of workflowData.workflow_signers || []) {
      metadata.push(`  - ${signer.email} (firmado: ${signer.signed_at || 'N/A'})`);
    }

    metadata.push(``);
    metadata.push(`Total de firmas aplicadas: ${signatures.length}`);

    for (const line of metadata) {
      evidencePage.drawText(line, {
        x: 50,
        y: yOffset,
        size: 10,
      });
      yOffset -= lineHeight;
    }

    const finalBytes = await pdfDoc.save();
    return { success: true, pdfBytes: finalBytes };

  } catch (error) {
    return { success: false, error: `Failed to append evidence: ${String(error)}` };
  }
}

/**
 * Step 6: Calculate SHA-256 hash
 */
async function calculateHash(pdfBytes: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', pdfBytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Step 7: Upload artifact to storage
 */
async function uploadArtifact(
  supabase: SupabaseClient,
  path: string,
  pdfBytes: Uint8Array
): Promise<{ success: boolean; url?: string; error?: string }> {
  const { data, error } = await supabase
    .storage
    .from('artifacts')
    .upload(path, pdfBytes, {
      contentType: 'application/pdf',
      upsert: false, // Never overwrite
    });

  if (error) {
    return { success: false, error: `Failed to upload artifact: ${error.message}` };
  }

  // Generate public URL
  const { data: urlData } = supabase
    .storage
    .from('artifacts')
    .getPublicUrl(path);

  return { success: true, url: urlData.publicUrl };
}
