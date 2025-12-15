import test from 'node:test';
import assert from 'node:assert';
import { createHash, webcrypto } from 'node:crypto';
import fs from 'node:fs';

import parser from '../node_modules/@babel/parser/lib/index.js';
import { verifyTSRToken } from '../src/lib/tsrVerifier.js';

// Helper similar al usado en DocumentsPage (hash binario → hex)
async function computeHashHex(buffer) {
  const hashBuffer = await webcrypto.subtle.digest('SHA-256', buffer);
  return Buffer.from(hashBuffer).toString('hex');
}

// Política de override: pending → cancelled + descarga habilitada
function overridePendingDoc(doc) {
  if (doc?.bitcoin_status === 'pending') {
    return { ...doc, bitcoin_status: 'cancelled', download_enabled: true };
  }
  return doc;
}

// Simula guard clause del worker: anchors cancelados no se procesan
function shouldSkipBitcoin(userDoc) {
  return userDoc?.bitcoin_status === 'cancelled';
}

test('SHA-256 hashing estable', async () => {
  const expected = createHash('sha256').update('EcoSign').digest('hex');
  const viaWebcrypto = await computeHashHex(new TextEncoder().encode('EcoSign'));
  assert.strictEqual(viaWebcrypto, expected);
});

test('computeHashHex diferencia match/mismatch', async () => {
  const okHash = await computeHashHex(new TextEncoder().encode('abc'));
  const badHash = await computeHashHex(new TextEncoder().encode('abcd'));
  assert.notStrictEqual(okHash, badHash);
});

test('override pending → cancelled habilita descarga', () => {
  const updated = overridePendingDoc({ id: 1, bitcoin_status: 'pending', download_enabled: false });
  assert.strictEqual(updated.bitcoin_status, 'cancelled');
  assert.strictEqual(updated.download_enabled, true);
});

test('worker policy saltea documentos cancelados', () => {
  assert.strictEqual(shouldSkipBitcoin({ bitcoin_status: 'cancelled' }), true);
  assert.strictEqual(shouldSkipBitcoin({ bitcoin_status: 'pending' }), false);
});

test('tsrVerifier rechaza tokens no DER', async () => {
  await assert.rejects(
    () => verifyTSRToken(Buffer.from('abc').toString('base64'), 'deadbeef'),
    /No se pudo parsear el token TSR|La respuesta TSA no trae token|SignedData/
  );
});

test('LegalCenterModal parsea sin errores de sintaxis', () => {
  const code = fs.readFileSync(new URL('../src/components/LegalCenterModal.jsx', import.meta.url), 'utf8');
  assert.doesNotThrow(() => {
    parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  });
});
