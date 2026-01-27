// Background worker to process Bitcoin anchoring via OpenTimestamps
// This function should be called periodically (e.g., every 5 minutes via cron)
// Enhanced to support user_documents bitcoin_status tracking

import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { sendResendEmail } from '../_shared/email.ts';
import { createLogger, withTiming } from '../_shared/logger.ts';
import { Buffer } from 'node:buffer';
import { appendAnchorEventFromEdge, logAnchorAttempt, logAnchorFailed } from '../_shared/anchorHelper.ts';

// TODO(canon): Migrate from user_document_id to document_entity_id
// Current: Uses user_document_id (legacy), dual-writes to events[]
// Future: Use document_entity_id as primary key

const logger = createLogger('process-bitcoin-anchors');

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const resendApiKey = Deno.env.get('RESEND_API_KEY');
const defaultFrom = Deno.env.get('DEFAULT_FROM') || 'EcoSign <no-reply@email.ecosign.app>';
const mempoolApiUrl = Deno.env.get('MEMPOOL_API_URL') || 'https://mempool.space/api';

// 288 attempts × 5 min = 24 hours (matches user promise of 4-24h)
const MAX_VERIFY_ATTEMPTS = 288;
const CONFIRM_WITHOUT_TX_THRESHOLD = 5;
// Alert threshold: warn at 20 hours (240 attempts)
const ALERT_THRESHOLD = 240;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });

async function resolveProjectId(anchor: any): Promise<string | null> {
  const fromMetadata = anchor?.metadata?.projectId
  if (typeof fromMetadata === 'string' && fromMetadata.trim()) {
    return fromMetadata
  }
  if (!supabaseAdmin || !anchor?.user_document_id) return null
  const { data, error } = await supabaseAdmin
    .from('user_documents')
    .select('eco_data')
    .eq('id', anchor.user_document_id)
    .maybeSingle()
  if (error || !data?.eco_data) return null
  const ecoData = data.eco_data as Record<string, unknown>
  const manifest = ecoData?.['manifest'] as Record<string, unknown> | undefined
  const projectId = manifest?.['projectId']
  return typeof projectId === 'string' ? projectId : null
}

/**
 * Resolve document_entity_id from user_document_id (legacy mapping)
 * Returns: { documentEntityId, witnessHash } or null
 */
async function resolveDocumentEntity(userDocumentId: string): Promise<{ documentEntityId: string; witnessHash: string } | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('user_documents')
    .select('document_entity_id')
    .eq('id', userDocumentId)
    .maybeSingle()

  if (error || !data?.document_entity_id) {
    logger.warn('document_entity_not_found', { userDocumentId, error: error?.message })
    return null
  }

  const { data: entity, error: entityError } = await supabaseAdmin
    .from('document_entities')
    .select('id, witness_hash')
    .eq('id', data.document_entity_id)
    .maybeSingle()

  if (entityError || !entity || !entity.witness_hash) {
    logger.warn('witness_hash_not_found', { documentEntityId: data.document_entity_id, error: entityError?.message })
    return null
  }

  return {
    documentEntityId: entity.id,
    witnessHash: entity.witness_hash
  }
}

/**
 * Submit hash to OpenTimestamps calendar servers
 */
