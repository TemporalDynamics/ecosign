import { describe, test, expect } from 'vitest';
import {
  generateEcoV2,
  projectEcoV2FromDocumentEntity,
  verifyEcoV2,
  type DocumentEntityRow,
  canonicalStringify,
} from '../../client/src/lib/eco/v2';

const baseRow = (): DocumentEntityRow => ({
  id: 'doc-1',
  source_name: 'contract.docx',
  source_mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  source_size: 1024,
  source_hash: 'a'.repeat(64),
  source_captured_at: '2026-01-06T10:00:00.000Z',
  created_at: '2026-01-06T10:00:00.000Z',
});

describe('ECO v2 projection', () => {
  test('generates deterministic JSON for the same input', () => {
    const row: DocumentEntityRow = {
      ...baseRow(),
      witness_current_hash: 'b'.repeat(64),
      witness_current_mime: 'application/pdf',
      witness_current_status: 'generated',
      signed_hash: 'c'.repeat(64),
      transform_log: [
        {
          from_mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          to_mime: 'application/pdf',
          from_hash: 'a'.repeat(64),
          to_hash: 'b'.repeat(64),
          method: 'client',
          reason: 'visualization',
          executed_at: '2026-01-06T10:01:00.000Z',
        },
        {
          from_mime: 'application/pdf',
          to_mime: 'application/pdf',
          from_hash: 'b'.repeat(64),
          to_hash: 'c'.repeat(64),
          method: 'client',
          reason: 'signature',
          executed_at: '2026-01-06T10:02:00.000Z',
        },
      ],
    };

    const first = generateEcoV2(row).json;
    const second = generateEcoV2(row).json;

    expect(first).toBe(second);
  });

  test('omits witness and signed objects when hashes are absent', () => {
    const row: DocumentEntityRow = {
      ...baseRow(),
      witness_current_hash: null,
      signed_hash: null,
    };

    const { json } = generateEcoV2(row);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    expect(parsed.witness).toBeUndefined();
    expect(parsed.signed).toBeUndefined();
  });

  test('serializes keys in deterministic order', () => {
    const a = canonicalStringify({ b: 1, a: 2, nested: { d: 4, c: 3 } });
    const b = canonicalStringify({ nested: { c: 3, d: 4 }, a: 2, b: 1 });

    expect(a).toBe(b);
  });

  test('normalizes -0 to 0 in canonical serialization', () => {
    const json = canonicalStringify({ n: -0 });
    expect(json).toBe('{"n":0}');
  });

  test('prefers hash_chain when provided and consistent', () => {
    const row: DocumentEntityRow = {
      ...baseRow(),
      witness_current_hash: 'b'.repeat(64),
      signed_hash: 'c'.repeat(64),
      hash_chain: {
        source_hash: 'a'.repeat(64),
        witness_hash: 'b'.repeat(64),
        signed_hash: 'c'.repeat(64),
      },
    };

    const eco = projectEcoV2FromDocumentEntity(row);
    expect(eco.hash_chain).toEqual(row.hash_chain);
  });
});

describe('ECO v2 verification', () => {
  test('returns valid for a consistent chain', () => {
    const row: DocumentEntityRow = {
      ...baseRow(),
      witness_current_hash: 'b'.repeat(64),
      witness_current_mime: 'application/pdf',
      witness_current_status: 'generated',
      signed_hash: 'c'.repeat(64),
      transform_log: [
        {
          from_mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          to_mime: 'application/pdf',
          from_hash: 'a'.repeat(64),
          to_hash: 'b'.repeat(64),
          method: 'client',
          reason: 'visualization',
          executed_at: '2026-01-06T10:01:00.000Z',
        },
        {
          from_mime: 'application/pdf',
          to_mime: 'application/pdf',
          from_hash: 'b'.repeat(64),
          to_hash: 'c'.repeat(64),
          method: 'client',
          reason: 'signature',
          executed_at: '2026-01-06T10:02:00.000Z',
        },
      ],
    };

    const eco = projectEcoV2FromDocumentEntity(row);
    const result = verifyEcoV2(eco);

    expect(result.status).toBe('valid');
  });

  test('returns tampered when source hash mismatches', () => {
    const eco = projectEcoV2FromDocumentEntity({
      ...baseRow(),
      witness_current_hash: 'b'.repeat(64),
      signed_hash: 'c'.repeat(64),
      transform_log: [],
    });

    const tampered = {
      ...eco,
      source: {
        ...eco.source,
        hash: 'd'.repeat(64),
      },
    };

    const result = verifyEcoV2(tampered);
    expect(result.status).toBe('tampered');
  });

  test('returns tampered when witness is present without chain hash', () => {
    const eco = projectEcoV2FromDocumentEntity({
      ...baseRow(),
      witness_current_hash: 'b'.repeat(64),
    });

    const tampered = {
      ...eco,
      hash_chain: {
        ...eco.hash_chain,
        witness_hash: undefined,
      },
    };

    const result = verifyEcoV2(tampered);
    expect(result.status).toBe('tampered');
  });

  test('returns tampered when hash_chain conflicts with source hash', () => {
    const row: DocumentEntityRow = {
      ...baseRow(),
      hash_chain: {
        source_hash: 'x'.repeat(64),
      },
    };

    const eco = projectEcoV2FromDocumentEntity(row);
    const result = verifyEcoV2(eco);

    expect(result.status).toBe('tampered');
  });

  test('returns tampered when transform_log chain is broken', () => {
    const row: DocumentEntityRow = {
      ...baseRow(),
      witness_current_hash: 'b'.repeat(64),
      signed_hash: 'c'.repeat(64),
      transform_log: [
        {
          from_mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          to_mime: 'application/pdf',
          from_hash: 'a'.repeat(64),
          to_hash: 'b'.repeat(64),
          method: 'client',
          reason: 'visualization',
          executed_at: '2026-01-06T10:01:00.000Z',
        },
        {
          from_mime: 'application/pdf',
          to_mime: 'application/pdf',
          from_hash: 'x'.repeat(64),
          to_hash: 'c'.repeat(64),
          method: 'client',
          reason: 'signature',
          executed_at: '2026-01-06T10:02:00.000Z',
        },
      ],
    };

    const eco = projectEcoV2FromDocumentEntity(row);
    const result = verifyEcoV2(eco);

    expect(result.status).toBe('tampered');
  });

  test('returns incomplete when witness/signed are missing', () => {
    const eco = projectEcoV2FromDocumentEntity(baseRow());
    const result = verifyEcoV2(eco);

    expect(result.status).toBe('incomplete');
  });

  test('returns unknown for invalid input shape', () => {
    const result = verifyEcoV2({ version: 'eco.v2' });
    expect(result.status).toBe('unknown');
  });
});
