import { hasTsaConfirmed, type Event } from './protectionLevel';

export type AnchorNetwork = 'polygon' | 'bitcoin';
export type ProbativeLevel = 'none' | 'base' | 'active' | 'reinforced' | 'total';

type ProbativeTone = 'gray' | 'amber' | 'emerald' | 'blue';

export interface ProbativeUiConfig {
  label: string;
  color: string;
  bg: string;
  tooltip: string;
  badge: string;
  detailLabel: string;
  tone: ProbativeTone;
}

export interface AnchorNetworkDerivation {
  requested: boolean;
  confirmed: boolean;
  pending: boolean;
  timeout: boolean;
  failed: boolean;
}

export interface ProbativeStateDerivation {
  level: ProbativeLevel;
  config: ProbativeUiConfig;
  tsaConfirmed: boolean;
  requestedAnchors: number;
  confirmedAnchors: number;
  pendingAnchors: number;
  timeoutAnchors: number;
  failedAnchors: number;
  network: Record<AnchorNetwork, AnchorNetworkDerivation>;
}

const NETWORKS: readonly AnchorNetwork[] = ['polygon', 'bitcoin'];

const DEFAULT_NETWORK_DERIVATION: AnchorNetworkDerivation = {
  requested: false,
  confirmed: false,
  pending: false,
  timeout: false,
  failed: false,
};

export const PROBATIVE_STATES: Record<ProbativeLevel, ProbativeUiConfig> = {
  none: {
    label: 'Sin protección',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    tooltip: 'No hay evidencia probatoria registrada.',
    badge: 'Sin protección',
    detailLabel: 'Sin protección probatoria',
    tone: 'gray',
  },
  base: {
    label: 'Protección\nen proceso',
    color: 'text-gray-800',
    bg: 'bg-gray-100',
    tooltip: 'Se está consolidando la evidencia probatoria inicial.',
    badge: 'En proceso',
    detailLabel: 'Protección en proceso',
    tone: 'gray',
  },
  active: {
    label: 'Protección\ngarantizada',
    color: 'text-emerald-700',
    bg: 'bg-emerald-100',
    tooltip: 'Integridad y fecha cierta confirmadas.',
    badge: 'Garantizada',
    detailLabel: 'Protección garantizada',
    tone: 'amber',
  },
  reinforced: {
    label: 'Protección\nreforzada',
    color: 'text-blue-700',
    bg: 'bg-blue-100',
    tooltip: 'Refuerzo probatorio adicional confirmado.',
    badge: 'Reforzada',
    detailLabel: 'Protección reforzada',
    tone: 'emerald',
  },
  total: {
    label: 'Protección\nmáxima',
    color: 'text-gray-700',
    bg: 'bg-gray-100',
    tooltip: 'Máxima fortaleza probatoria con verificación independiente adicional.',
    badge: 'Máxima',
    detailLabel: 'Protección máxima',
    tone: 'blue',
  },
};

const asObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const getEventNetwork = (event: any): AnchorNetwork | null => {
  const anchor = asObject(event?.anchor);
  const payload = asObject(event?.payload);
  const network = anchor?.network ?? payload?.network;
  return network === 'polygon' || network === 'bitcoin' ? network : null;
};

const isAnchorConfirmedEvent = (event: any): boolean => {
  if (!event) return false;
  if (event.kind === 'anchor.confirmed') return true;
  if (event.kind !== 'anchor') return false;

  const anchor = asObject(event.anchor);
  const payload = asObject(event.payload);
  return (
    typeof anchor?.confirmed_at === 'string' ||
    typeof payload?.confirmed_at === 'string'
  );
};

const isTerminalFailureEvent = (event: any): boolean => {
  if (event?.kind !== 'anchor.failed') return false;
  const anchor = asObject(event.anchor);
  const payload = asObject(event.payload);

  const retryable = anchor?.retryable ?? payload?.retryable;
  if (retryable === false) return true;

  const failureCode = String(anchor?.failure_code ?? payload?.failure_code ?? '').toLowerCase();
  return failureCode === 'timeout' || failureCode === 'max_attempts' || failureCode === 'receipt_status';
};

