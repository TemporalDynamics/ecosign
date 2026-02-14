import { describe, it, expect } from 'vitest';
import { deriveDocumentState, formatSignersForTooltip } from './deriveDocumentState';
import type { DocumentEntityRow } from './eco/v2';
import type { SimpleWorkflow, SimpleSigner } from './deriveDocumentState';

function createDocument(overrides?: Partial<DocumentEntityRow>): DocumentEntityRow {
  return {
    id: 'doc-1',
    user_id: 'user-1',
    source_hash: 'hash123',
    lifecycle_status: 'protected',
    custody_mode: 'hash_only',
    events: [],
    created_at: new Date().toISOString(),
    ...overrides
  } as DocumentEntityRow;
}

function createWorkflow(status: SimpleWorkflow['status']): SimpleWorkflow {
  return { id: 'workflow-1', status };
}

function createSigner(order: number, status: SimpleSigner['status'], name?: string): SimpleSigner {
  return {
    id: `signer-${order}`,
    order,
    status,
    name: name ?? null,
    email: `signer${order}@example.com`
  };
}

describe('deriveDocumentState', () => {
  it('2/2 firmado -> Firmado (gris)', () => {
    const state = deriveDocumentState(
      createDocument(),
      [createWorkflow('completed')],
      [createSigner(1, 'signed'), createSigner(2, 'signed')]
    );
    expect(state).toEqual({ label: 'Firmado', phase: 'gray' });
  });

  it('1/2 firmado -> Firmando 1/2 (verde)', () => {
    const state = deriveDocumentState(
      createDocument(),
      [createWorkflow('active')],
      [createSigner(1, 'signed'), createSigner(2, 'ready')]
    );
    expect(state).toEqual({ label: 'Firmando 1/2', phase: 'green' });
  });

  it('workflow rejected -> Rechazado (gris)', () => {
    const state = deriveDocumentState(
      createDocument(),
      [createWorkflow('rejected')],
      [createSigner(1, 'rejected')]
    );
    expect(state).toEqual({ label: 'Rechazado', phase: 'gray' });
  });

  it('workflow active + signer rejected -> Rechazado (gris) (fallback defensivo)', () => {
    const state = deriveDocumentState(
      createDocument(),
      [createWorkflow('active')],
      [createSigner(1, 'rejected')]
    );
    expect(state).toEqual({ label: 'Rechazado', phase: 'gray' });
  });

  it('workflow cancelled -> Cancelado (gris)', () => {
    const state = deriveDocumentState(
      createDocument(),
      [createWorkflow('cancelled')],
      [createSigner(1, 'cancelled')]
    );
    expect(state).toEqual({ label: 'Cancelado', phase: 'gray' });
  });

  it('sin workflow y sin TSA -> Protegiendo (azul)', () => {
    const state = deriveDocumentState(createDocument({ events: [] }));
    expect(state).toEqual({ label: 'Protegiendo', phase: 'blue' });
  });

  it('sin workflow y con TSA -> Protegido (gris)', () => {
    const state = deriveDocumentState(
      createDocument({
        events: [
          {
            id: 'evt-1',
            kind: 'tsa.confirmed',
            witness_hash: 'hash123',
            tsa: { token_b64: 'token123' },
            created_at: new Date().toISOString()
          }
        ]
      })
    );
    expect(state).toEqual({ label: 'Protegido', phase: 'gray' });
  });
});

describe('formatSignersForTooltip', () => {
  it('ordena por order y marca firmado/pendiente', () => {
    const formatted = formatSignersForTooltip([
      createSigner(3, 'ready', 'Tercero'),
      createSigner(1, 'signed', 'Primero'),
      createSigner(2, 'ready', 'Segundo')
    ]);
    expect(formatted).toBe(
      '✓ Primero firmó\n' +
      '· Segundo (pendiente)\n' +
      '· Tercero (pendiente)'
    );
  });
});
