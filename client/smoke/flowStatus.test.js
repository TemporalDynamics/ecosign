import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { transformSync } from 'esbuild';

const loadFlowStatus = async () => {
  const source = fs.readFileSync(new URL('../src/lib/flowStatus.ts', import.meta.url), 'utf8');
  const { code } = transformSync(source, { loader: 'ts', format: 'esm' });
  const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(code)}`;
  return import(moduleUrl);
};

test('flowStatus: protegido gana sobre firmado si hay TSA', async () => {
  const { deriveFlowStatus } = await loadFlowStatus();
  const doc = {
    status: 'signed',
    events: [{ kind: 'tsa.confirmed', at: '2026-01-10T12:00:00Z' }],
  };
  assert.strictEqual(deriveFlowStatus(doc).key, 'protected');
});

test('flowStatus: draft explícito queda en borrador', async () => {
  const { deriveFlowStatus } = await loadFlowStatus();
  const doc = { status: 'draft' };
  assert.strictEqual(deriveFlowStatus(doc).key, 'draft');
});

test('flowStatus: en firma si hay firmantes pendientes', async () => {
  const { deriveFlowStatus } = await loadFlowStatus();
  const doc = {
    status: 'in_signature_flow',
    signer_links: [{ status: 'pending' }, { status: 'sent' }],
  };
  assert.strictEqual(deriveFlowStatus(doc).key, 'signing');
});

test('flowStatus: protegido si hay tsa.confirmed en events', async () => {
  const { deriveFlowStatus } = await loadFlowStatus();
  const doc = { events: [{ kind: 'tsa.confirmed', at: '2026-01-10T12:00:00Z' }] };
  assert.strictEqual(deriveFlowStatus(doc).key, 'protected');
});
