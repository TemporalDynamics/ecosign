import { getLevelRank } from "../domain/types.mjs";
import { deriveCompliance } from "./deriveCompliance.mjs";
import { evaluateCritical } from "./evaluateCritical.mjs";
import { evaluateFreeze } from "./evaluateFreeze.mjs";
import { evaluateProtocol } from "./evaluateProtocol.mjs";
import { evaluateDecisionLog } from "./evaluateDecisionLog.mjs";

export function evaluateGovernance(input) {
  const critical = evaluateCritical(input.invariants, input.critical_invariants);
  const compliance = deriveCompliance({
    invariants: input.invariants,
    strictMatrix: input.strict_matrix,
    criticalMapped: critical.critical_mapped,
    criticalTotal: critical.critical_total,
  });
  const freeze = evaluateFreeze(input.metadata);
  const protocol = evaluateProtocol({ metadata: input.metadata, releaseMode: input.release_mode });
  const decisionLog = evaluateDecisionLog({ metadata: input.metadata, releaseMode: input.release_mode });

  const strictMatrixFailed = input.strict_matrix && (compliance.gaps.length > 0 || compliance.ratio < 100);
  const targetFailed = getLevelRank(compliance.current_level) < getLevelRank(input.target_level);

  const releaseFailed =
    input.release_mode && (freeze.freeze_violation || !protocol.protocol_version_ok || !decisionLog.decision_log_ok);

  const pass = !(strictMatrixFailed || targetFailed || releaseFailed);

  return {
    current_level: compliance.current_level,
    mapped_count: compliance.mapped_count,
    total_count: compliance.total_count,
    ratio: compliance.ratio,
    critical_mapped: critical.critical_mapped,
    critical_total: critical.critical_total,
    critical_missing: critical.critical_missing,
    gaps: compliance.gaps,
    freeze_violation: freeze.freeze_violation,
    protocol_version_ok: protocol.protocol_version_ok,
    decision_log_ok: decisionLog.decision_log_ok,
    pass,
  };
}
