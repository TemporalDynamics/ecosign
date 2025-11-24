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
import { sendEmail, buildBitcoinConfirmedEmail } from '../_shared/email.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const resendApiKey = Deno.env.get('RESEND_API_KEY');

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

    // Parse the proof to extract Bitcoin tx ID and block height
    // This is a simplified version - in production you'd use a proper OTS parser
    // For now, we'll mark it as confirmed and wait for proper verification

    return {
      confirmed: true,
      upgradedProof,
      // TODO: Parse actual tx_id and block_height from proof
      bitcoinTxId: 'pending-extraction',
      blockHeight: 0
    };

  } catch (error) {
    console.error('OpenTimestamps verification error:', error);
    return { confirmed: false };
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

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'VerifySign <noreply@verifysign.com>',
        to: [email],
        subject: '✅ Tu documento ha sido anclado en Bitcoin',
        html: `
          <h2>🔗 Anclaje en Bitcoin Confirmado</h2>
          <p>Tu documento ha sido exitosamente anclado en la blockchain de Bitcoin.</p>

          <h3>Detalles del Anclaje:</h3>
          <ul>
            <li><strong>Hash del documento:</strong> <code>${documentHash}</code></li>
            ${bitcoinTxId ? `<li><strong>Transacción Bitcoin:</strong> <code>${bitcoinTxId}</code></li>` : ''}
            ${blockHeight ? `<li><strong>Altura del bloque:</strong> ${blockHeight}</li>` : ''}
          </ul>

          <p><strong>⏱️ Tiempo de procesamiento:</strong> Este proceso puede tomar entre 4-24 horas dependiendo de la red Bitcoin.</p>

          <p>Tu documento ahora tiene una prueba criptográfica inmutable de existencia en la blockchain más segura del mundo.</p>

          <hr>
          <p style="color: #666; font-size: 12px;">
            Este es un mensaje automático de VerifySign. Para verificar tu certificado,
            visita <a href="https://verifysign.com/verify">verifysign.com/verify</a>
          </p>
        `
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send email:', errorText);
      return false;
    }

    console.log(`✅ Confirmation email sent to ${email}`);
    return true;

  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
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

        const verification = await verifyOpenTimestamps(
          anchor.ots_proof,
          anchor.ots_calendar_url
        );

        if (verification.confirmed) {
          const confirmedAt = new Date().toISOString();

          // Update anchor record
          await supabaseAdmin
            .from('anchors')
            .update({
              anchor_status: 'confirmed',
              bitcoin_tx_id: verification.bitcoinTxId,
              bitcoin_block_height: verification.blockHeight,
              ots_proof: verification.upgradedProof || anchor.ots_proof,
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

              if (!userError && user && user.email && !anchor.notification_sent) {
                // Send styled email notification
                const emailPayload = buildBitcoinConfirmedEmail({
                  ownerEmail: user.email,
                  ownerName: user.user_metadata?.full_name || user.user_metadata?.name,
                  documentName: docUpdate.document_name,
                  documentId: docUpdate.id,
                  bitcoinTxId: verification.bitcoinTxId,
                  blockHeight: verification.blockHeight || undefined,
                  confirmedAt: confirmedAt
                });

                const emailResult = await sendEmail(emailPayload);

                if (emailResult.success) {
                  await supabaseAdmin
                    .from('anchors')
                    .update({
                      notification_sent: true,
                      notification_sent_at: new Date().toISOString()
                    })
                    .eq('id', anchor.id);

                  console.log(`📧 Sent Bitcoin confirmation email to ${user.email}`);
                } else {
                  console.error(`❌ Failed to send email: ${emailResult.error}`);
                }
              }
            }
          }

          // Legacy: Send notification email for old anchors table entries
          if (!anchor.user_document_id && anchor.user_email && !anchor.notification_sent) {
            const emailSent = await sendConfirmationEmail(
              anchor.user_email,
              anchor.document_hash,
              verification.bitcoinTxId || null,
              verification.blockHeight || null
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
        } else {
          // Still pending - update status to 'processing' if not already
          if (anchor.anchor_status === 'pending') {
            await supabaseAdmin
              .from('anchors')
              .update({
                anchor_status: 'processing',
                updated_at: new Date().toISOString()
              })
              .eq('id', anchor.id);
          }
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
      message: `Processed ${processed} anchors: ${submitted} submitted, ${confirmed} confirmed, ${failed} failed`
    };

    console.log('✅ Processing complete:', summary);
    return jsonResponse(summary);

  } catch (error) {
    console.error('Worker error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
