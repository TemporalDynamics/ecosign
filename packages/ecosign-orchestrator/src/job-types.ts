export const ENTITY_JOB_TYPES = {
  PREPARE: 'entity.prepare',
  ATTEST: 'entity.attest',
  ANCHOR: 'entity.anchor',
  FINALIZE: 'entity.finalize',
} as const;

export type EntityJobType = typeof ENTITY_JOB_TYPES[keyof typeof ENTITY_JOB_TYPES];
