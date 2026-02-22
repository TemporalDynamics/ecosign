export function evaluateCritical(invariants, criticalInvariants) {
  const mappedSet = new Set(invariants.filter((inv) => inv.status === "mapped").map((inv) => inv.id));
  const criticalMissing = criticalInvariants.filter((id) => !mappedSet.has(id));

  return {
    critical_mapped: criticalInvariants.length - criticalMissing.length,
    critical_total: criticalInvariants.length,
    critical_missing: criticalMissing,
  };
}
