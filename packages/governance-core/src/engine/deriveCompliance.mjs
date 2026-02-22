function roundRatio(mappedCount, totalCount) {
  if (totalCount <= 0) return 0;
  return Number(((mappedCount / totalCount) * 100).toFixed(2));
}

export function deriveCompliance({ invariants, strictMatrix, criticalMapped, criticalTotal }) {
  const totalCount = invariants.length;
  const mappedCount = invariants.filter((inv) => inv.status === "mapped").length;
  const ratio = roundRatio(mappedCount, totalCount);
  const gaps = invariants.filter((inv) => inv.status !== "mapped").map((inv) => inv.id);

  let currentLevel = "L0";
  if (totalCount > 0) currentLevel = "L1";
  if (mappedCount > 0) currentLevel = "L2";
  if (ratio >= 75 && criticalMapped === criticalTotal) currentLevel = "L3";
  if (strictMatrix && gaps.length === 0 && ratio === 100 && criticalMapped === criticalTotal) currentLevel = "L4";

  return {
    current_level: currentLevel,
    mapped_count: mappedCount,
    total_count: totalCount,
    ratio,
    gaps,
  };
}
