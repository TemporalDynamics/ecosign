import test from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const loadFlowStatus = async () => {
  const entryPoint = fileURLToPath(new URL('../src/lib/flowStatus.ts', import.meta.url));
  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    target: 'es2020',
  });
  const code = result.outputFiles?.[0]?.text ?? '';
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
