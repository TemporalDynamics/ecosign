import { describe, it, expect } from 'vitest';
import {
  decideAnchorPolicyByStage,
  normalizePlanCapabilities,
} from '../../supabase/functions/_shared/anchorPlanPolicy.ts';

describe('anchorPlanPolicy', () => {
  it('DIRECT_PROTECTION free: TSA + Bitcoin', () => {
    const freeCaps = normalizePlanCapabilities({
      tsa_enabled: true,
      polygon_anchor_enabled: false,
      bitcoin_anchor_enabled: true,
    });

    const direct = decideAnchorPolicyByStage({
      stage: 'initial',
      flowType: 'DIRECT_PROTECTION',
      forensicConfig: { rfc3161: true, polygon: true, bitcoin: true },
      planKey: 'free',
      capabilities: freeCaps,
      policySource: 'workspace_plan',
    });
    expect(direct.protection).toEqual(['tsa', 'bitcoin']);
  });

  it('DIRECT_PROTECTION pro: TSA + Polygon + Bitcoin', () => {
    const proCaps = normalizePlanCapabilities({
      tsa_enabled: true,
      polygon_anchor_enabled: true,
      bitcoin_anchor_enabled: true,
    });

    const direct = decideAnchorPolicyByStage({
      stage: 'initial',
      flowType: 'DIRECT_PROTECTION',
      forensicConfig: { rfc3161: true, polygon: true, bitcoin: true },
      planKey: 'pro',
      capabilities: proCaps,
      policySource: 'workspace_plan',
    });
    expect(direct.protection).toEqual(['tsa', 'polygon', 'bitcoin']);
  });

  it('SIGNATURE_FLOW pro: initial TSA+Polygon, intermediate TSA, final TSA+Polygon+Bitcoin', () => {
    const proCaps = normalizePlanCapabilities({
      tsa_enabled: true,
      polygon_anchor_enabled: true,
      bitcoin_anchor_enabled: true,
    });

    const initial = decideAnchorPolicyByStage({
      stage: 'initial',
      flowType: 'SIGNATURE_FLOW',
      forensicConfig: { rfc3161: true, polygon: true, bitcoin: true },
      planKey: 'pro_monthly',
      capabilities: proCaps,
      policySource: 'workspace_plan',
    });

    const intermediate = decideAnchorPolicyByStage({
      stage: 'intermediate',
      flowType: 'SIGNATURE_FLOW',
      forensicConfig: { rfc3161: true, polygon: true, bitcoin: true },
      planKey: 'pro_monthly',
      capabilities: proCaps,
      policySource: 'workspace_plan',
    });

    const final = decideAnchorPolicyByStage({
      stage: 'final',
      flowType: 'SIGNATURE_FLOW',
      forensicConfig: { rfc3161: true, polygon: true, bitcoin: true },
      planKey: 'pro_monthly',
      capabilities: proCaps,
      policySource: 'workspace_plan',
    });

    expect(initial.protection).toEqual(['tsa', 'polygon']);
    expect(intermediate.protection).toEqual(['tsa']);
    expect(final.protection).toEqual(['tsa', 'polygon', 'bitcoin']);
  });

  it('SIGNATURE_FLOW free: initial TSA, final Bitcoin, never Polygon', () => {
    const freeCaps = normalizePlanCapabilities({
      tsa_enabled: true,
      polygon_anchor_enabled: false,
      bitcoin_anchor_enabled: true,
    });

    const initial = decideAnchorPolicyByStage({
      stage: 'initial',
      flowType: 'SIGNATURE_FLOW',
      forensicConfig: { rfc3161: true, polygon: true, bitcoin: true },
      planKey: 'free',
      capabilities: freeCaps,
      policySource: 'workspace_plan',
    });

    const final = decideAnchorPolicyByStage({
      stage: 'final',
      flowType: 'SIGNATURE_FLOW',
      forensicConfig: { rfc3161: true, polygon: true, bitcoin: true },
      planKey: 'free',
      capabilities: freeCaps,
      policySource: 'workspace_plan',
    });

    expect(initial.protection).toEqual(['tsa']);
    expect(final.protection).toEqual(['bitcoin']);
    expect(final.protection.includes('polygon')).toBe(false);
  });

  it('SIGNATURE_FLOW intermediate stage never enqueues chain anchors', () => {
    const proCaps = normalizePlanCapabilities({
      tsa_enabled: true,
      polygon_anchor_enabled: true,
      bitcoin_anchor_enabled: true,
    });
    const intermediate = decideAnchorPolicyByStage({
      stage: 'intermediate',
      flowType: 'SIGNATURE_FLOW',
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
