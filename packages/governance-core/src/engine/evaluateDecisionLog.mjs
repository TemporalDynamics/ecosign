export function evaluateDecisionLog({ metadata, releaseMode }) {
  if (!releaseMode) {
    return { decision_log_ok: true };
  }

  return {
    decision_log_ok: Boolean(metadata?.decision_log_changed),
  };
}
