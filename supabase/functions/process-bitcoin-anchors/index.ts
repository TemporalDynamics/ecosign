// Background worker to process Bitcoin anchoring via OpenTimestamps
// This function should be called periodically (e.g., every 5 minutes via cron)
// Enhanced to support canonical anchor state tracking

import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { sendResendEmail } from '../_shared/email.ts';
import { appendEvent } from '../_shared/eventHelper.ts';
import { requireInternalAuth } from '../_shared/internalAuth.ts';
import { Buffer } from 'node:buffer';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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
// Alert threshold: warn at 20 hours (240 attempts)
const ALERT_THRESHOLD = 240;
const BITCOIN_TIMEOUT_HOURS = 24;

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

const getAnchorStage = (anchor: any): string =>
  typeof anchor?.metadata?.anchor_stage === 'string' ? anchor.metadata.anchor_stage : 'initial';

const getStepIndex = (anchor: any): number => {
  const raw = anchor?.metadata?.step_index;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

async function emitAnchorConfirmedEvent(
  anchor: any,
  txid: string | null,
  blockHeight: number | null,
  confirmedAt: string,
) {
  if (!supabaseAdmin || !anchor.document_entity_id) {
    console.warn(`⚠️ No document_entity_id for anchor ${anchor.id}, cannot emit canonical event`);
    return;
  }

  try {
    await appendEvent(supabaseAdmin as any, anchor.document_entity_id, {
      kind: 'anchor.confirmed',
      at: confirmedAt,
      anchor: {
        network: 'bitcoin',
        witness_hash: anchor.document_hash,
        txid,
        block_height: blockHeight,
        confirmed_at: confirmedAt,
        anchor_stage: getAnchorStage(anchor),
        step_index: getStepIndex(anchor),
        provider: 'opentimestamps',
      }
    }, 'process-bitcoin-anchors');
    console.log(`✅ Emitted anchor.confirmed for document_entity ${anchor.document_entity_id}`);
  } catch (eventError) {
    console.error('Failed to emit anchor.confirmed event:', eventError);
  }
}

async function emitAnchorTimeoutEvent(
  anchor: any,
  reason: string,
  attempts: number,
) {
  if (!supabaseAdmin || !anchor.document_entity_id) return;

  const nowIso = new Date().toISOString();
  const anchorStage = getAnchorStage(anchor);
  const stepIndex = getStepIndex(anchor);
  const basePayload = {
    network: 'bitcoin',
    witness_hash: anchor.document_hash,
    reason,
    attempt: attempts,
    max_attempts: MAX_VERIFY_ATTEMPTS,
    timeout_hours: BITCOIN_TIMEOUT_HOURS,
    provider: 'opentimestamps',
    anchor_stage: anchorStage,
    step_index: stepIndex,
  };

  try {
    await appendEvent(supabaseAdmin as any, anchor.document_entity_id, {
      kind: 'anchor.timeout',
      at: nowIso,
      anchor: {
        ...basePayload,
        retryable: true,
      }
    }, 'process-bitcoin-anchors');
    console.log(`✅ Emitted anchor.timeout for document_entity ${anchor.document_entity_id}`);
  } catch (eventError) {
    console.error('Failed to emit anchor.timeout event:', eventError);
  }

  try {
    await appendEvent(supabaseAdmin as any, anchor.document_entity_id, {
      kind: 'anchor.failed',
      at: nowIso,
      anchor: {
        ...basePayload,
        retryable: true,
        failure_code: 'timeout',
      }
    }, 'process-bitcoin-anchors');
    console.log(`✅ Emitted anchor.failed(timeout) for document_entity ${anchor.document_entity_id}`);
  } catch (eventError) {
    console.error('Failed to emit anchor.failed(timeout) event:', eventError);
  }
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
    <p style="color: #666; font-size: 12px;">Mensaje automático de VerifySign.</p>
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

async function notifyAnchorConfirmed(
  anchor: any,
  txid: string | null,
  blockHeight: number | null,
) {
  if (!supabaseAdmin || anchor.notification_sent) return;

  const recipients = new Set<string>();
  if (typeof anchor.user_email === 'string' && anchor.user_email.trim().length > 0) {
    recipients.add(anchor.user_email.trim());
  }

  if (anchor.user_id) {
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(anchor.user_id);
    if (!userError && userData?.user?.email) {
      recipients.add(userData.user.email);
    }
  }

  if (recipients.size === 0) return;

  let success = false;
  for (const email of recipients) {
    const sent = await sendConfirmationEmail(
      email,
      anchor.document_hash,
      txid,
      blockHeight,
    );
    success = success || sent;
  }

  if (success) {
    await supabaseAdmin
      .from('anchors')
      .update({
        notification_sent: true,
        notification_sent_at: new Date().toISOString(),
      })
      .eq('id', anchor.id);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const auth = requireInternalAuth(req, { allowCronSecret: true });
  if (!auth.ok) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  if (!supabaseAdmin) {
    return jsonResponse({ error: 'Supabase not configured' }, 500);
  }

  // Heartbeat: mark worker as alive
  try {
    await supabaseAdmin.rpc('worker_heartbeat', { worker_name: 'process-bitcoin-anchors' })
  } catch (e) {
    console.warn('Failed to update heartbeat:', e)
  }

  try {
    console.log('🔄 Processing Bitcoin anchor queue...');

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
      .limit(50);

    if (queuedError) {
      console.error('Error fetching queued anchors:', queuedError);
    } else if (queuedAnchors && queuedAnchors.length > 0) {
      console.log(`Found ${queuedAnchors.length} queued anchors to submit`);

      for (const anchor of queuedAnchors) {
        const result = await submitToOpenTimestamps(anchor.document_hash);

        if (result.success) {
          const { error: updateSubmittedError } = await supabaseAdmin
            .from('anchors')
            .update({
              anchor_status: 'pending',
              ots_proof: result.otsProof,
              ots_calendar_url: result.calendarUrl,
              updated_at: new Date().toISOString()
            })
            .eq('id', anchor.id);
          if (updateSubmittedError) {
            throw new Error(`Failed to set pending for anchor ${anchor.id}: ${updateSubmittedError.message}`);
          }

          submitted++;
          console.log(`✅ Submitted anchor ${anchor.id}`);
        } else {
          const { error: updateFailedSubmitError } = await supabaseAdmin
            .from('anchors')
            .update({
              anchor_status: 'failed',
              error_message: result.error,
              updated_at: new Date().toISOString()
            })
            .eq('id', anchor.id);
          if (updateFailedSubmitError) {
            throw new Error(`Failed to set failed(submit) for anchor ${anchor.id}: ${updateFailedSubmitError.message}`);
          }

          failed++;
          console.log(`❌ Failed to submit anchor ${anchor.id}: ${result.error}`);
        }

        processed++;
      }
    }

    // STEP 2: Check pending anchors for confirmation
    // Fairness/throughput:
    // - Prioritize anchors with fewer attempts first to avoid starvation.
    // - Then process the least recently updated first.
    // - Larger batch to reduce backlog drain time.
    const { data: pendingAnchors, error: pendingError } = await supabaseAdmin
      .from('anchors')
      .select('*')
      .in('anchor_status', ['pending', 'processing'])
      .order('bitcoin_attempts', { ascending: true })
      .order('updated_at', { ascending: true })
      .limit(100);

    if (pendingError) {
      console.error('Error fetching pending anchors:', pendingError);
    } else if (pendingAnchors && pendingAnchors.length > 0) {
      console.log(`Checking ${pendingAnchors.length} pending anchors for confirmation`);

      for (const anchor of pendingAnchors) {
        if (!anchor.ots_proof || !anchor.ots_calendar_url) {
          continue;
        }

        const attempts = (anchor.bitcoin_attempts ?? 0) + 1;

        // Alert when approaching timeout (20 hours)
        if (attempts > ALERT_THRESHOLD && attempts <= MAX_VERIFY_ATTEMPTS) {
          const hoursElapsed = (attempts * 5) / 60;
          console.warn(`⚠️ Anchor ${anchor.id} has been pending for ${hoursElapsed.toFixed(1)} hours (${attempts}/${MAX_VERIFY_ATTEMPTS} attempts)`);
        }

        if (attempts > MAX_VERIFY_ATTEMPTS) {
          const errorMessage = `Bitcoin verification timeout after ${BITCOIN_TIMEOUT_HOURS} hours (${attempts} attempts). OpenTimestamps may still confirm later - you can retry verification manually.`;
          console.error(`❌ ${errorMessage} - Anchor ID: ${anchor.id}`);

          // Marcar anchor de Bitcoin como failed
          const { error: timeoutFailedError } = await supabaseAdmin
            .from('anchors')
            .update({
              anchor_status: 'failed',
              bitcoin_error_message: errorMessage,
              bitcoin_attempts: attempts,
              updated_at: new Date().toISOString()
            })
            .eq('id', anchor.id);
          if (timeoutFailedError) {
            throw new Error(`Failed to set failed(timeout) for anchor ${anchor.id}: ${timeoutFailedError.message}`);
          }

          await emitAnchorTimeoutEvent(anchor, errorMessage, attempts);

          // NOTE: legacy projection updates removed; canonical events are the source of truth.
          // Legacy updates removed to ensure single source of truth in events[]

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
              // Update anchor directly (projection side effects are derived from canonical state).
              const confirmedAt = blockData.confirmedAt;
              
              const metadata = {
                bitcoin_tx: txid,
                block: blockHeight,
                confirmed_at: confirmedAt,
                calendar_url: anchor.ots_calendar_url
              };

              const { error: updateConfirmedFastError } = await supabaseAdmin
                .from('anchors')
                .update({
                  bitcoin_tx_id: txid ?? anchor.bitcoin_tx_id,
                  bitcoin_block_height: blockHeight ?? anchor.bitcoin_block_height,
                  anchor_status: 'confirmed',
                  ots_proof: verification.upgradedProof || anchor.ots_proof,
                  metadata: { ...anchor.metadata, ...metadata },
                  bitcoin_attempts: attempts,
                  confirmed_at: confirmedAt,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', anchor.id);
              if (updateConfirmedFastError) {
                throw new Error(`Failed to set confirmed(fast) for anchor ${anchor.id}: ${updateConfirmedFastError.message}`);
              }

              console.log(`✅ Anchor ${anchor.id} confirmed in Bitcoin!`);
              await emitAnchorConfirmedEvent(anchor, txid || null, blockHeight || null, confirmedAt);
              await notifyAnchorConfirmed(anchor, txid || null, blockHeight || null);
              await insertBitcoinNotification(anchor, txid, blockHeight ?? undefined, blockData.confirmedAt ?? null);
              confirmed++;
              processed++;
              continue;
            }
          }

          // Update anchor record only (projection side effects are derived from canonical state).
          const confirmedAt = new Date().toISOString();
          const metadata = {
            bitcoin_tx: txid,
            block: blockHeight,
            confirmed_at: confirmedAt,
            calendar_url: anchor.ots_calendar_url
          };

          // Update anchor directly; projection stays derived from canonical authority.
          const { error: updateConfirmedError } = await supabaseAdmin
            .from('anchors')
            .update({
              bitcoin_tx_id: txid ?? anchor.bitcoin_tx_id,
              bitcoin_block_height: blockHeight ?? anchor.bitcoin_block_height,
              anchor_status: 'confirmed',
              ots_proof: verification.upgradedProof || anchor.ots_proof,
              metadata: { ...anchor.metadata, ...metadata },
              bitcoin_attempts: attempts,
              confirmed_at: confirmedAt,
              updated_at: new Date().toISOString(),
            })
            .eq('id', anchor.id);
          if (updateConfirmedError) {
            throw new Error(`Failed to set confirmed for anchor ${anchor.id}: ${updateConfirmedError.message}`);
          }

          console.log(`✅ Anchor ${anchor.id} confirmed in Bitcoin!`);
          await emitAnchorConfirmedEvent(anchor, txid || null, blockHeight || null, confirmedAt);
          await notifyAnchorConfirmed(anchor, txid || null, blockHeight || null);

          await insertBitcoinNotification(anchor, txid, blockHeight ?? undefined, confirmedAt);
          confirmed++;
        } else {
          // Still pending - update status to 'processing' if not already
          const { error: updateProcessingError } = await supabaseAdmin
            .from('anchors')
            .update({
              anchor_status: 'processing',
              bitcoin_attempts: attempts,
              updated_at: new Date().toISOString()
            })
            .eq('id', anchor.id);
          if (updateProcessingError) {
            throw new Error(`Failed to set processing for anchor ${anchor.id}: ${updateProcessingError.message}`);
          }
          waiting++;
        }

        processed++;
      }
    }

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      processed,
      submitted,
      confirmed,
      failed,
      waiting,
      message: `Processed ${processed} anchors: ${submitted} submitted, ${confirmed} confirmed, ${waiting} waiting, ${failed} failed`
    };

    console.log('✅ Processing complete:', summary);
    return jsonResponse(summary);

  } catch (error) {
    console.error('Worker error:', error);
    // Mark worker as stalled on fatal error
    try {
      await supabaseAdmin.rpc('worker_heartbeat', { 
        worker_name: 'process-bitcoin-anchors',
        worker_status: 'stalled'
      })
    } catch (e) {
      console.warn('Failed to update heartbeat:', e)
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
