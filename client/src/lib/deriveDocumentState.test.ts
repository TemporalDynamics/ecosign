// ========================================
// Tests: deriveDocumentState
// ========================================

import { describe, it, expect } from 'vitest';
import { deriveDocumentState, formatSignersForTooltip } from './deriveDocumentState';
import type { DocumentEntityRow } from './eco/v2';
import type { SimpleWorkflow, SimpleSigner } from './deriveDocumentState';

// ========================================
// Helpers
// ========================================

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

function createWorkflow(overrides?: Partial<SimpleWorkflow>): SimpleWorkflow {
  return {
    id: 'workflow-1',
    status: 'active',
    ...overrides
  };
}

function createSigner(order: number, status: SimpleSigner['status'], name?: string): SimpleSigner {
  return {
    id: `signer-${order}`,
    status,
    order,
    name: name || null,
    email: `signer${order}@example.com`
  };
}

// ========================================
// Tests: Orden de Decisión Estricto
// ========================================

describe('deriveDocumentState - Orden de Decisión', () => {

  // ========================================
  // 1. ARCHIVADO
  // ========================================

  it('debe mostrar Archivado cuando lifecycle_status es archived', () => {
    const doc = createDocument({ lifecycle_status: 'archived' });
    const state = deriveDocumentState(doc);

    expect(state.label).toBe('Archivado');
    expect(state.phase).toBe('gray');
  });

  // ========================================
  // 2. WORKFLOW DE FIRMA (prioridad)
  // ========================================

  it('debe mostrar Esperando firma cuando hay 1 firmante pendiente', () => {
    const doc = createDocument();
    const workflows = [createWorkflow({ status: 'active' })];
    const signers = [createSigner(1, 'pending', 'Juan Pérez')];

    const state = deriveDocumentState(doc, workflows, signers);

    expect(state.label).toBe('Esperando firma');
    expect(state.phase).toBe('green');
  });

  it('debe mostrar Esperando firma (1/3) cuando hay múltiples firmantes', () => {
    const doc = createDocument();
    const workflows = [createWorkflow({ status: 'active' })];
    const signers = [
      createSigner(1, 'signed', 'Juan Pérez'),
      createSigner(2, 'pending', 'María García'),
      createSigner(3, 'pending', 'Carlos López')
    ];

    const state = deriveDocumentState(doc, workflows, signers);

    expect(state.label).toBe('Esperando firma (1/3)');
    expect(state.phase).toBe('green');
  });

  it('debe mostrar Firmado cuando 1 firmante completó', () => {
    const doc = createDocument();
    const workflows = [createWorkflow({ status: 'completed' })];
    const signers = [createSigner(1, 'signed', 'Juan Pérez')];

    const state = deriveDocumentState(doc, workflows, signers);

    expect(state.label).toBe('Firmado');
    expect(state.phase).toBe('gray');
  });

  it('debe mostrar Firmas completadas cuando múltiples firmantes completaron', () => {
    const doc = createDocument();
    const workflows = [createWorkflow({ status: 'completed' })];
    const signers = [
      createSigner(1, 'signed', 'Juan Pérez'),
      createSigner(2, 'signed', 'María García'),
      createSigner(3, 'signed', 'Carlos López')
    ];

    const state = deriveDocumentState(doc, workflows, signers);

    expect(state.label).toBe('Firmas completadas');
    expect(state.phase).toBe('gray');
  });

  // ========================================
  // 3. NIVEL DE PROTECCIÓN
  // ========================================

  it('debe mostrar Protegiendo cuando no hay TSA confirmado', () => {
    const doc = createDocument({ events: [] });
    const state = deriveDocumentState(doc);

    expect(state.label).toBe('Protegiendo');
    expect(state.phase).toBe('green');
  });

  it('debe mostrar Protegido cuando hay TSA confirmado (ACTIVE)', () => {
    const doc = createDocument({
      events: [
        {
          id: 'evt-1',
          kind: 'tsa.confirmed',
          witness_hash: 'hash123',
          tsa: { token_b64: 'token123' },
          created_at: new Date().toISOString()
        }
      ]
    });

    const state = deriveDocumentState(doc);

    expect(state.label).toBe('Protegido');
    expect(state.phase).toBe('blue');
  });

  it('debe mostrar Protección reforzada cuando hay TSA + 1 blockchain (REINFORCED)', () => {
    const doc = createDocument({
      events: [
        {
          id: 'evt-1',
          kind: 'tsa.confirmed',
          witness_hash: 'hash123',
          tsa: { token_b64: 'token123' },
          created_at: new Date().toISOString()
        },
        {
          id: 'evt-2',
          kind: 'anchor.confirmed',
          anchor: { network: 'polygon', confirmed_at: new Date().toISOString() },
          created_at: new Date().toISOString()
        }
      ]
    });

    const state = deriveDocumentState(doc);

    expect(state.label).toBe('Protección reforzada');
    expect(state.phase).toBe('blue');
  });

  it('debe mostrar Protección máxima cuando hay TSA + 2 blockchains (TOTAL)', () => {
    const doc = createDocument({
      events: [
        {
          id: 'evt-1',
          kind: 'tsa.confirmed',
          witness_hash: 'hash123',
          tsa: { token_b64: 'token123' },
          created_at: new Date().toISOString()
        },
        {
          id: 'evt-2',
          kind: 'anchor.confirmed',
          anchor: { network: 'polygon', confirmed_at: new Date().toISOString() },
          created_at: new Date().toISOString()
        },
        {
          id: 'evt-3',
          kind: 'anchor.confirmed',
          anchor: { network: 'bitcoin', confirmed_at: new Date().toISOString() },
          created_at: new Date().toISOString()
        }
      ]
    });

    const state = deriveDocumentState(doc);

    expect(state.label).toBe('Protección máxima');
    expect(state.phase).toBe('gray');
  });

  // ========================================
  // 4. FALLBACK
  // ========================================

  it('debe usar fallback En proceso cuando no hay información', () => {
    const doc = createDocument({ events: undefined });
    const state = deriveDocumentState(doc);

    expect(state.label).toBe('En proceso');
    expect(state.phase).toBe('green');
  });
});