async function submitToOpenTimestamps(hash: string): Promise<{
  success: boolean;
  otsProof?: string;
  calendarUrl?: string;
  error?: string;
}> {
  try {
    // OpenTimestamps calendars (try multiple for redundancy)
    const calendars = [
      'https://a.pool.opentimestamps.org',
      'https://b.pool.opentimestamps.org',
      'https://finney.calendar.eternitywall.com'
    ];

    for (const calendar of calendars) {
      try {
        // Convert hex hash to bytes
        const hashBytes = new Uint8Array(
          hash.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
        );

        // Submit to calendar
        const response = await fetch(`${calendar}/digest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream'
          },
          body: hashBytes
        });

        if (response.ok) {
          const otsProofBytes = new Uint8Array(await response.arrayBuffer());

          // Convert to base64 for storage
          const otsProof = btoa(String.fromCharCode.apply(null, Array.from(otsProofBytes)));

          console.log(`✅ Successfully submitted to ${calendar}`);

          return {
            success: true,
            otsProof,
            calendarUrl: calendar
          };
        }
      } catch (calendarError) {
        console.warn(`Failed to submit to ${calendar}:`, calendarError);
        continue; // Try next calendar
      }
    }

    return {
      success: false,
      error: 'All calendar servers failed'
    };

  } catch (error) {
    console.error('OpenTimestamps submission error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Verify/upgrade OpenTimestamps proof (check if it's been confirmed in Bitcoin)
 */
async function verifyOpenTimestamps(otsProof: string, calendarUrl: string): Promise<{
  confirmed: boolean;
  bitcoinTxId?: string;
  blockHeight?: number;
  upgradedProof?: string;
  upgraded?: boolean;
}> {
  try {
    // Decode base64 proof
    const proofBytes = Uint8Array.from(atob(otsProof), c => c.charCodeAt(0));

    // Try to upgrade the proof (this queries Bitcoin blockchain via calendar)
    const response = await fetch(`${calendarUrl}/timestamp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream'
      },
      body: proofBytes
    });

    if (!response.ok) {
      // Not confirmed yet
      return { confirmed: false };
    }

    const upgradedBytes = new Uint8Array(await response.arrayBuffer());
    const upgradedProof = btoa(String.fromCharCode.apply(null, Array.from(upgradedBytes)));

    // TODO: Parse the upgraded proof properly to extract txid/blockheight.
    // To avoid false positives we only mark confirmed if the proof changed (was upgraded).
    // OpenTimestamps upgrades only once the Bitcoin anchor is available.
    const wasUpgraded = upgradedProof !== otsProof;

    return {
      confirmed: wasUpgraded,
      upgraded: wasUpgraded,
      upgradedProof: wasUpgraded ? upgradedProof : otsProof,
      bitcoinTxId: wasUpgraded ? 'pending-extraction' : undefined,
      blockHeight: wasUpgraded ? 0 : undefined
    };

  } catch (error) {
    console.error('OpenTimestamps verification error:', error);
    return { confirmed: false };
  }
}

async function extractBitcoinTxFromOts(otsProof: string): Promise<{ txid?: string; height?: number }> {
  try {
    // Lazy import to avoid cold start cost if unused
    const otsModule = await import('npm:javascript-opentimestamps');
    const OpenTimestamps = (otsModule as any).default || otsModule;
    const proofBytes = Uint8Array.from(atob(otsProof), c => c.charCodeAt(0));
    const dtf = OpenTimestamps.DetachedTimestampFile.deserialize(Buffer.from(proofBytes));

    // Traverse attestations to locate Bitcoin anchor
    const attestations = dtf?.timestamp?.attestations ?? [];
    for (const att of attestations) {
      const className = att?.constructor?.name?.toLowerCase?.() || '';
      if (!className.includes('bitcoin')) continue;

      // Try common field names
      const txidHex = att.txid
        ? Buffer.from(att.txid).toString('hex')
        : (typeof att.txId === 'string' ? att.txId : undefined) ||
          (typeof att.tx_hash === 'string' ? att.tx_hash : undefined) ||
          (typeof att.txHash === 'string' ? att.txHash : undefined);
      const height = typeof att.height === 'number' ? att.height : undefined;

      if (txidHex) {
        return { txid: txidHex, height };
      }
    }

    return {};
  } catch (err) {
    console.warn('Could not parse OTS proof for Bitcoin txid:', err);
    return {};
  }
}

async function fetchBitcoinBlockData(txid: string): Promise<{ blockHeight?: number; confirmedAt?: string }> {
  if (!txid) return {};
  try {
    const resp = await fetch(`${mempoolApiUrl}/tx/${txid}`);
    if (!resp.ok) {
      console.warn('mempool.space response not ok', resp.status);
      return {};
    }
    const json = await resp.json();
    const blockHeight = json.status?.block_height;
    const blockTime = json.status?.block_time;
    return {
      blockHeight: typeof blockHeight === 'number' ? blockHeight : undefined,
      confirmedAt: typeof blockTime === 'number' ? new Date(blockTime * 1000).toISOString() : undefined
    };
  } catch (err) {
    console.warn('Failed to fetch mempool data for tx', txid, err);
    return {};
  }
}

