import type { JobOptions, JobPriority } from '@temporaldynamics/orchestrator-core';
import { ENTITY_JOB_TYPES, type EntityJobType } from './job-types';

export type EntityIntent = 'prepare' | 'attest' | 'anchor' | 'finalize';

export interface EntityCta<Payload = unknown> {
  entityId: string;
  intent: EntityIntent;
  payload?: Payload;
  priority?: JobPriority;
}

const INTENT_TO_JOB_TYPE: Record<EntityIntent, EntityJobType> = {
  prepare: ENTITY_JOB_TYPES.PREPARE,
  attest: ENTITY_JOB_TYPES.ATTEST,
  anchor: ENTITY_JOB_TYPES.ANCHOR,
  finalize: ENTITY_JOB_TYPES.FINALIZE,
};

export function mapCtaToJobOptions<Payload = unknown>(
  cta: EntityCta<Payload>,
): JobOptions<{ entityId: string; data?: Payload }> {
  return {
    type: INTENT_TO_JOB_TYPE[cta.intent],
    payload: {
      entityId: cta.entityId,
      data: cta.payload,
    },
    priority: cta.priority,
  };
}