// ========================================
// Tests: Priorización
// ========================================

describe('deriveDocumentState - Priorización', () => {

  it('debe priorizar workflow sobre protección', () => {
    // Documento con protección TOTAL pero workflow activo
    const doc = createDocument({
      events: [
        {
          id: 'evt-1',
          kind: 'tsa.confirmed',
          witness_hash: 'hash123',
          tsa: { token_b64: 'token123' },
          created_at: new Date().toISOString()
        },
        {
          id: 'evt-2',
          kind: 'anchor.confirmed',
          anchor: { network: 'polygon', confirmed_at: new Date().toISOString() },
          created_at: new Date().toISOString()
        },
        {
          id: 'evt-3',
          kind: 'anchor.confirmed',
          anchor: { network: 'bitcoin', confirmed_at: new Date().toISOString() },
          created_at: new Date().toISOString()
        }
      ]
    });

    const workflows = [createWorkflow({ status: 'active' })];
    const signers = [
      createSigner(1, 'signed'),
      createSigner(2, 'pending')
    ];

    const state = deriveDocumentState(doc, workflows, signers);

    // Debe priorizar workflow (lo que falta) sobre protección (lo que ya pasó)
    expect(state.label).toBe('Esperando firma (1/2)');
    expect(state.phase).toBe('green');
  });

  it('debe mostrar protección cuando workflow está completado', () => {
    // Workflow completado → volvemos a protección
    const doc = createDocument({
      events: [
        {
          id: 'evt-1',
          kind: 'tsa.confirmed',
          witness_hash: 'hash123',
          tsa: { token_b64: 'token123' },
          created_at: new Date().toISOString()
        },
        {
          id: 'evt-2',
          kind: 'anchor.confirmed',
          anchor: { network: 'polygon', confirmed_at: new Date().toISOString() },
          created_at: new Date().toISOString()
        },
        {
          id: 'evt-3',
          kind: 'anchor.confirmed',
          anchor: { network: 'bitcoin', confirmed_at: new Date().toISOString() },
          created_at: new Date().toISOString()
        }
      ]
    });

    const workflows = [createWorkflow({ status: 'completed' })];
    const signers = [
      createSigner(1, 'signed'),
      createSigner(2, 'signed')
    ];

    const state = deriveDocumentState(doc, workflows, signers);

    // Firmas completadas → gris final
    expect(state.label).toBe('Firmas completadas');
    expect(state.phase).toBe('gray');
  });
});

