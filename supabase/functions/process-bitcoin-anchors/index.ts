/**
 * Background worker to process Bitcoin anchoring via OpenTimestamps
 *
 * This function should be called periodically (e.g., every 5 minutes via cron)
 * to process pending anchor requests
 *
 * Enhanced to support user_documents bitcoin_status tracking
 */

import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { sendResendEmail } from '../_shared/email.ts';
import { Buffer } from 'node:buffer';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const resendApiKey = Deno.env.get('RESEND_API_KEY');
const defaultFrom = Deno.env.get('DEFAULT_FROM') || 'EcoSign <no-reply@mail.ecosign.app>';
const mempoolApiUrl = Deno.env.get('MEMPOOL_API_URL') || 'https://mempool.space/api';

const MAX_VERIFY_ATTEMPTS = 30;
const CONFIRM_WITHOUT_TX_THRESHOLD = 5;

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!supabaseAdmin) {
    return jsonResponse({ error: 'Supabase not configured' }, 500);
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
      .limit(10);

    if (queuedError) {
      console.error('Error fetching queued anchors:', queuedError);
    } else if (queuedAnchors && queuedAnchors.length > 0) {
      console.log(`Found ${queuedAnchors.length} queued anchors to submit`);

      for (const anchor of queuedAnchors) {
        const result = await submitToOpenTimestamps(anchor.document_hash);

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
          console.log(`✅ Submitted anchor ${anchor.id}`);
        } else {
          await supabaseAdmin
            .from('anchors')
            .update({
              anchor_status: 'failed',
              error_message: result.error,
              updated_at: new Date().toISOString()
            })
            .eq('id', anchor.id);

          failed++;
          console.log(`❌ Failed to submit anchor ${anchor.id}: ${result.error}`);
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
      console.error('Error fetching pending anchors:', pendingError);
    } else if (pendingAnchors && pendingAnchors.length > 0) {
      console.log(`Checking ${pendingAnchors.length} pending anchors for confirmation`);

      for (const anchor of pendingAnchors) {
        if (!anchor.ots_proof || !anchor.ots_calendar_url) {
          continue;
        }

        const attempts = (anchor.bitcoin_attempts ?? 0) + 1;

        if (attempts > MAX_VERIFY_ATTEMPTS) {
          await supabaseAdmin
            .from('anchors')
            .update({
              anchor_status: 'failed',
              bitcoin_error_message: 'Max verification attempts reached',
              bitcoin_attempts: attempts,
              updated_at: new Date().toISOString()
            })
            .eq('id', anchor.id);
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
              // Prefer on-chain confirmation time
              const confirmedAt = blockData.confirmedAt;
              // Update below
              const updatedAt = confirmedAt;
              // Update anchor record (without txid/blockheight yet)
              await supabaseAdmin
                .from('anchors')
                .update({
                  anchor_status: 'confirmed',
                  bitcoin_tx_id: txid,
                  bitcoin_block_height: blockHeight ?? null,
                  ots_proof: verification.upgradedProof || anchor.ots_proof,
                  bitcoin_attempts: attempts,
                  confirmed_at: confirmedAt,
                  updated_at: updatedAt
                })
                .eq('id', anchor.id);

              // Update user_documents if this anchor is linked
              if (anchor.user_document_id) {
                console.log(`📝 Updating user_documents record ${anchor.user_document_id}`);

                const { data: docUpdate, error: docUpdateError } = await supabaseAdmin
                  .from('user_documents')
                  .update({
                    bitcoin_status: 'confirmed',
                    bitcoin_confirmed_at: confirmedAt,
                    overall_status: 'certified',
                    download_enabled: true,
                    updated_at: confirmedAt
                  })
                  .eq('id', anchor.user_document_id)
                  .eq('bitcoin_anchor_id', anchor.id)
                  .select('id, document_name, user_id')
                  .single();

                if (docUpdateError) {
                  console.error(`❌ Failed to update user_documents: ${docUpdateError.message}`);
                } else if (docUpdate) {
                  console.log(`✅ Updated user_documents ${docUpdate.id}, download now enabled`);

                  // Get user info for email
                  const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(docUpdate.user_id);

                  // Notify document owner
                  if (!userError && user && user.email && !anchor.notification_sent) {
                    const emailSent = await sendConfirmationEmail(
                      user.email,
                      anchor.document_hash,
                      txid || null,
                      blockHeight || null
                    );

                    // Also notify signer if provided in anchor.user_email (optional)
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

              // Legacy: Send notification email for old anchors table entries
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
              console.log(`✅ Anchor ${anchor.id} confirmed in Bitcoin!`);
              processed++;
              continue;
            }
          }

          const confirmedAt = new Date().toISOString();

          // Update anchor record (without txid/blockheight yet)
          await supabaseAdmin
            .from('anchors')
            .update({
              anchor_status: 'confirmed',
              bitcoin_tx_id: txid,
              bitcoin_block_height: blockHeight,
              ots_proof: verification.upgradedProof || anchor.ots_proof,
              bitcoin_attempts: attempts,
              confirmed_at: confirmedAt,
              updated_at: confirmedAt
            })
            .eq('id', anchor.id);

          // Update user_documents if this anchor is linked
          if (anchor.user_document_id) {
            console.log(`📝 Updating user_documents record ${anchor.user_document_id}`);

            const { data: docUpdate, error: docUpdateError } = await supabaseAdmin
              .from('user_documents')
              .update({
                bitcoin_status: 'confirmed',
                bitcoin_confirmed_at: confirmedAt,
                overall_status: 'certified',
                download_enabled: true,
                updated_at: confirmedAt
              })
              .eq('id', anchor.user_document_id)
              .eq('bitcoin_anchor_id', anchor.id)
              .select('id, document_name, user_id')
              .single();

            if (docUpdateError) {
              console.error(`❌ Failed to update user_documents: ${docUpdateError.message}`);
            } else if (docUpdate) {
              console.log(`✅ Updated user_documents ${docUpdate.id}, download now enabled`);

              // Get user info for email
              const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(docUpdate.user_id);

              // Notify document owner
              if (!userError && user && user.email && !anchor.notification_sent) {
                const emailSent = await sendConfirmationEmail(
                  user.email,
                  anchor.document_hash,
                  txid || null,
                  blockHeight || null
                );

                // Also notify signer if provided in anchor.user_email (optional)
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

          // Legacy: Send notification email for old anchors table entries
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

          confirmed++;
          console.log(`✅ Anchor ${anchor.id} confirmed in Bitcoin!`);
          await insertBitcoinNotification(anchor, txid, blockHeight ?? undefined, confirmedAt);
        } else {
          // Still pending - update status to 'processing' if not already
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
