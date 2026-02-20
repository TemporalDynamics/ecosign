export type DocumentEvent = {
  id?: string;
  kind: string;
  payload?: Record<string, unknown>;
};

export class ValidationError extends Error {
  readonly code: "B1" | "B2" | "B3";
  readonly details: Record<string, unknown>;

  constructor(code: "B1" | "B2" | "B3", message: string, details: Record<string, unknown> = {}) {
    super(`${code}: ${message}`);
    this.name = "ValidationError";
    this.code = code;
    this.details = details;
  }
}

export function validateRequiredEvidenceNotNull(event: DocumentEvent): void {
  if (event.kind !== "document.protected.requested") return;

  const payload = event.payload ?? {};
  const requiredEvidence = payload["required_evidence"];
  if (!Array.isArray(requiredEvidence) || requiredEvidence.length === 0) {
    throw new ValidationError(
      "B1",
      "required_evidence must be a non-empty array",
      { event_id: event.id ?? null, provided: requiredEvidence ?? null },
    );
  }
}

export function validateMonotonicityByStage(
  newEvent: DocumentEvent,
  prevEvents: DocumentEvent[],
): void {
  if (newEvent.kind !== "document.protected.requested") return;

  const previousRequest = [...prevEvents]
    .filter((event) => event.kind === "document.protected.requested")
    .pop();

  if (!previousRequest) return;

  const prevPayload = previousRequest.payload ?? {};
  const nextPayload = newEvent.payload ?? {};

  const prevStage = typeof prevPayload["anchor_stage"] === "string"
    ? String(prevPayload["anchor_stage"])
    : "initial";
  const nextStage = typeof nextPayload["anchor_stage"] === "string"
    ? String(nextPayload["anchor_stage"])
    : "initial";

  const prev = Array.isArray(prevPayload["required_evidence"])
    ? prevPayload["required_evidence"].filter((item): item is string => typeof item === "string")
    : [];
  const next = Array.isArray(nextPayload["required_evidence"])
    ? nextPayload["required_evidence"].filter((item): item is string => typeof item === "string")
    : [];

  if (prevStage === nextStage && !arraysEqual(prev, next)) {
    throw new ValidationError(
      "B2",
      "required_evidence cannot change within the same stage",
      { stage: nextStage, prev, next },
    );
  }

  if (stageOrder(prevStage) < stageOrder(nextStage) && !isSubset(prev, next)) {
    throw new ValidationError(
      "B2",
      "required_evidence can only grow between stages",
      { from: prevStage, to: nextStage, prev, next },
    );
  }

  if (stageOrder(prevStage) > stageOrder(nextStage)) {
    throw new ValidationError(
      "B2",
      "anchor_stage cannot go backwards",
      { from: prevStage, to: nextStage },
    );
  }
}

export function validateMinimumEvidence(event: DocumentEvent): void {
  if (event.kind !== "document.protected.requested") return;

  const payload = event.payload ?? {};
  const requiredEvidence = Array.isArray(payload["required_evidence"])
    ? payload["required_evidence"].filter((item): item is string => typeof item === "string")
    : [];
  const policyOverride = typeof payload["policy_override"] === "string"
    ? payload["policy_override"]
    : null;

  if (!requiredEvidence.includes("tsa")) {
    if (policyOverride === "special_case") {
      console.warn("[B3-OVERRIDE]", { event_id: event.id ?? null });
      return;
    }

    throw new ValidationError(
      "B3",
      'required_evidence must include "tsa" as minimum',
      { required_evidence: requiredEvidence, policy_override: policyOverride },
    );
  }
}

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

function isSubset(subset: string[], superset: string[]): boolean {
  return subset.every((item) => superset.includes(item));
}

function stageOrder(stage: string): number {
  const order: Record<string, number> = {
    initial: 0,
    intermediate: 1,
    final: 2,
  };
  return order[stage] ?? -1;
}