// ========================================
// Tests: Casos Especiales
// ========================================

describe('deriveDocumentState - Casos Especiales', () => {

  it('debe ignorar workflows draft/cancelled', () => {
    const doc = createDocument({
      events: [
        {
          id: 'evt-1',
          kind: 'tsa.confirmed',
          witness_hash: 'hash123',
          tsa: { token_b64: 'token123' },
          created_at: new Date().toISOString()
        }
      ]
    });

    const workflows = [
      createWorkflow({ status: 'draft' }),
      createWorkflow({ status: 'cancelled' })
    ];
    const signers = [createSigner(1, 'pending')];

    const state = deriveDocumentState(doc, workflows, signers);

    // No hay workflow activo/completado → protección
    expect(state.label).toBe('Protegido');
    expect(state.phase).toBe('blue');
  });

  it('debe manejar workflow sin firmantes', () => {
    const doc = createDocument();
    const workflows = [createWorkflow({ status: 'active' })];
    const signers: SimpleSigner[] = [];

    const state = deriveDocumentState(doc, workflows, signers);

    // Sin firmantes → no aplica workflow, va a protección/fallback
    expect(state.label).toBe('Protegiendo');
    expect(state.phase).toBe('green');
  });

  it('NO debe mostrar error cuando TSA falla (sin evento tsa.confirmed)', () => {
    const doc = createDocument({
      events: [
        {
          id: 'evt-1',
          kind: 'tsa.failed',
          created_at: new Date().toISOString()
        }
      ]
    });

    const state = deriveDocumentState(doc);

    // Sin TSA confirmado → "Protegiendo" (verde)
    // El error se explica en el modal, NO en la tabla
    expect(state.label).toBe('Protegiendo');
    expect(state.phase).toBe('green');
  });

  it('NO debe mostrar error cuando anclaje falla pero TSA existe', () => {
    const doc = createDocument({
      events: [
        {
          id: 'evt-1',
          kind: 'tsa.confirmed',
          witness_hash: 'hash123',
          tsa: { token_b64: 'token123' },
          created_at: new Date().toISOString()
        },
        {
          id: 'evt-2',
          kind: 'anchor.failed',
          anchor: { network: 'bitcoin' },
          created_at: new Date().toISOString()
        }
      ]
    });

    const state = deriveDocumentState(doc);

    // TSA confirmado → "Protegido" (azul)
    // El error de anclaje se explica en el modal, NO en la tabla
    expect(state.label).toBe('Protegido');
    expect(state.phase).toBe('blue');
  });
});

// ========================================
// Tests: Helpers
// ========================================

describe('formatSignersForTooltip', () => {

  it('debe formatear firmantes con ✓ y ·', () => {
    const signers = [
      createSigner(1, 'signed', 'Juan Pérez'),
      createSigner(2, 'pending', 'María García'),
      createSigner(3, 'pending', 'Carlos López')
    ];

    const formatted = formatSignersForTooltip(signers);

    expect(formatted).toBe(
      '✓ Juan Pérez firmó\n' +
      '· María García (pendiente)\n' +
      '· Carlos López (pendiente)'
    );
  });

  it('debe usar email si no hay nombre', () => {
    const signers = [
      createSigner(1, 'signed'),
      createSigner(2, 'pending')
    ];

    const formatted = formatSignersForTooltip(signers);

    expect(formatted).toBe(
      '✓ signer1@example.com firmó\n' +
      '· signer2@example.com (pendiente)'
    );
  });

  it('debe ordenar por order', () => {
    const signers = [
      createSigner(3, 'pending', 'Tercero'),
      createSigner(1, 'signed', 'Primero'),
      createSigner(2, 'pending', 'Segundo')
    ];

    const formatted = formatSignersForTooltip(signers);

    expect(formatted).toBe(
      '✓ Primero firmó\n' +
      '· Segundo (pendiente)\n' +
      '· Tercero (pendiente)'
    );
  });
});
