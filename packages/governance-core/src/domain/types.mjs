export const VALID_LEVELS = ["L0", "L1", "L2", "L3", "L4"];
export const VALID_TARGET_LEVELS = ["L1", "L2", "L3", "L4"];
export const VALID_STATUS = ["mapped", "gap"];
export const VALID_BLOCKING_SEVERITY = ["release-blocking", "warning"];

const levelRank = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
};

export function getLevelRank(level) {
  return levelRank[level] ?? -1;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asBoolean(value, field, errors) {
  if (typeof value !== "boolean") {
    errors.push(`${field} must be boolean.`);
    return false;
  }
  return value;
}

function asString(value, field, errors) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${field} must be non-empty string.`);
    return "";
  }
  return value;
}

function asEnum(value, field, allowed, errors) {
  const str = asString(value, field, errors);
  if (!str) return "";
  if (!allowed.includes(str)) {
    errors.push(`${field} must be one of: ${allowed.join(", ")}.`);
    return "";
  }
  return str;
}

function normalizeInvariant(raw, index, errors) {
  if (!isObject(raw)) {
    errors.push(`invariants[${index}] must be object.`);
    return null;
  }

  const id = asString(raw.id, `invariants[${index}].id`, errors);
  const status = asEnum(raw.status, `invariants[${index}].status`, VALID_STATUS, errors);
  const blockingSeverity = asEnum(
    raw.blocking_severity,
    `invariants[${index}].blocking_severity`,
    VALID_BLOCKING_SEVERITY,
    errors,
  );
  const owner = asString(raw.owner, `invariants[${index}].owner`, errors);

  if (!id || !status || !blockingSeverity || !owner) return null;

  return {
    id,
    status,
    blocking_severity: blockingSeverity,
    owner,
  };
}

export function normalizeGovernanceInput(rawInput) {
  const errors = [];

  if (!isObject(rawInput)) {
    return { errors: ["Input must be an object."] };
  }

  if (!Array.isArray(rawInput.invariants)) {
    errors.push("invariants must be an array.");
  }

  const invariants = Array.isArray(rawInput.invariants)
    ? rawInput.invariants
        .map((item, index) => normalizeInvariant(item, index, errors))
        .filter(Boolean)
    : [];

  if (!Array.isArray(rawInput.critical_invariants)) {
    errors.push("critical_invariants must be an array of strings.");
  }

  const criticalInvariants = Array.isArray(rawInput.critical_invariants)
    ? rawInput.critical_invariants.map((value, index) => asString(value, `critical_invariants[${index}]`, errors))
    : [];

  const targetLevel = asEnum(rawInput.target_level, "target_level", VALID_TARGET_LEVELS, errors);
  const strictMatrix = asBoolean(rawInput.strict_matrix, "strict_matrix", errors);
  const releaseMode = asBoolean(rawInput.release_mode, "release_mode", errors);

  let metadata = {
    protocol_version: undefined,
    protocol_version_changed: false,
    decision_log_changed: false,
    invariants_changed: false,
  };

  if (rawInput.metadata !== undefined) {
    if (!isObject(rawInput.metadata)) {
      errors.push("metadata must be object when provided.");
    } else {
      if (rawInput.metadata.protocol_version !== undefined && typeof rawInput.metadata.protocol_version !== "string") {
        errors.push("metadata.protocol_version must be string when provided.");
      }

      if (
        rawInput.metadata.protocol_version_changed !== undefined &&
        typeof rawInput.metadata.protocol_version_changed !== "boolean"
      ) {
        errors.push("metadata.protocol_version_changed must be boolean when provided.");
      }

      if (
        rawInput.metadata.decision_log_changed !== undefined &&
        typeof rawInput.metadata.decision_log_changed !== "boolean"
      ) {
        errors.push("metadata.decision_log_changed must be boolean when provided.");
      }

      if (
        rawInput.metadata.invariants_changed !== undefined &&
        typeof rawInput.metadata.invariants_changed !== "boolean"
      ) {
        errors.push("metadata.invariants_changed must be boolean when provided.");
      }

      metadata = {
        protocol_version: rawInput.metadata.protocol_version,
        protocol_version_changed: rawInput.metadata.protocol_version_changed ?? false,
        decision_log_changed: rawInput.metadata.decision_log_changed ?? false,
        invariants_changed: rawInput.metadata.invariants_changed ?? false,
      };
    }
  }

  const seenInvariantIds = new Set();
  for (const invariant of invariants) {
    if (seenInvariantIds.has(invariant.id)) {
      errors.push(`Duplicate invariant id: ${invariant.id}`);
    }
    seenInvariantIds.add(invariant.id);
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    input: {
      invariants,
      critical_invariants: criticalInvariants,
      target_level: targetLevel,
      strict_matrix: strictMatrix,
      release_mode: releaseMode,
      metadata,
    },
  };
}
