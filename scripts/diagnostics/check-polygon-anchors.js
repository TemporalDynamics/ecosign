#!/usr/bin/env node
/**
 * Diagnóstico rápido del flujo de anclaje en Polygon.
 * Uso:
 *   node scripts/check-polygon-anchors.js           # últimos anchors (Polygon)
 *   node scripts/check-polygon-anchors.js --pending # solo pending/processing
 *   node scripts/check-polygon-anchors.js --failed  # solo failed
 *   node scripts/check-polygon-anchors.js --tx <hash>  # consulta receipt en RPC
 *
 * Requiere env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   POLYGON_RPC_URL (o ALCHEMY_RPC_URL) para consultar receipts (opcional)
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RPC_URL = process.env.POLYGON_RPC_URL || process.env.ALCHEMY_RPC_URL || null;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const args = process.argv.slice(2);
const hasFlag = (f) => args.includes(f);
const txIndex = args.findIndex((a) => a === '--tx');
const txHashArg = txIndex !== -1 ? args[txIndex + 1] : null;
const filter = hasFlag('--pending') ? 'pending' : hasFlag('--failed') ? 'failed' : null;

async function fetchAnchors(kind) {
  let query = supabase
    .from('anchors')
    .select('*')
    .eq('anchor_type', 'polygon')
    .order('created_at', { ascending: false })
    .limit(50);

  if (kind === 'pending') {
    query = query.or('polygon_status.eq.pending,anchor_status.eq.pending,polygon_status.eq.processing,anchor_status.eq.processing');
  }
  if (kind === 'failed') {
    query = query.or('polygon_status.eq.failed,anchor_status.eq.failed');
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getReceipt(txHash) {
  if (!RPC_URL) {
    console.log('No hay RPC configurado para Polygon. Exporta POLYGON_RPC_URL o ALCHEMY_RPC_URL.');
    return null;
  }
  const payload = {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_getTransactionReceipt',
    params: [txHash],
  };
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`RPC error ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.error) {
    throw new Error(json.error.message || 'RPC returned error');
  }
  return json.result || null;
}

async function main() {
  if (txHashArg) {
    console.log(`🔎 Buscando receipt para tx ${txHashArg}`);
    const receipt = await getReceipt(txHashArg);
    if (!receipt) {
      console.log('No hay receipt (pending o tx inexistente).');
      return;
    }
    console.log({
      status: parseInt(receipt.status, 16),
      blockNumber: parseInt(receipt.blockNumber, 16),
      blockHash: receipt.blockHash,
      gasUsed: parseInt(receipt.gasUsed, 16),
      effectiveGasPrice: receipt.effectiveGasPrice ? parseInt(receipt.effectiveGasPrice, 16) : null,
      transactionIndex: parseInt(receipt.transactionIndex, 16),
    });
    return;
  }

  console.log('🔗 Consultando anchors Polygon', filter ? `(filtro: ${filter})` : '');
  const anchors = await fetchAnchors(filter);
  if (!anchors.length) {
    console.log('No hay anchors para mostrar con este filtro.');
    return;
  }

  for (const a of anchors) {
    console.log('---');
    console.log({
      id: a.id,
      doc: a.user_document_id || a.document_id,
      status: a.anchor_status || a.polygon_status,
      polygon_status: a.polygon_status,
      attempts: a.polygon_attempts,
      txHash: a.polygon_tx_hash || a?.metadata?.txHash,
      updated_at: a.updated_at,
      created_at: a.created_at,
      error: a.polygon_error_message,
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
