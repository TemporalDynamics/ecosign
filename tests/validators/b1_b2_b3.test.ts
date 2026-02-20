import { describe, expect, test } from 'vitest';
import {
  ValidationError,
  validateMinimumEvidence,
  validateMonotonicityByStage,
  validateRequiredEvidenceNotNull,
} from '../../supabase/functions/_shared/eventValidator';

describe('Validator B1: No-Null', () => {
  test('rejects required_evidence null', () => {
    const event = {
      kind: 'document.protected.requested',
      payload: { required_evidence: null },
    };
    expect(() => validateRequiredEvidenceNotNull(event as any)).toThrow('B1');
  });

  test('rejects required_evidence empty', () => {
    const event = {
      kind: 'document.protected.requested',
      payload: { required_evidence: [] },
    };
    expect(() => validateRequiredEvidenceNotNull(event as any)).toThrow('B1');
  });

  test('accepts valid array', () => {
    const event = {
      kind: 'document.protected.requested',
      payload: { required_evidence: ['tsa'] },
    };
    expect(() => validateRequiredEvidenceNotNull(event as any)).not.toThrow();
  });
});

describe('Validator B2: Monotonicity', () => {
  test('allows growth between stages', () => {
    const prev = {
      kind: 'document.protected.requested',
      payload: { anchor_stage: 'initial', required_evidence: ['tsa', 'polygon'] },
    };
    const next = {
      kind: 'document.protected.requested',
      payload: { anchor_stage: 'intermediate', required_evidence: ['tsa', 'polygon', 'bitcoin'] },
    };
    expect(() => validateMonotonicityByStage(next as any, [prev as any])).not.toThrow();
  });

  test('rejects shrink between stages', () => {
    const prev = {
      kind: 'document.protected.requested',
      payload: { anchor_stage: 'initial', required_evidence: ['tsa', 'polygon'] },
    };
    const next = {
      kind: 'document.protected.requested',
      payload: { anchor_stage: 'intermediate', required_evidence: ['tsa'] },
    };
    expect(() => validateMonotonicityByStage(next as any, [prev as any])).toThrow('B2');
  });

  test('rejects change within same stage', () => {
    const prev = {
      kind: 'document.protected.requested',
      payload: { anchor_stage: 'initial', required_evidence: ['tsa'] },
    };
    const next = {
      kind: 'document.protected.requested',
      payload: { anchor_stage: 'initial', required_evidence: ['tsa', 'polygon'] },
    };
    expect(() => validateMonotonicityByStage(next as any, [prev as any])).toThrow('B2');
  });

  test('rejects stage rollback', () => {
    const prev = {
      kind: 'document.protected.requested',
      payload: { anchor_stage: 'final', required_evidence: ['tsa', 'polygon', 'bitcoin'] },
    };
    const next = {
      kind: 'document.protected.requested',
      payload: { anchor_stage: 'initial', required_evidence: ['tsa', 'polygon', 'bitcoin'] },
    };
    expect(() => validateMonotonicityByStage(next as any, [prev as any])).toThrow('B2');
  });
});

describe('Validator B3: TSA Minimum', () => {
  test('requires tsa', () => {
    const event = {
      kind: 'document.protected.requested',
      payload: { required_evidence: ['tsa', 'polygon'] },
    };
    expect(() => validateMinimumEvidence(event as any)).not.toThrow();
  });

  test('rejects missing tsa', () => {
    const event = {
      kind: 'document.protected.requested',
      payload: { required_evidence: ['polygon', 'bitcoin'] },
    };
    expect(() => validateMinimumEvidence(event as any)).toThrow('B3');
  });

  test('allows override with policy_override=special_case', () => {
    const event = {
      kind: 'document.protected.requested',
      payload: {
        required_evidence: ['polygon'],
        policy_override: 'special_case',
      },
    };
    expect(() => validateMinimumEvidence(event as any)).not.toThrow();
  });
});

describe('ValidationError', () => {
  test('preserves code and details', () => {
    const err = new ValidationError('B1', 'message', { x: 1 });
    expect(err.code).toBe('B1');
    expect(err.details).toEqual({ x: 1 });
  });
});