/**
 * Convert base64 OTS proof to bytea for database storage
 */
function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function insertBitcoinNotification(anchor: any, txid?: string, blockHeight?: number, confirmedAt?: string | null) {
  if (!supabaseAdmin) return;
  if (!anchor.document_id || !anchor.user_email) return;

  const explorerUrl = txid ? `${mempoolApiUrl.replace('/api', '')}/tx/${txid}` : undefined;
  const subject = '✅ Documento anclado en Bitcoin';
  const body_html = `
    <p>Tu documento se ancló correctamente en la red Bitcoin.</p>
    <ul>
      <li><strong>Hash:</strong> <code>${anchor.document_hash}</code></li>
      ${txid ? `<li><strong>Tx:</strong> <a href="${explorerUrl}">${txid}</a></li>` : ''}
      ${blockHeight ? `<li><strong>Bloque:</strong> ${blockHeight}</li>` : ''}
    </ul>
    <p>Fecha de confirmación: ${confirmedAt ?? 'pendiente'}</p>
  `;

  await supabaseAdmin
    .from('workflow_notifications')
    .insert({
      workflow_id: anchor.document_id,
      recipient_email: anchor.user_email,
      recipient_type: 'owner',
      notification_type: 'bitcoin_confirmed',
      subject,
      body_html,
      delivery_status: 'pending',
      error_message: null,
    });
}

/**
 * Send email notification when anchor is confirmed
 */
