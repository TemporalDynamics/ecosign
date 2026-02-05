export const CONTRACT_ECO_ECOX = 'docs/contratos/CONTRATO_ECO_ECOX.md';

export type EventRule = {
  requireWitnessHash: boolean;
  requireTokenB64: boolean;
  unique: boolean;
};

export const DocumentEntityRules: Record<string, EventRule> = {
  'tsa': {
    requireWitnessHash: true,
    requireTokenB64: true,
    unique: false,
  },
  'tsa.confirmed': {
    requireWitnessHash: true,
    requireTokenB64: true,
    unique: false,
  },
};
