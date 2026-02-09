import { describe, expect, test } from 'vitest';

type EcoProof = { kind: string; witness_hash?: string | null };

type EcoSnapshot = {
  document: { source_hash: string; witness_hash: string };
  fields: { schema_hash: string };
  proofs?: EcoProof[];
  signing_act: { step_index: number; step_total: number };
};

function assertWitnessConsistency(eco: EcoSnapshot) {
  const witness = eco.document.witness_hash;
  const proofs = eco.proofs || [];
  for (const proof of proofs) {
    if (!proof.witness_hash) continue;
    expect(proof.witness_hash).toBe(witness);
  }
}

describe('CAI ECO invariants (regression)', () => {
  test('CAI-INV-001 / CAI-INV-002 / CAI-INV-004: witness and proofs consistency across signers', () => {
    const eco1: EcoSnapshot = {
      document: {
        source_hash: 'source_hash_abc',
        witness_hash: 'witness_hash_1'
      },
      fields: { schema_hash: 'schema_hash_1' },
      proofs: [{ kind: 'tsa', witness_hash: 'witness_hash_1' }],
      signing_act: { step_index: 1, step_total: 2 }
    };

    const eco2: EcoSnapshot = {
      document: {
        source_hash: 'source_hash_abc',
        witness_hash: 'witness_hash_2'
      },
      fields: { schema_hash: 'schema_hash_1' },
      proofs: [{ kind: 'tsa', witness_hash: 'witness_hash_2' }],
      signing_act: { step_index: 2, step_total: 2 }
    };

    // Same base document
    expect(eco1.document.source_hash).toBe(eco2.document.source_hash);
    // Same schema contract
    expect(eco1.fields.schema_hash).toBe(eco2.fields.schema_hash);
    // Different post-acto witnesses
    expect(eco1.document.witness_hash).not.toBe(eco2.document.witness_hash);

    // Proofs must seal the same witness hash as the ECO document
    assertWitnessConsistency(eco1);
    assertWitnessConsistency(eco2);
  });

  test('CAI-INV-002: ECO with proof mismatch is invalid', () => {
    const badEco: EcoSnapshot = {
      document: {
        source_hash: 'source_hash_abc',
        witness_hash: 'witness_hash_good'
      },
      fields: { schema_hash: 'schema_hash_1' },
      proofs: [{ kind: 'tsa', witness_hash: 'witness_hash_bad' }],
      signing_act: { step_index: 1, step_total: 1 }
    };

    expect(() => assertWitnessConsistency(badEco)).toThrow();
  });
});
