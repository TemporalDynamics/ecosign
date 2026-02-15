export type AnchorStage = 'initial' | 'intermediate' | 'final';

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
): Required<ForensicConfigInput> {
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
  forensicConfig: ForensicConfigInput | null | undefined;
  planKey?: string | null;
  capabilities?: AnchorPlanCapabilities;
  policySource?: AnchorPolicyDecision['policy_source'];
}): AnchorPolicyDecision {
  const stage = params.stage;
  const requestedConfig = normalizeForensicConfig(params.forensicConfig);
  const capabilities = params.capabilities ?? DEFAULT_CAPABILITIES;
  const requested = {
    tsa: requestedConfig.rfc3161,
    polygon: requestedConfig.polygon,
    bitcoin: requestedConfig.bitcoin,
  };

  const allowChainAtStage = stage === 'initial' || stage === 'final';
  const allowBitcoinAtStage = stage === 'final';
  const allowPolygonAtStage = stage === 'initial' || stage === 'final';

  const allowed = {
    tsa: requested.tsa && capabilities.tsa_enabled,
    polygon:
      requested.polygon &&
      capabilities.polygon_anchor_enabled &&
      allowChainAtStage &&
      allowPolygonAtStage,
    bitcoin:
      requested.bitcoin &&
      capabilities.bitcoin_anchor_enabled &&
      allowChainAtStage &&
      allowBitcoinAtStage,
  };

  const protection = [
    ...(allowed.tsa ? ['tsa'] : []),
    ...(allowed.polygon ? ['polygon'] : []),
    ...(allowed.bitcoin ? ['bitcoin'] : []),
  ];

  return {
    plan_key: params.planKey ?? 'fallback',
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