async function sendConfirmationEmail(
  email: string,
  documentHash: string,
  bitcoinTxId: string | null,
  blockHeight: number | null
): Promise<boolean> {
  if (!resendApiKey || !email) {
    console.warn('Email notification skipped: missing API key or email');
    return false;
  }

  const subject = '✅ Anclaje Bitcoin confirmado';
  const html = `
    <h2>🔗 Anclaje en Bitcoin Confirmado</h2>
    <p>Tu documento ha sido anclado exitosamente en la blockchain de Bitcoin.</p>
    <h3>Detalles:</h3>
    <ul>
      <li><strong>Hash:</strong> <code>${documentHash}</code></li>
      ${bitcoinTxId ? `<li><strong>Transacción:</strong> <code>${bitcoinTxId}</code></li>` : ''}
      ${blockHeight ? `<li><strong>Bloque:</strong> ${blockHeight}</li>` : ''}
    </ul>
    <p>Tu certificado .ECO ya está disponible para descarga en tu cuenta.</p>
    <p style="color: #666; font-size: 12px;">Mensaje automático de EcoSign.</p>
  `;

  const result = await sendResendEmail({
    from: defaultFrom,
    to: email,
    subject,
    html
  });

  if (!result.ok) {
    console.error('Failed to send email:', result.error || result.body);
    return false;
  }

  console.log(`✅ Confirmation email sent to ${email}`);
  return true;
}

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!supabaseAdmin) {
    return jsonResponse({ error: 'Supabase not configured' }, 500);
  }

  try {
    logger.info('process_bitcoin_anchors_started');
    const processingStartTime = Date.now();

    let processed = 0;
    let submitted = 0;
    let confirmed = 0;
    let failed = 0;
    let waiting = 0;

    // STEP 1: Process newly queued anchors (submit to OpenTimestamps)
    const { data: queuedAnchors, error: queuedError } = await supabaseAdmin
      .from('anchors')
      .select('*')
      .eq('anchor_status', 'queued')
      .order('created_at', { ascending: true })
      .limit(10);

    if (queuedError) {
      logger.error('fetch_queued_anchors_failed', { error: queuedError.message }, queuedError);
    } else if (queuedAnchors && queuedAnchors.length > 0) {
      logger.info('queued_anchors_found', { count: queuedAnchors.length });

      for (const anchor of queuedAnchors) {
        // Resolve document entity for observable events
        const docEntity = anchor.user_document_id
          ? await resolveDocumentEntity(anchor.user_document_id)
          : null;

        // WORKSTREAM 3: Log attempt (observability event)
        // This creates audit trail of ALL Bitcoin anchoring attempts
        // Philosophy: "UI refleja, no afirma" - every attempt is logged
        if (anchor.user_document_id && docEntity?.witnessHash) {
          await logAnchorAttempt(
            supabaseAdmin,
            anchor.user_document_id,
            'bitcoin',
            docEntity.witnessHash,
            {
              documentHash: anchor.document_hash,
              anchorId: anchor.id,
              method: 'opentimestamps'
            }
          )
        }

        // Policy: if the user cancelled Bitcoin, ignore any late confirmations.
        // Bitcoin is an optional reinforcement layer and must never block or revive once cancelled.
        if (anchor.user_document_id) {
          const { data: userDocStatus } = await supabaseAdmin
            .from('user_documents')
            .select('bitcoin_status')
            .eq('id', anchor.user_document_id)
            .single();
          if (userDocStatus?.bitcoin_status === 'cancelled') {
            await supabaseAdmin
              .from('anchors')
              .update({
                anchor_status: 'cancelled',
                updated_at: new Date().toISOString()
              })
              .eq('id', anchor.id);
            logger.info('anchor_cancelled_by_user', {
              anchorId: anchor.id,
              userDocumentId: anchor.user_document_id,
              reason: 'bitcoin_cancelled'
            });
            continue;
          }
        }

        const { result, durationMs } = await withTiming(() =>
          submitToOpenTimestamps(anchor.document_hash)
        );

        if (result.success) {
          await supabaseAdmin
            .from('anchors')
            .update({
              anchor_status: 'pending',
              ots_proof: result.otsProof,
              ots_calendar_url: result.calendarUrl,
              updated_at: new Date().toISOString()
            })
            .eq('id', anchor.id);

          submitted++;
          logger.info('anchor_submitted', {
            anchorId: anchor.id,
            documentHash: anchor.document_hash,
            calendarUrl: result.calendarUrl,
            durationMs
          });
        } else {
          // WORKSTREAM 3: Log failure (observability event)
          if (anchor.user_document_id && docEntity?.witnessHash) {
            await logAnchorFailed(
              supabaseAdmin,
              anchor.user_document_id,
              'bitcoin',
              docEntity.witnessHash,
              result.error || 'OpenTimestamps submission failed',
              1, // First attempt
              {
                anchorId: anchor.id,
                documentHash: anchor.document_hash,
                method: 'opentimestamps'
              }
            )
          }

          await supabaseAdmin
            .from('anchors')
            .update({
              anchor_status: 'failed',
              error_message: result.error,
              updated_at: new Date().toISOString()
            })
            .eq('id', anchor.id);

          failed++;
          logger.error('anchor_submission_failed', {
            anchorId: anchor.id,
            documentHash: anchor.document_hash,
            error: result.error,
            durationMs
          });
        }

        processed++;
      }
    }

    // STEP 2: Check pending anchors for confirmation
    const { data: pendingAnchors, error: pendingError } = await supabaseAdmin
      .from('anchors')
      .select('*')
      .in('anchor_status', ['pending', 'processing'])
      .order('created_at', { ascending: true })
      .limit(20);

    if (pendingError) {
      logger.error('fetch_pending_anchors_failed', { error: pendingError.message }, pendingError);
    } else if (pendingAnchors && pendingAnchors.length > 0) {
      logger.info('pending_anchors_found', { count: pendingAnchors.length });

      for (const anchor of pendingAnchors) {
        if (!anchor.ots_proof || !anchor.ots_calendar_url) {
          continue;
        }

        // Policy: late Bitcoin confirmations are ignored after user cancellation.
        if (anchor.user_document_id) {
          const { data: userDocStatus } = await supabaseAdmin
            .from('user_documents')
            .select('bitcoin_status')
            .eq('id', anchor.user_document_id)
            .single();
          if (userDocStatus?.bitcoin_status === 'cancelled') {
            await supabaseAdmin
              .from('anchors')
              .update({
                anchor_status: 'cancelled',
                updated_at: new Date().toISOString()
              })
              .eq('id', anchor.id);
            logger.info('anchor_cancelled_by_user', {
              anchorId: anchor.id,
              userDocumentId: anchor.user_document_id,
              reason: 'bitcoin_cancelled'
            });
            continue;
          }
        }

        const attempts = (anchor.bitcoin_attempts ?? 0) + 1;

        // Alert when approaching timeout (20 hours)
        if (attempts > ALERT_THRESHOLD && attempts <= MAX_VERIFY_ATTEMPTS) {
          const hoursElapsed = (attempts * 5) / 60;
          logger.warn('anchor_timeout_approaching', {
            anchorId: anchor.id,
            hoursElapsed: hoursElapsed.toFixed(1),
            attempts,
            maxAttempts: MAX_VERIFY_ATTEMPTS
          });
        }

        if (attempts > MAX_VERIFY_ATTEMPTS) {
          const errorMessage = `Bitcoin verification timeout after 24 hours (${attempts} attempts). OpenTimestamps may still confirm later - you can retry verification manually.`;
          logger.error('anchor_timeout', {
            anchorId: anchor.id,
            attempts,
            errorMessage
          });

          // Marcar anchor de Bitcoin como failed
          await supabaseAdmin
            .from('anchors')
            .update({
              anchor_status: 'failed',
              bitcoin_error_message: errorMessage,
              bitcoin_attempts: attempts,
              updated_at: new Date().toISOString()
            })
            .eq('id', anchor.id);

          // Aplicar Política 1: Si tengo Polygon, el certificado sigue siendo válido
          if (anchor.user_document_id) {
            const { data: userDoc } = await supabaseAdmin
              .from('user_documents')
              .select('has_polygon_anchor, polygon_anchor_id')
              .eq('id', anchor.user_document_id)
              .single();

            if (userDoc?.has_polygon_anchor) {
              // Polygon está OK → Certificado válido aunque Bitcoin falló
              await supabaseAdmin
                .from('user_documents')
                .update({
                  bitcoin_status: 'failed',
                  overall_status: 'certified',     // ✅ Válido con Polygon
                  download_enabled: true,          // ✅ Permitir descarga
                })
                .eq('id', anchor.user_document_id);

              logger.info('document_certified_with_polygon_fallback', {
                anchorId: anchor.id,
                userDocumentId: anchor.user_document_id,
                polygonAnchorId: userDoc.polygon_anchor_id
              });
            } else {
              // No hay Polygon → Certificado failed
              await supabaseAdmin
                .from('user_documents')
                .update({
                  bitcoin_status: 'failed',
                  overall_status: 'failed',
                  download_enabled: false,
                })
                .eq('id', anchor.user_document_id);

              logger.error('document_failed_no_valid_anchors', {
                anchorId: anchor.id,
                userDocumentId: anchor.user_document_id
              });
            }
          }

          failed++;
          processed++;
          continue;
        }

        const verification = await verifyOpenTimestamps(
          anchor.ots_proof,
          anchor.ots_calendar_url
        );

        if (verification.confirmed) {
          // Try to extract txid/height from the upgraded proof
          const parsed = verification.upgradedProof
            ? await extractBitcoinTxFromOts(verification.upgradedProof)
            : await extractBitcoinTxFromOts(anchor.ots_proof);

          let txid = parsed.txid || verification.bitcoinTxId;
          let blockHeight = parsed.height || verification.blockHeight;

          // Optional: fetch block data from mempool if txid is available
          if (txid) {
            const blockData = await fetchBitcoinBlockData(txid);
            blockHeight = blockHeight ?? blockData.blockHeight;
            verification.confirmed = true;
            verification.bitcoinTxId = txid;
            verification.blockHeight = blockHeight ?? verification.blockHeight;
            verification.upgradedProof = verification.upgradedProof || anchor.ots_proof;
            verification.upgraded = verification.upgraded ?? true;
            if (!parsed.height && blockData.blockHeight) {
              parsed.height = blockData.blockHeight;
            }
            if (blockData.confirmedAt) {
              // Use atomic transaction to update anchor + user_documents + audit_logs together
              const confirmedAt = blockData.confirmedAt;
              const otsBytes = base64ToBytes(verification.upgradedProof || anchor.ots_proof);

              const metadata = {
                bitcoin_tx: txid,
                block: blockHeight,
                confirmed_at: confirmedAt,
                calendar_url: anchor.ots_calendar_url
              };

              const userDocumentUpdates = anchor.user_document_id ? {
                document_id: anchor.user_document_id,
                bitcoin_status: 'confirmed',
                bitcoin_confirmed_at: confirmedAt,
                overall_status: 'certified',
                download_enabled: true,
                bitcoin_anchor_id: anchor.id,
                has_bitcoin_anchor: true  // ✅ Set flag when confirmed (conservative truth)
              } : null;

              // Call atomic function
              const { error: atomicError } = await supabaseAdmin.rpc('anchor_atomic_tx', {
                _anchor_id: anchor.id,
                _anchor_user_id: anchor.user_id,
                _ots: otsBytes,
                _metadata: metadata,
                _user_document_updates: userDocumentUpdates,
                _bitcoin_attempts: attempts
              });

              if (atomicError) {
                logger.error('atomic_transaction_failed', {
                  anchorId: anchor.id,
                  txid,
                  blockHeight,
                  error: atomicError.message
                }, atomicError);
                failed++;
                processed++;
                continue;
              }

              // ✅ CANONICAL INTEGRATION: Append anchor event to document_entities.events[]
              // This dual-writes to both legacy tables (above) and canonical events[] (below)
              if (anchor.user_document_id) {
                const docEntity = await resolveDocumentEntity(anchor.user_document_id);
                if (docEntity) {
                  const appendResult = await appendAnchorEventFromEdge(
                    supabaseAdmin,
                    docEntity.documentEntityId,
                    {
                      network: 'bitcoin',
                      witness_hash: docEntity.witnessHash,
                      txid: txid || 'unknown',
                      block_height: blockHeight ?? undefined,
                      confirmed_at: blockData.confirmedAt
                    }
                  );

                  if (appendResult.success) {
                    logger.info('anchor_event_appended', {
                      anchorId: anchor.id,
                      documentEntityId: docEntity.documentEntityId,
                      network: 'bitcoin',
                      txid
                    });
                  } else {
                    // Non-critical: legacy tables are already updated
                    logger.warn('anchor_event_append_failed', {
                      anchorId: anchor.id,
                      documentEntityId: docEntity.documentEntityId,
                      error: appendResult.error
                    });
                  }
                } else {
                  logger.warn('document_entity_not_resolved', {
                    anchorId: anchor.id,
                    userDocumentId: anchor.user_document_id
                  });
                }
              }

              const projectId = await resolveProjectId(anchor);
              if (projectId) {
                const anchorRequestedAt = anchor.created_at || new Date().toISOString();
                const { error: stateError } = await supabaseAdmin
                  .from('anchor_states')
                  .upsert({
                    project_id: projectId,
                    anchor_requested_at: anchorRequestedAt,
                    bitcoin_confirmed_at: confirmedAt,
                  }, { onConflict: 'project_id' });

                if (stateError) {
                  logger.warn('anchor_state_upsert_failed', {
                    anchorId: anchor.id,
                    projectId,
                    error: stateError.message
                  });
                }
              }

              logger.info('anchor_confirmed', {
                anchorId: anchor.id,
                txid,
                blockHeight,
                confirmedAt: blockData.confirmedAt,
                attempts
              });

              // ❌ DEPRECATED: upgrade_protection_level removed (P0.2)
              // Reason: Protection level is DERIVED from events[], not stored state
              // UI already derives correctly via deriveProtectionLevel(events)
              // Persisting levels violates canonical contract: "level is pure function"
              // Contract: docs/contratos/PROTECTION_LEVEL_RULES.md
              // Migration: 20260106150000_deprecate_upgrade_protection_level.sql

              // Send notifications after successful atomic update
              if (anchor.user_document_id) {
                const { data: docData } = await supabaseAdmin
                  .from('user_documents')
                  .select('id, document_name, user_id')
                  .eq('id', anchor.user_document_id)
                  .single();

                if (docData) {
                  const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(docData.user_id);

                  if (!userError && user && user.email && !anchor.notification_sent) {
                    const emailSent = await sendConfirmationEmail(
                      user.email,
                      anchor.document_hash,
                      txid || null,
                      blockHeight || null
                    );

                    if (anchor.user_email && anchor.user_email !== user.email) {
                      await sendConfirmationEmail(
                        anchor.user_email,
                        anchor.document_hash,
                        txid || null,
                        blockHeight || null
                      );
                    }

                    if (emailSent) {
                      await supabaseAdmin
                        .from('anchors')
                        .update({
                          notification_sent: true,
                          notification_sent_at: new Date().toISOString()
                        })
                        .eq('id', anchor.id);

                      console.log(`📧 Sent Bitcoin confirmation email to ${user.email}`);
                    }
                  }
                }
              }

              // Legacy: Send notification for old anchors without user_document_id
              if (!anchor.user_document_id && anchor.user_email && !anchor.notification_sent) {
                const emailSent = await sendConfirmationEmail(
                  anchor.user_email,
                  anchor.document_hash,
                  txid || null,
                  blockHeight || null
                );

                if (emailSent) {
                  await supabaseAdmin
                    .from('anchors')
                    .update({
                      notification_sent: true,
                      notification_sent_at: new Date().toISOString()
                    })
                    .eq('id', anchor.id);
                }
              }

              await insertBitcoinNotification(anchor, txid, blockHeight ?? undefined, blockData.confirmedAt ?? null);
              confirmed++;
              processed++;
              continue;
            }
          }

          // Use atomic transaction to update anchor + user_documents + audit_logs together
          const confirmedAt = new Date().toISOString();
          const otsBytes = base64ToBytes(verification.upgradedProof || anchor.ots_proof);

          const metadata = {
            bitcoin_tx: txid,
            block: blockHeight,
            confirmed_at: confirmedAt,
            calendar_url: anchor.ots_calendar_url
          };

          const userDocumentUpdates = anchor.user_document_id ? {
            document_id: anchor.user_document_id,
            bitcoin_status: 'confirmed',
            bitcoin_confirmed_at: confirmedAt,
            overall_status: 'certified',
            download_enabled: true,
            bitcoin_anchor_id: anchor.id,
            has_bitcoin_anchor: true  // ✅ Set flag when confirmed (conservative truth)
          } : null;

          // Call atomic function
          const { error: atomicError } = await supabaseAdmin.rpc('anchor_atomic_tx', {
            _anchor_id: anchor.id,
            _anchor_user_id: anchor.user_id,
            _ots: otsBytes,
            _metadata: metadata,
            _user_document_updates: userDocumentUpdates,
            _bitcoin_attempts: attempts
          });

          if (atomicError) {
            console.error(`❌ Atomic transaction failed for anchor ${anchor.id}:`, atomicError);
            failed++;
            processed++;
            continue;
          }

          // ✅ CANONICAL INTEGRATION: Append anchor event to document_entities.events[]
          // This dual-writes to both legacy tables (above) and canonical events[] (below)
          if (anchor.user_document_id) {
            const docEntity = await resolveDocumentEntity(anchor.user_document_id);
            if (docEntity) {
              const appendResult = await appendAnchorEventFromEdge(
                supabaseAdmin,
                docEntity.documentEntityId,
                {
                  network: 'bitcoin',
                  witness_hash: docEntity.witnessHash,
                  txid: txid || 'unknown',
                  block_height: blockHeight ?? undefined,
                  confirmed_at: confirmedAt
                }
              );

              if (appendResult.success) {
                logger.info('anchor_event_appended', {
                  anchorId: anchor.id,
                  documentEntityId: docEntity.documentEntityId,
                  network: 'bitcoin',
                  txid
                });
              } else {
                // Non-critical: legacy tables are already updated
                logger.warn('anchor_event_append_failed', {
                  anchorId: anchor.id,
                  documentEntityId: docEntity.documentEntityId,
                  error: appendResult.error
                });
              }
            } else {
              logger.warn('document_entity_not_resolved', {
                anchorId: anchor.id,
                userDocumentId: anchor.user_document_id
              });
            }
          }

          const projectId = await resolveProjectId(anchor);
          if (projectId) {
            const anchorRequestedAt = anchor.created_at || new Date().toISOString();
            const { error: stateError } = await supabaseAdmin
              .from('anchor_states')
              .upsert({
                project_id: projectId,
                anchor_requested_at: anchorRequestedAt,
                bitcoin_confirmed_at: confirmedAt,
              }, { onConflict: 'project_id' });

            if (stateError) {
              logger.warn('anchor_state_upsert_failed', {
                anchorId: anchor.id,
                projectId,
                error: stateError.message
              });
            }
          }

          console.log(`✅ Anchor ${anchor.id} atomically confirmed in Bitcoin!`);

          // ❌ DEPRECATED: upgrade_protection_level removed (P0.2)
          // Reason: Protection level is DERIVED from events[], not stored state
          // UI already derives correctly via deriveProtectionLevel(events)
          // Persisting levels violates canonical contract: "level is pure function"
          // Contract: docs/contratos/PROTECTION_LEVEL_RULES.md
          // Migration: 20260106150000_deprecate_upgrade_protection_level.sql

          // Send notifications after successful atomic update
          if (anchor.user_document_id) {
            const { data: docData } = await supabaseAdmin
              .from('user_documents')
              .select('id, document_name, user_id')
              .eq('id', anchor.user_document_id)
              .single();

            if (docData) {
              const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(docData.user_id);

              if (!userError && user && user.email && !anchor.notification_sent) {
                const emailSent = await sendConfirmationEmail(
                  user.email,
                  anchor.document_hash,
                  txid || null,
                  blockHeight || null
                );

                if (anchor.user_email && anchor.user_email !== user.email) {
                  await sendConfirmationEmail(
                    anchor.user_email,
                    anchor.document_hash,
                    txid || null,
                    blockHeight || null
                  );
                }

                if (emailSent) {
                  await supabaseAdmin
                    .from('anchors')
                    .update({
                      notification_sent: true,
                      notification_sent_at: new Date().toISOString()
                    })
                    .eq('id', anchor.id);

                  console.log(`📧 Sent Bitcoin confirmation email to ${user.email}`);
                }
              }
            }
          }

          // Legacy: Send notification for old anchors without user_document_id
          if (!anchor.user_document_id && anchor.user_email && !anchor.notification_sent) {
            const emailSent = await sendConfirmationEmail(
              anchor.user_email,
              anchor.document_hash,
              txid || null,
              blockHeight || null
            );

            if (emailSent) {
              await supabaseAdmin
                .from('anchors')
                .update({
                  notification_sent: true,
                  notification_sent_at: new Date().toISOString()
                })
                .eq('id', anchor.id);
            }
          }

          await insertBitcoinNotification(anchor, txid, blockHeight ?? undefined, confirmedAt);
          confirmed++;
        } else {
          // Still pending - update status to 'processing' if not already
          logger.debug('anchor_still_verifying', {
            anchorId: anchor.id,
            attempts
          });
          
          await supabaseAdmin
            .from('anchors')
            .update({
              anchor_status: 'processing',
              bitcoin_attempts: attempts,
              updated_at: new Date().toISOString()
            })
            .eq('id', anchor.id);
          waiting++;
        }

        processed++;
      }
    }

    const totalDurationMs = Date.now() - processingStartTime;

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      processed,
      submitted,
      confirmed,
      failed,
      waiting,
      durationMs: totalDurationMs,
      message: `Processed ${processed} anchors: ${submitted} submitted, ${confirmed} confirmed, ${waiting} waiting, ${failed} failed`
    };

    logger.info('process_bitcoin_anchors_completed', summary);
    return jsonResponse(summary);

  } catch (error) {
    logger.error('process_bitcoin_anchors_fatal', {}, error instanceof Error ? error : new Error(String(error)));
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
