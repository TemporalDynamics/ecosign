export type AnchorNetwork = 'bitcoin' | 'polygon';

export interface AnchorRetryPolicy {
  network: AnchorNetwork;
  maxAttempts: number;
  timeoutMs: number;
  retryScheduleMinutes: readonly number[];
}

type AnchorRecordLike = {
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const DEFAULT_RETRY_MINUTES = 30;

const asObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const normalizeIso = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const readMetadataIso = (metadata: Record<string, unknown>, ...keys: string[]): string | null => {
  for (const key of keys) {
    const normalized = normalizeIso(metadata[key]);
    if (normalized) return normalized;
  }
  return null;
};

export function parseRetryScheduleMinutes(
  rawValue: string | null | undefined,
  fallback: readonly number[],
): number[] {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    return [...fallback];
  }

  const parsed = rawValue
    .split(',')
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isFinite(item) && item > 0);

  return parsed.length > 0 ? parsed : [...fallback];
}

export function getAnchorMetadata(anchor: AnchorRecordLike): Record<string, unknown> {
  return asObject(anchor?.metadata);
}

export function getAnchorSubmittedAt(anchor: AnchorRecordLike, nowIso = new Date().toISOString()): string {
  const metadata = getAnchorMetadata(anchor);
  return (
    readMetadataIso(metadata, 'submittedAt', 'submitted_at') ||
    normalizeIso(anchor?.created_at) ||
    normalizeIso(anchor?.updated_at) ||
    nowIso
  );
}

export function getAnchorNextRetryAt(anchor: AnchorRecordLike): string | null {
  const metadata = getAnchorMetadata(anchor);
  return readMetadataIso(metadata, 'nextRetryAt', 'next_retry_at');
}

export function getRetryIntervalMinutes(policy: AnchorRetryPolicy, attempt: number): number {
  const schedule = policy.retryScheduleMinutes.length > 0
    ? policy.retryScheduleMinutes
    : [DEFAULT_RETRY_MINUTES];
  const safeAttempt = Math.max(1, attempt);
  const index = Math.min(safeAttempt - 1, schedule.length - 1);
  const interval = schedule[index];
  return Number.isFinite(interval) && interval > 0 ? interval : DEFAULT_RETRY_MINUTES;
}

export function isRetryDue(anchor: AnchorRecordLike, nowMs = Date.now()): boolean {
  const nextRetryAt = getAnchorNextRetryAt(anchor);
  if (!nextRetryAt) return true;
  return nowMs >= new Date(nextRetryAt).getTime();
}

export interface TimeoutEvaluation {
  timedOut: boolean;
  reason: string | null;
  pendingAgeMinutes: number;
  pendingAgeHours: number;
  timeoutBy: 'elapsed' | 'max_attempts' | null;
}

export function evaluateTimeout(
  anchor: AnchorRecordLike,
  policy: AnchorRetryPolicy,
  attempt: number,
  nowMs = Date.now(),
): TimeoutEvaluation {
  const submittedAtIso = getAnchorSubmittedAt(anchor);
  const submittedAtMs = new Date(submittedAtIso).getTime();
  const pendingAgeMs = Math.max(0, nowMs - submittedAtMs);
  const pendingAgeMinutes = Math.floor(pendingAgeMs / 60_000);
  const pendingAgeHours = Number((pendingAgeMs / 3_600_000).toFixed(2));

  if (attempt > policy.maxAttempts) {
    return {
      timedOut: true,
      reason: `${policy.network} confirmation max attempts reached (${attempt}/${policy.maxAttempts})`,
      pendingAgeMinutes,
      pendingAgeHours,
      timeoutBy: 'max_attempts',
    };
  }

  if (pendingAgeMs >= policy.timeoutMs) {
    const timeoutMinutes = Math.floor(policy.timeoutMs / 60_000);
    return {
      timedOut: true,
      reason: `${policy.network} confirmation timeout after ${pendingAgeMinutes} minutes (limit: ${timeoutMinutes})`,
      pendingAgeMinutes,
      pendingAgeHours,
      timeoutBy: 'elapsed',
    };
  }

  return {
    timedOut: false,
    reason: null,
    pendingAgeMinutes,
    pendingAgeHours,
    timeoutBy: null,
  };
}

export interface RetryProjection {
  metadata: Record<string, unknown>;
  nextRetryAt: string;
  retryIntervalMinutes: number;
  submittedAt: string;
}

export function projectRetry(
  anchor: AnchorRecordLike,
  policy: AnchorRetryPolicy,
  attempt: number,
  nowIso = new Date().toISOString(),
): RetryProjection {
  const baseMetadata = getAnchorMetadata(anchor);
  const submittedAt = getAnchorSubmittedAt(anchor, nowIso);
  const retryIntervalMinutes = getRetryIntervalMinutes(policy, attempt);
  const nextRetryAt = new Date(new Date(nowIso).getTime() + retryIntervalMinutes * 60_000).toISOString();

  return {
    submittedAt,
    retryIntervalMinutes,
    nextRetryAt,
    metadata: {
      ...baseMetadata,
      submittedAt,
      lastRetryAt: nowIso,
      nextRetryAt,
      retryIntervalMinutes,
      retryPolicyVersion: 'anchor-sm-v1',
    },
  };
}

export function projectSubmitted(
  anchor: AnchorRecordLike,
  policy: AnchorRetryPolicy,
  nowIso = new Date().toISOString(),
): RetryProjection {
  const baseMetadata = getAnchorMetadata(anchor);
  const submittedAt = getAnchorSubmittedAt(anchor, nowIso);
  const retryIntervalMinutes = getRetryIntervalMinutes(policy, 1);
  const nextRetryAt = new Date(new Date(nowIso).getTime() + retryIntervalMinutes * 60_000).toISOString();

  return {
    submittedAt,
    retryIntervalMinutes,
    nextRetryAt,
    metadata: {
      ...baseMetadata,
      submittedAt,
      nextRetryAt,
      retryIntervalMinutes,
      retryPolicyVersion: 'anchor-sm-v1',
    },
  };
}
