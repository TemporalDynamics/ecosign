import { describe, it, expect } from 'vitest';
import {
  decideAnchorPolicyByStage,
  normalizePlanCapabilities,
} from '../../supabase/functions/_shared/anchorPlanPolicy.ts';

describe('anchorPlanPolicy', () => {
  it('free plan: initial allows tsa only, final allows bitcoin', () => {
    const freeCaps = normalizePlanCapabilities({
      tsa_enabled: true,
      polygon_anchor_enabled: false,
      bitcoin_anchor_enabled: true,
    });

    const initial = decideAnchorPolicyByStage({
      stage: 'initial',
      forensicConfig: { rfc3161: true, polygon: true, bitcoin: true },
      planKey: 'free',
      capabilities: freeCaps,
      policySource: 'workspace_plan',
    });

    const final = decideAnchorPolicyByStage({
      stage: 'final',
      forensicConfig: { rfc3161: true, polygon: true, bitcoin: true },
      planKey: 'free',
      capabilities: freeCaps,
      policySource: 'workspace_plan',
    });

    expect(initial.protection).toEqual(['tsa']);
    expect(final.protection).toEqual(['tsa', 'bitcoin']);
  });

  it('pro plan: initial includes polygon, final includes polygon + bitcoin', () => {
    const proCaps = normalizePlanCapabilities({
      tsa_enabled: true,
      polygon_anchor_enabled: true,
      bitcoin_anchor_enabled: true,
    });

    const initial = decideAnchorPolicyByStage({
      stage: 'initial',
      forensicConfig: { rfc3161: true, polygon: true, bitcoin: true },
      planKey: 'pro',
      capabilities: proCaps,
      policySource: 'workspace_plan',
    });

    const final = decideAnchorPolicyByStage({
      stage: 'final',
      forensicConfig: { rfc3161: true, polygon: true, bitcoin: true },
      planKey: 'pro',
      capabilities: proCaps,
      policySource: 'workspace_plan',
    });

    expect(initial.protection).toEqual(['tsa', 'polygon']);
    expect(final.protection).toEqual(['tsa', 'polygon', 'bitcoin']);
  });

  it('intermediate stage never enqueues chain anchors', () => {
    const proCaps = normalizePlanCapabilities({
      tsa_enabled: true,
      polygon_anchor_enabled: true,
      bitcoin_anchor_enabled: true,
    });

    const intermediate = decideAnchorPolicyByStage({
      stage: 'intermediate',
      forensicConfig: { rfc3161: true, polygon: true, bitcoin: true },
      planKey: 'pro',
      capabilities: proCaps,
      policySource: 'workspace_plan',
    });

    expect(intermediate.protection).toEqual(['tsa']);
    expect(intermediate.allowed.polygon).toBe(false);
    expect(intermediate.allowed.bitcoin).toBe(false);
  });
});
