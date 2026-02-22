export function evaluateFreeze(metadata) {
  const invariantsChanged = Boolean(metadata?.invariants_changed);
  const protocolVersionChanged = Boolean(metadata?.protocol_version_changed);

  return {
    freeze_violation: invariantsChanged && !protocolVersionChanged,
  };
}
