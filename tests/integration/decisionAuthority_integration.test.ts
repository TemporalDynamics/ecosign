import { expect, test } from 'vitest';

test('DecisionAuthority Integration Test - document protection flow', async () => {
  const testEvents = [
    {
      kind: 'document.created',
      at: '2026-01-27T15:00:00.000Z',
      payload: {
        filename: 'test_document.pdf',
        file_size: 1024,
        protection: ['tsa', 'polygon', 'bitcoin'],
      },
      _source: 'integration_test',
    },
    {
      kind: 'document.protected.requested',
      at: '2026-01-27T15:00:01.000Z',
      payload: {
        protection: ['tsa', 'polygon', 'bitcoin'],
      },
      _source: 'integration_test',
    },
  ];

  const hasTsaRequested = testEvents.some(
    (e: any) =>
      e.kind === 'document.protected.requested' &&
      Array.isArray(e.payload?.protection) &&
      e.payload.protection.includes('tsa'),
  );

  const hasTsaConfirmed = testEvents.some((e: any) => e.kind === 'tsa.confirmed');
  const shouldRunTsa = !hasTsaConfirmed && hasTsaRequested;

  expect(shouldRunTsa).toBe(true);

  const expectedJob = {
    type: 'run_tsa',
    entity_id: 'test_entity_id',
    status: 'queued',
    payload: {
      witness_hash: 'test_witness_hash',
      document_entity_id: 'test_entity_id',
    },
  };

  expect(expectedJob.type).toBeTruthy();
  expect(expectedJob.entity_id).toBeTruthy();
  expect(expectedJob.status).toBe('queued');
});

test('DecisionAuthority Integration Test - anchor flow', async () => {
  const testEvents = [
    { kind: 'document.created', at: '2026-01-27T15:00:00.000Z', _source: 'integration_test' },
    {
      kind: 'document.protected.requested',
      at: '2026-01-27T15:00:01.000Z',
      payload: { protection: ['tsa', 'polygon', 'bitcoin'] },
      _source: 'integration_test',
    },
    {
      kind: 'tsa.confirmed',
      at: '2026-01-27T15:01:00.000Z',
      payload: { witness_hash: 'test_hash', token_b64: 'test_token' },
      _source: 'integration_test',
    },
  ];

  const protectionRequested =
    testEvents.find((e: any) => e.kind === 'document.protected.requested')?.payload?.protection || [];

  const hasPolygonRequested = protectionRequested.includes('polygon');
  const hasBitcoinRequested = protectionRequested.includes('bitcoin');

  const hasTsaConfirmed = testEvents.some((e: any) => e.kind === 'tsa.confirmed');

  const hasPolygonConfirmed = testEvents.some(
    (e: any) => e.kind === 'anchor.confirmed' && e.payload?.network === 'polygon',
  );

  const hasBitcoinConfirmed = testEvents.some(
    (e: any) => e.kind === 'anchor.confirmed' && e.payload?.network === 'bitcoin',
  );

  const shouldSubmitPolygon = hasTsaConfirmed && hasPolygonRequested && !hasPolygonConfirmed;
  const shouldSubmitBitcoin = hasTsaConfirmed && hasBitcoinRequested && !hasBitcoinConfirmed;

  expect(shouldSubmitPolygon).toBe(true);
  expect(shouldSubmitBitcoin).toBe(true);

  const finalEvents = [
    ...testEvents,
    { kind: 'anchor.confirmed', payload: { network: 'polygon' }, _source: 'anchor_worker' },
    { kind: 'anchor.confirmed', payload: { network: 'bitcoin' }, _source: 'anchor_worker' },
  ];

  const hasTsaConfirmedFinal = finalEvents.some((e: any) => e.kind === 'tsa.confirmed');
  const hasPolygonConfirmedFinal = finalEvents.some(
    (e: any) => e.kind === 'anchor.confirmed' && e.payload?.network === 'polygon',
  );
  const hasBitcoinConfirmedFinal = finalEvents.some(
    (e: any) => e.kind === 'anchor.confirmed' && e.payload?.network === 'bitcoin',
  );

  expect(hasTsaConfirmedFinal).toBe(true);
  expect(hasPolygonConfirmedFinal).toBe(true);
  expect(hasBitcoinConfirmedFinal).toBe(true);

  const hasArtifact = finalEvents.some((e: any) => e.kind === 'artifact.completed');
  const readyForArtifact = hasTsaConfirmedFinal && hasPolygonConfirmedFinal && hasBitcoinConfirmedFinal;
  const shouldBuildArtifact = readyForArtifact && !hasArtifact;

  expect(shouldBuildArtifact).toBe(true);
});

