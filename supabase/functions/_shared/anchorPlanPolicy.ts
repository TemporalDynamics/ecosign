export type AnchorStage = 'initial' | 'intermediate' | 'final';
export type FlowType = 'DIRECT_PROTECTION' | 'SIGNATURE_FLOW';

export type ForensicConfigInput = {
  rfc3161?: boolean | null;
  polygon?: boolean | null;
  bitcoin?: boolean | null;
};

export type AnchorPlanCapabilities = {
  tsa_enabled: boolean;
  polygon_anchor_enabled: boolean;
  bitcoin_anchor_enabled: boolean;
};

export type AnchorPolicyDecision = {
  plan_key: string;
  stage: AnchorStage;
  requested: {
    tsa: boolean;
    polygon: boolean;
    bitcoin: boolean;
  };
  allowed: {
    tsa: boolean;
    polygon: boolean;
    bitcoin: boolean;
  };
  protection: string[];
  policy_source: 'workspace_plan' | 'fallback';
};

const DEFAULT_CAPABILITIES: AnchorPlanCapabilities = {
  tsa_enabled: true,
  polygon_anchor_enabled: false,
  bitcoin_anchor_enabled: true,
};

export function normalizeForensicConfig(
  value: ForensicConfigInput | null | undefined,
): { rfc3161: boolean; polygon: boolean; bitcoin: boolean } {
  return {
    rfc3161: Boolean(value?.rfc3161 ?? true),
    polygon: Boolean(value?.polygon),
    bitcoin: Boolean(value?.bitcoin ?? true),
  };
}

function toBoolean(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === 'boolean') return raw;
  return fallback;
}

export function normalizePlanCapabilities(raw: unknown): AnchorPlanCapabilities {
  const obj = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
  return {
    tsa_enabled: toBoolean(obj.tsa_enabled, DEFAULT_CAPABILITIES.tsa_enabled),
    polygon_anchor_enabled: toBoolean(
      obj.polygon_anchor_enabled,
      DEFAULT_CAPABILITIES.polygon_anchor_enabled,
    ),
    bitcoin_anchor_enabled: toBoolean(
      obj.bitcoin_anchor_enabled,
      DEFAULT_CAPABILITIES.bitcoin_anchor_enabled,
    ),
  };
}

export function decideAnchorPolicyByStage(params: {
  stage: AnchorStage;
  flowType?: FlowType;
  forensicConfig: ForensicConfigInput | null | undefined;
  planKey?: string | null;
  capabilities?: AnchorPlanCapabilities;
  policySource?: AnchorPolicyDecision['policy_source'];
}): AnchorPolicyDecision {
  const stage = params.stage;
  const flowType: FlowType = params.flowType ?? 'DIRECT_PROTECTION';
  const normalizedPlanKey = String(params.planKey ?? 'fallback').trim().toLowerCase();
  const requestedConfig = normalizeForensicConfig(params.forensicConfig);
  const capabilities = params.capabilities ?? DEFAULT_CAPABILITIES;
  const isProPlusPlan =
    normalizedPlanKey.startsWith('pro')
    || normalizedPlanKey.startsWith('business')
    || normalizedPlanKey.startsWith('enterprise');
  const requested = {
    tsa: requestedConfig.rfc3161,
    polygon: requestedConfig.polygon,
    bitcoin: requestedConfig.bitcoin,
  };

  // Contract-first policy:
  // 1) DIRECT_PROTECTION
  //    - Free: TSA + Bitcoin
  //    - Pro+/Business/Enterprise: TSA + Polygon + Bitcoin
  // 2) SIGNATURE_FLOW
  //    - initial: Free => TSA ; Pro+ => TSA + Polygon
  //    - intermediate: TSA only
  //    - final: Free => Bitcoin ; Pro+ => TSA + Polygon + Bitcoin
  const contractRequired = { tsa: false, polygon: false, bitcoin: false };
  if (flowType === 'DIRECT_PROTECTION') {
    contractRequired.tsa = true;
    contractRequired.bitcoin = true;
    contractRequired.polygon = isProPlusPlan;
  } else if (stage === 'initial') {
    contractRequired.tsa = true;
    contractRequired.polygon = isProPlusPlan;
  } else if (stage === 'intermediate') {
    contractRequired.tsa = true;
  } else {
    contractRequired.bitcoin = true;
    contractRequired.tsa = isProPlusPlan;
    contractRequired.polygon = isProPlusPlan;
  }

  const allowed = {
    tsa: contractRequired.tsa && capabilities.tsa_enabled,
    polygon: contractRequired.polygon && capabilities.polygon_anchor_enabled,
    bitcoin: contractRequired.bitcoin && capabilities.bitcoin_anchor_enabled,
  };

  const protection = [
    ...(allowed.tsa ? ['tsa'] : []),
    ...(allowed.polygon ? ['polygon'] : []),
    ...(allowed.bitcoin ? ['bitcoin'] : []),
  ];

  return {
    plan_key: normalizedPlanKey,
    stage,
    requested,
    allowed,
    protection,
    policy_source: params.policySource ?? 'fallback',
  };
}

export async function resolveOwnerAnchorPlan(
  supabase: any,
  ownerId: string | null | undefined,
): Promise<{ planKey: string; capabilities: AnchorPlanCapabilities; policySource: AnchorPolicyDecision['policy_source'] }> {
  if (!ownerId) {
    return {
      planKey: 'fallback',
      capabilities: DEFAULT_CAPABILITIES,
      policySource: 'fallback',
    };
  }

  try {
    const { data: workspace, error: workspaceErr } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (workspaceErr || !workspace?.id) {
      return {
        planKey: 'fallback',
        capabilities: DEFAULT_CAPABILITIES,
        policySource: 'fallback',
      };
    }

    const { data: effectiveRows, error: effectiveErr } = await supabase.rpc(
      'compute_workspace_effective_limits',
      { p_workspace_id: workspace.id },
    );

    if (effectiveErr || !Array.isArray(effectiveRows) || effectiveRows.length === 0) {
      return {
        planKey: 'fallback',
        capabilities: DEFAULT_CAPABILITIES,
        policySource: 'fallback',
      };
    }

    const row = effectiveRows[0] as Record<string, unknown>;
    const capabilities = normalizePlanCapabilities(row.capabilities ?? row.plan_capabilities ?? {});
    return {
      planKey: String(row.plan_key ?? 'fallback'),
      capabilities,
      policySource: 'workspace_plan',
    };
  } catch (_err) {
    return {
      planKey: 'fallback',
      capabilities: DEFAULT_CAPABILITIES,
      policySource: 'fallback',
    };
  }
}