const deriveRequestedEvidence = (events: any[]): AnchorNetwork[] => {
  const latestProtectionRequest = [...events]
    .reverse()
    .find((event) => event?.kind === 'document.protected.requested');
  const requiredEvidenceRaw = latestProtectionRequest?.payload?.required_evidence;

  if (Array.isArray(requiredEvidenceRaw)) {
    const normalized = requiredEvidenceRaw
      .filter((item): item is AnchorNetwork => item === 'polygon' || item === 'bitcoin');
    if (normalized.length > 0) {
      return [...new Set(normalized)];
    }
  }

  const inferred = new Set<AnchorNetwork>();
  for (const event of events) {
    const network = getEventNetwork(event);
    if (!network) continue;
    if (event?.kind === 'anchor.submitted' || event?.kind === 'anchor.timeout' || event?.kind === 'anchor.failed' || isAnchorConfirmedEvent(event)) {
      inferred.add(network);
    }
  }

  return [...inferred];
};

interface DeriveProbativeStateInput {
  events?: Event[] | any[];
  hasPrimaryHash?: boolean;
  requiredEvidence?: string[] | null;
}

export function deriveAnchorProbativeState(input: DeriveProbativeStateInput): ProbativeStateDerivation {
  const events = Array.isArray(input.events) ? input.events : [];
  const hasPrimaryHash = Boolean(input.hasPrimaryHash);

  const requestedEvidence = Array.isArray(input.requiredEvidence) && input.requiredEvidence.length > 0
    ? [...new Set(input.requiredEvidence.filter((item): item is AnchorNetwork => item === 'polygon' || item === 'bitcoin'))]
    : deriveRequestedEvidence(events);

  const requestedSet = new Set<AnchorNetwork>(requestedEvidence);

  const network = {
    polygon: { ...DEFAULT_NETWORK_DERIVATION },
    bitcoin: { ...DEFAULT_NETWORK_DERIVATION },
  } as Record<AnchorNetwork, AnchorNetworkDerivation>;

  for (const target of NETWORKS) {
    network[target].requested = requestedSet.has(target);
    network[target].confirmed = events.some((event) => getEventNetwork(event) === target && isAnchorConfirmedEvent(event));
    network[target].timeout = events.some((event) => event?.kind === 'anchor.timeout' && getEventNetwork(event) === target);
    network[target].failed = events.some((event) => getEventNetwork(event) === target && isTerminalFailureEvent(event));

    network[target].pending =
      network[target].requested &&
      !network[target].confirmed &&
      !network[target].timeout &&
      !network[target].failed;
  }

  const tsaConfirmed = hasTsaConfirmed(events as Event[]);
  const requestedAnchors = NETWORKS.filter((target) => network[target].requested).length;
  const confirmedAnchors = NETWORKS.filter((target) => network[target].confirmed).length;
  const pendingAnchors = NETWORKS.filter((target) => network[target].pending).length;
  const timeoutAnchors = NETWORKS.filter((target) => network[target].timeout).length;
  const failedAnchors = NETWORKS.filter((target) => network[target].failed && !network[target].timeout).length;

  let level: ProbativeLevel = hasPrimaryHash ? 'base' : 'none';

  if (tsaConfirmed) {
    level = 'active';
  }

  if (tsaConfirmed && confirmedAnchors >= 1) {
    level = 'reinforced';
  }

  if (tsaConfirmed && confirmedAnchors >= 2) {
    level = 'total';
  }

  return {
    level,
    config: PROBATIVE_STATES[level],
    tsaConfirmed,
    requestedAnchors,
    confirmedAnchors,
    pendingAnchors,
    timeoutAnchors,
    failedAnchors,
    network,
  };
}
